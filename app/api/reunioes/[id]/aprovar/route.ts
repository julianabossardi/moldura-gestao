import { NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/supabase/server";
import { propostaReuniaoSchema } from "@/lib/reuniao/tipos";
import { gerarEmbedding, textoParaEmbedding } from "@/lib/embedding";

const PRIORIDADES = ["alta", "media", "baixa"];
const STATUS = ["aberta", "fazendo", "concluida", "arquivada"];

// cria e atualiza os itens da proposta que ficaram marcados. qualquer uma das três pode aprovar.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServidor();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  const proposta = propostaReuniaoSchema.parse((await req.json()).proposta);
  const { data: r } = await supabase.from("reunioes").select("status").eq("id", id).single();
  if (r?.status !== "em_revisao") return NextResponse.json({ erro: "esta reunião não está em revisão" }, { status: 409 });

  const [{ data: projetos }, { data: pessoas }] = await Promise.all([
    supabase.from("projetos").select("id, slug"),
    supabase.from("pessoas").select("id, nome").eq("papel", "socia"),
  ]);
  const projetoId = (slug?: string | null) => projetos?.find((p) => p.slug === slug)?.id ?? null;
  const pessoaId = (nome?: string | null) => (nome ? pessoas?.find((p) => p.nome.toLowerCase().startsWith(nome.toLowerCase().slice(0, 4)))?.id ?? null : null);

  // de onde veio o item (trecho da fala, dono sugerido pelo papel, desdobramentos): tabela só das sócias
  const guardarOrigem = async (itemId: string | undefined, o: { trecho?: string | null; dono_origem?: string | null; desdobramentos?: string[] }) => {
    if (!itemId || (!o.trecho && !o.dono_origem && !o.desdobramentos?.length)) return;
    const { error } = await supabase.from("itens_origem").insert({
      item_id: itemId, reuniao_id: id, trecho: o.trecho ?? null, dono_origem: o.dono_origem ?? null, desdobramentos: o.desdobramentos ?? [],
    });
    if (error) console.error("itens_origem", error.message);
  };

  let criados = 0;
  let atualizados = 0;
  for (const bloco of proposta.projetos) {
    const pid = projetoId(bloco.projeto_slug);
    const base = { projeto_id: pid, autor_id: auth.user.id, origem: "reuniao" as const, reuniao_id: id };

    for (const n of bloco.novas.filter((x) => x.incluido !== false)) {
      const emb = await gerarEmbedding(textoParaEmbedding({ titulo: n.titulo, corpo: n.corpo }));
      const { data: novo } = await supabase.from("itens").insert({
        ...base, tipo: "tarefa", titulo: n.titulo, corpo: n.corpo ?? null,
        responsavel_id: pessoaId(n.responsavel),
        prioridade: PRIORIDADES.includes(n.prioridade ?? "") ? n.prioridade : "media",
        ...(emb && { embedding: JSON.stringify(emb) }),
      }).select("id").single();
      await guardarOrigem(novo?.id, { trecho: n.trecho, dono_origem: n.responsavel ? n.dono_origem : null });
      criados++;
    }
    // já feitas: entram como tarefa concluída (aparece em novidades e no painel da próxima reunião), sem duplicar o que o banco já tem
    for (const j of bloco.ja_feitas.filter((x) => (x as { incluido?: boolean }).incluido !== false)) {
      let busca = supabase.from("itens").select("id").eq("tipo", "tarefa").ilike("titulo", j.titulo.replace(/[%_]/g, "")).limit(1);
      busca = pid ? busca.eq("projeto_id", pid) : busca.is("projeto_id", null);
      if ((await busca).data?.length) continue;
      const emb = await gerarEmbedding(textoParaEmbedding({ titulo: j.titulo, corpo: j.corpo }));
      const { data: novo } = await supabase.from("itens").insert({
        ...base, tipo: "tarefa", titulo: j.titulo, corpo: j.corpo ?? null, status: "concluida", concluido_em: new Date().toISOString(),
        ...(emb && { embedding: JSON.stringify(emb) }),
      }).select("id").single();
      await guardarOrigem(novo?.id, { trecho: j.trecho });
      criados++;
    }
    for (const u of bloco.atualizacoes.filter((x) => x.incluido !== false)) {
      const campo =
        u.campo === "status" ? (STATUS.includes(u.valor) ? { status: u.valor } : null)
        : u.campo === "responsavel" ? { responsavel_id: pessoaId(u.valor) }
        : u.campo === "prazo" ? (/^\d{4}-\d{2}-\d{2}$/.test(u.valor) ? { prazo: u.valor } : null)
        : PRIORIDADES.includes(u.valor) ? { prioridade: u.valor } : null;
      if (!campo) continue;
      await supabase.from("itens").update(campo).eq("id", u.item_id);
      atualizados++;
    }
    for (const d of bloco.decisoes.filter((x) => x.incluido !== false)) {
      const { data: novo } = await supabase.from("itens").insert({ ...base, tipo: "decisao", titulo: d.titulo, corpo: d.corpo ?? null }).select("id").single();
      await guardarOrigem(novo?.id, { trecho: d.trecho, desdobramentos: d.desdobramentos });
      criados++;
    }
    // ideias de reunião entram como ideia, nunca como tarefa
    for (const i of bloco.ideias.filter((x) => x.incluido !== false)) {
      const { data: novo } = await supabase.from("itens").insert({ ...base, tipo: "ideia", titulo: i.titulo, corpo: i.corpo ?? null }).select("id").single();
      await guardarOrigem(novo?.id, { trecho: i.trecho });
      criados++;
    }
  }

  await supabase.from("reunioes").update({ status: "aprovada", proposta }).eq("id", id);
  return NextResponse.json({ ok: true, criados, atualizados });
}
