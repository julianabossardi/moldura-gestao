import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServidor } from "@/lib/supabase/server";
import { processarReuniao } from "@/lib/ia/reuniao";
import type { Marcacao, Segmento } from "@/lib/reuniao/tipos";

export const maxDuration = 120;

// guarda quem é cada falante e gera a proposta da reunião (processar_reuniao)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServidor();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });
  const { falantes } = z.object({ falantes: z.record(z.string(), z.string().uuid()) }).parse(await req.json());

  await supabase.from("reunioes").update({ falantes }).eq("id", id);
  const { data: r } = await supabase.from("reunioes").select("*").eq("id", id).single();
  if (!r?.transcricao) return NextResponse.json({ erro: "sem transcrição ainda" }, { status: 409 });

  const [{ data: pessoas }, { data: projetos }, { data: itens }] = await Promise.all([
    supabase.from("pessoas").select("id, nome"),
    supabase.from("projetos").select("id, slug, nome").eq("status", "ativo").order("ordem_prioridade"),
    supabase.from("itens").select("id, titulo, status, projeto_id, responsavel:pessoas!responsavel_id(nome)").in("status", ["aberta", "fazendo"]).is("pai_id", null).eq("tipo", "tarefa"),
  ]);
  const nome = (f: string) => pessoas?.find((p) => p.id === falantes[f])?.nome ?? f;

  try {
    const proposta = await processarReuniao({
      segmentos: r.transcricao as Segmento[],
      nomeDoFalante: nome,
      marcacoes: (r.marcacoes ?? []) as Marcacao[],
      projetos: projetos ?? [],
      itensAbertos: (itens ?? []).map((i) => ({
        id: i.id,
        titulo: i.titulo,
        status: i.status,
        projeto_slug: projetos?.find((p) => p.id === i.projeto_id)?.slug ?? null,
        responsavel: (i.responsavel as unknown as { nome: string } | null)?.nome ?? null,
      })),
    });
    // todas as linhas nascem marcadas
    const marcada = {
      ...proposta,
      projetos: proposta.projetos.map((p) => ({
        ...p,
        novas: p.novas.map((x) => ({ ...x, incluido: true })),
        atualizacoes: p.atualizacoes.map((x) => ({ ...x, incluido: true })),
        decisoes: p.decisoes.map((x) => ({ ...x, incluido: true })),
        ideias: p.ideias.map((x) => ({ ...x, incluido: true })),
      })),
    };
    await supabase.from("reunioes").update({ proposta: marcada, resumo: proposta.resumo, status: "em_revisao" }).eq("id", id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 502 });
  }
}
