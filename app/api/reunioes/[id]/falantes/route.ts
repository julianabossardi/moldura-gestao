import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServidor } from "@/lib/supabase/server";
import { processarReuniao } from "@/lib/ia/reuniao";
import { aplicarPasso2 } from "@/lib/reuniao/passo2";
import type { Marcacao, Segmento } from "@/lib/reuniao/tipos";
import { hojeISO } from "@/lib/datas";
import { inicioDoPeriodo, paraDia, paraIso, type Recorrencia } from "@/lib/recorrencia";

export const maxDuration = 300; // dois passos de IA em sequência

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

  const desde = new Date(Date.now() - 21 * 86_400_000).toISOString();
  const hoje = hojeISO();
  const [{ data: pessoas }, { data: projetos }, { data: itens }, { data: concluidos }, { data: recs }, { data: criadasRec }] = await Promise.all([
    supabase.from("pessoas").select("id, nome"),
    supabase.from("projetos").select("id, slug, nome").eq("status", "ativo").order("ordem_prioridade"),
    supabase.from("itens").select("id, titulo, status, projeto_id, responsavel:pessoas!responsavel_id(nome)").in("status", ["aberta", "fazendo"]).or("pai_id.is.null,origem.eq.manual").eq("tipo", "tarefa"),
    supabase.from("itens").select("titulo, status, concluido_em, projeto_id, responsavel:pessoas!responsavel_id(nome)").eq("status", "concluida").eq("tipo", "tarefa").gte("concluido_em", desde),
    supabase.from("recorrencias").select("*").eq("ativa", true),
    supabase.from("itens").select("id, titulo, status, recorrencia_id, periodo, vez").not("recorrencia_id", "is", null).gte("periodo", paraIso(paraDia(hoje) - 35)),
  ]);
  const nome = (f: string) => pessoas?.find((p) => p.id === falantes[f])?.nome ?? f;

  try {
    const slugDe = (pid: string | null) => projetos?.find((p) => p.id === pid)?.slug ?? null;
    const donoDe = (x: unknown) => (x as { nome: string } | null)?.nome ?? null;
    const itensAbertos = (itens ?? []).map((i) => ({
      id: i.id, titulo: i.titulo, status: i.status, projeto_slug: slugDe(i.projeto_id), responsavel: donoDe(i.responsavel),
    }));
    const leitura = await processarReuniao({
      segmentos: r.transcricao as Segmento[],
      nomeDoFalante: nome,
      marcacoes: (r.marcacoes ?? []) as Marcacao[],
      projetos: projetos ?? [],
      itensAbertos,
    });
    // passo 2: cruza com contexto/ e com o banco. se falhar, a leitura direta segue e o erro fica registrado
    const { proposta, conferencia, erro } = await aplicarPasso2({
      proposta: leitura,
      segmentos: r.transcricao as Segmento[],
      banco: {
        recorrencias: ((recs ?? []) as Recorrencia[]).map((rc) => ({
          titulo: rc.titulo, projeto_slug: slugDe(rc.projeto_id), frequencia: rc.frequencia, quantidade: rc.quantidade,
          responsavel: pessoas?.find((p) => p.id === rc.responsavel_id)?.nome ?? null,
          do_periodo: (criadasRec ?? []).filter((i) => i.recorrencia_id === rc.id && i.periodo === inicioDoPeriodo(rc, hoje)).map((i) => ({ id: i.id, titulo: i.titulo, status: i.status })),
        })),
        abertos: itensAbertos.map((i) => ({ id: i.id, titulo: i.titulo, status: i.status, projeto_slug: i.projeto_slug, responsavel: i.responsavel })),
        concluidos: (concluidos ?? []).map((i) => ({ titulo: i.titulo, status: i.status, projeto_slug: slugDe(i.projeto_id), responsavel: donoDe(i.responsavel), concluido_em: i.concluido_em })),
      },
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
    await supabase.from("reunioes").update({ proposta: marcada, resumo: proposta.resumo, conferencia, passo2_erro: erro, status: "em_revisao" }).eq("id", id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 502 });
  }
}
