import { NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/supabase/server";
import { transcrever } from "@/lib/transcrever";
import { classificarCaptura } from "@/lib/ia/classificar";
import { gerarEmbedding } from "@/lib/embedding";

export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = await supabaseServidor();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  const form = await req.formData();
  const arquivo = form.get("arquivo") as File | null;
  const texto = (form.get("texto") as string | null)?.trim() || null;
  const projetoId = (form.get("projeto_id") as string | null) || null;
  const eLink = texto && /^https?:\/\/\S+$/.test(texto);
  const formato = arquivo ? (arquivo.type.startsWith("audio/") ? "audio" : "arquivo") : eLink ? "link" : "texto";
  if (!arquivo && !texto) return NextResponse.json({ erro: "nada para capturar" }, { status: 400 });

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
      await supabase.from("capturas").update({ arquivo_path: caminho, status: formato === "audio" ? "transcrevendo" : "recebida" }).eq("id", captura.id);
      if (formato === "audio") {
        corpo = await transcrever(arquivo);
        await supabase.from("capturas").update({ transcricao: corpo }).eq("id", captura.id);
      } else {
        corpo = `[arquivo anexado: ${arquivo.name}]`;
      }
    }

    const [{ data: projetos }, { data: eu }] = await Promise.all([
      supabase.from("projetos").select("id, slug").eq("status", "ativo").order("ordem_prioridade"),
      supabase.from("pessoas").select("nome").eq("id", auth.user.id).single(),
    ]);
    const contexto = projetos?.find((p) => p.id === projetoId)?.slug ?? null;

    // 5 itens abertos mais parecidos, para a IA propor atualizar em vez de duplicar
    let parecidos: { id: string; titulo: string }[] = [];
    const emb = await gerarEmbedding(corpo);
    if (emb) {
      const { data } = await supabase.rpc("itens_parecidos", { consulta: JSON.stringify(emb), qtd: 5, so_abertos: true });
      parecidos = (data ?? []).map((i: { id: string; titulo: string }) => ({ id: i.id, titulo: i.titulo }));
    }

    const proposta = await classificarCaptura({
      texto: corpo,
      autora: eu?.nome ?? "juliana",
      projetoContexto: contexto,
      projetosAtivos: (projetos ?? []).map((p) => p.slug),
      parecidos,
    });
    await supabase.from("capturas").update({ proposta, status: "proposta" }).eq("id", captura.id);
    return NextResponse.json({ id: captura.id });
  } catch (e) {
    await supabase.from("capturas").update({ status: "erro" }).eq("id", captura.id);
    return NextResponse.json({ erro: (e as Error).message, id: captura.id }, { status: 502 });
  }
}
