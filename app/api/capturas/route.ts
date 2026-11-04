import { NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/supabase/server";
import { transcrever } from "@/lib/transcrever";
import { classificarCaptura } from "@/lib/ia/classificar";
import { gerarEmbedding } from "@/lib/embedding";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const maxDuration = 60;
const LIMITE_CLIENTE_POR_HORA = 20;

export async function POST(req: Request) {
  const supabase = await supabaseServidor();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  // cliente captura só no próprio projeto; o resto do processamento roda no servidor, porque a proposta
  // da IA vai para as sócias confirmarem e nunca passa pelo cliente
  const { data: euPessoa } = await supabase.from("pessoas").select("nome, papel, projetos_cliente").eq("id", auth.user.id).single();
  const eCliente = euPessoa?.papel === "cliente";
  if (!euPessoa) return NextResponse.json({ erro: "sem acesso" }, { status: 403 });

  const form = await req.formData();
  const arquivo = form.get("arquivo") as File | null;
  const texto = (form.get("texto") as string | null)?.trim() || null;
  const projetoId = (form.get("projeto_id") as string | null) || null;
  const eLink = texto && /^https?:\/\/\S+$/.test(texto);
  const formato = arquivo ? (arquivo.type.startsWith("audio/") ? "audio" : "arquivo") : eLink ? "link" : "texto";
  if (!arquivo && !texto) return NextResponse.json({ erro: "nada para capturar" }, { status: 400 });
  if (eCliente && !(projetoId && (euPessoa.projetos_cliente ?? []).includes(projetoId))) {
    return NextResponse.json({ erro: "projeto não permitido" }, { status: 403 });
  }
  const db = eCliente ? supabaseAdmin() : supabase;
  if (eCliente) {
    const umaHora = new Date(Date.now() - 3_600_000).toISOString();
    const { count } = await db.from("capturas").select("id", { count: "exact", head: true }).eq("autor_id", auth.user.id).gte("criado_em", umaHora);
    if ((count ?? 0) >= LIMITE_CLIENTE_POR_HORA) {
      return NextResponse.json({ erro: "muitos envios em pouco tempo. tente de novo daqui a pouco." }, { status: 429 });
    }
  }

  const { data: captura, error } = await supabase
    .from("capturas")
    .insert({
      autor_id: auth.user.id,
      projeto_id: projetoId,
      formato,
      url: eLink ? texto : null,
      texto: eLink ? null : texto,
      status: "recebida",
    })
    .select()
    .single();
  if (error || !captura) return NextResponse.json({ erro: error?.message }, { status: 500 });

  try {
    let corpo = texto ?? "";
    if (arquivo) {
      const caminho = `${auth.user.id}/${captura.id}-${arquivo.name || "captura"}`;
      const { error: e } = await supabase.storage.from("midia").upload(caminho, arquivo, { contentType: arquivo.type });
      if (e) throw e;
      await db.from("capturas").update({ arquivo_path: caminho, status: formato === "audio" ? "transcrevendo" : "recebida" }).eq("id", captura.id);
      if (formato === "audio") {
        corpo = await transcrever(arquivo);
        await db.from("capturas").update({ transcricao: corpo }).eq("id", captura.id);
      } else {
        corpo = `[arquivo anexado: ${arquivo.name}]`;
      }
    }

    const { data: projetos } = await db.from("projetos").select("id, slug").eq("status", "ativo").order("ordem_prioridade");
    const contexto = projetos?.find((p) => p.id === projetoId)?.slug ?? null;

    // 5 itens abertos mais parecidos, para a IA propor atualizar em vez de duplicar
    let parecidos: { id: string; titulo: string }[] = [];
    const emb = await gerarEmbedding(corpo);
    if (emb) {
      const { data } = await db.rpc("itens_parecidos", { consulta: JSON.stringify(emb), qtd: 5, so_abertos: true });
      parecidos = (data ?? []).map((i: { id: string; titulo: string }) => ({ id: i.id, titulo: i.titulo }));
    }

    const proposta = await classificarCaptura({
      texto: corpo,
      autora: eCliente ? `${euPessoa.nome} (cliente)` : euPessoa.nome,
      projetoContexto: contexto,
      projetosAtivos: (projetos ?? []).map((p) => p.slug),
      parecidos,
    });
    await db.from("capturas").update({ proposta, status: "proposta" }).eq("id", captura.id);
    return NextResponse.json({ id: captura.id });
  } catch (e) {
    await db.from("capturas").update({ status: "erro" }).eq("id", captura.id);
    return NextResponse.json({ erro: (e as Error).message, id: captura.id }, { status: 502 });
  }
}
