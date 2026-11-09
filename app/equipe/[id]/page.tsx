import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { pessoaAtual } from "@/lib/pessoa";
import { SELECT_CARTAO, aindaNaoComeca, paraCartoes } from "@/lib/cartao";
import { diasAtras, hojeISO } from "@/lib/datas";
import type { ResumoPessoa } from "@/lib/estados-bonequinho";
import { Bonequinho, rotuloEstado } from "@/components/Bonequinho";
import { CaixaBilhete } from "@/components/CaixaBilhete";
import { CartaoItem } from "@/components/CartaoItem";
import { TarefasAbertas } from "@/components/TarefasAbertas";
import { ProvedorDetalhe } from "@/components/ProvedorDetalhe";
import { NavegacaoProjetos } from "@/components/NavegacaoProjetos";
import { Cabecalho } from "@/components/Cabecalho";
import { TempoReal } from "@/components/TempoReal";

// a página de uma colega, vista por quem clicou no bonequinho dela: as tarefas dela como na minha página,
// e no lugar da seleção de tarefas, uma caixa para deixar um bilhete
export default async function PaginaDaColega({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, pessoa: eu } = await pessoaAtual();
  if (!eu || eu.papel !== "socia") redirect("/");
  if (id === eu.id) redirect("/");

  const [{ data: colega }, { data: resumo }, { data: projetos }, { data: socias }] = await Promise.all([
    supabase.from("pessoas").select("id, nome, papel, ativa").eq("id", id).single(),
    supabase.rpc("equipe_resumo"),
    supabase.from("projetos").select("id, nome").eq("status", "ativo").order("ordem_prioridade"),
    supabase.from("pessoas").select("id, nome").eq("ativa", true).eq("papel", "socia"),
  ]);
  if (!colega || colega.papel !== "socia" || !colega.ativa) notFound();
  const dela = ((resumo ?? []) as ResumoPessoa[]).find((p) => p.id === id);

  const recente = diasAtras(30);
  const [{ data: todasBrutas }, { data: emCursoBrutas }, { data: enviados }] = await Promise.all([
    supabase.from("itens").select(SELECT_CARTAO).eq("tipo", "tarefa").in("status", ["aberta", "fazendo", "concluida", "arquivada"])
      .eq("responsavel_id", id).is("pai_id", null).order("ultima_movimentacao", { ascending: false }).limit(200),
    supabase.from("itens").select(SELECT_CARTAO).eq("tipo", "tarefa").eq("responsavel_id", id)
      .or(`status.eq.fazendo,and(status.eq.concluida,concluido_em.gte.${hojeISO()})`).order("ultima_movimentacao", { ascending: false }),
    supabase.from("bilhetes").select("id, texto, criado_em, lido_em").eq("de_id", eu.id).eq("para_id", id).order("criado_em", { ascending: false }).limit(5),
  ]);
  const [todas, emCurso] = await Promise.all([
    paraCartoes(supabase, ((todasBrutas ?? []) as unknown as { status: string; ultima_movimentacao?: string }[]).filter((t) => ["aberta", "fazendo"].includes(t.status) || (t.ultima_movimentacao ?? "") >= recente)),
    paraCartoes(supabase, emCursoBrutas),
  ]);
  const visiveis = todas.filter((t) => !aindaNaoComeca(t));
  emCurso.sort((a, b) => (a.status === "fazendo" ? -1 : 0) - (b.status === "fazendo" ? -1 : 0));
  const primeiro = colega.nome.split(" ")[0].toLowerCase();

  return (
    <ProvedorDetalhe euId={eu.id} projetos={projetos ?? []} pessoas={socias ?? []}>
      <main className="pagina">
        <Cabecalho atual="inicio" contexto={`página de ${primeiro}`} />
        <NavegacaoProjetos />
        <div><Link href="/" className="btn sutil">voltar para a minha página</Link></div>

        <div className="hero">
          <div className="hero-saudacao">
            <div className="cabeca-eu">
              {dela && <Bonequinho pessoa={dela} tamanho={160} />}
              <div className="saudacao">
                <h1 className="m-h1">{primeiro}</h1>
                {dela && <span className="m-mono" style={{ color: "var(--m-ink-muted)" }}>agora: {rotuloEstado(dela)}</span>}
                {dela?.fazendo_titulo && <span className="pessoa-fazendo">fazendo: {dela.fazendo_titulo}</span>}
              </div>
            </div>
          </div>
          <div className="hero-direita">
            <CaixaBilhete euId={eu.id} euNome={eu.nome} paraId={id} paraNome={colega.nome} enviados={enviados ?? []} />
          </div>
        </div>

        <section className="bloco sessao-caixa">
          <h2>tarefas de agora de {primeiro}</h2>
          {emCurso.length ? (
            <div className="grade-cartoes sessao">
              {emCurso.map((t) => <CartaoItem key={t.id} item={t} euId={eu.id} destaque mostrarProjeto />)}
            </div>
          ) : <p className="aviso">{primeiro} não está com nada em andamento agora.</p>}
        </section>

        <TarefasAbertas tarefas={visiveis} projetos={projetos ?? []} pessoas={socias ?? []} autorId={eu.id} projetoDoDia={null} titulo={`todas as tarefas de ${primeiro}`} semNova />

        <TempoReal />
      </main>
    </ProvedorDetalhe>
  );
}
