import { redirect } from "next/navigation";
import { pessoaAtual } from "@/lib/pessoa";
import { diasAtras, diasDesde } from "@/lib/datas";
import { RAIZ_OU_FILHA_MANUAL } from "@/lib/cartao";
import { NavegacaoProjetos } from "@/components/NavegacaoProjetos";
import { Cabecalho } from "@/components/Cabecalho";
import { ProvedorDetalhe } from "@/components/ProvedorDetalhe";
import { BacklogLista, type LinhaBacklog } from "@/components/BacklogLista";

const RETORNOS = [
  ["aceito", "aceitos"], ["trocado", "trocados"], ["editado", "editados"], ["concluido", "concluídos"], ["abandonado", "abandonados"],
] as const;

// tudo o que está em aberto, da tarefa mais tempo parada para a mais recente, com jeito rápido de limpar
export default async function Backlog() {
  const { supabase, pessoa } = await pessoaAtual();
  if (!pessoa || pessoa.papel !== "socia") redirect("/");

  const [{ data: abertas }, { data: projetos }, { data: socias }, { data: recortes }] = await Promise.all([
    supabase.from("itens")
      .select("id, titulo, corpo, prioridade, prazo, status, ultima_movimentacao, recorrencia_id, projeto_id, responsavel_id, projeto:projetos(nome), responsavel:pessoas!responsavel_id(nome)")
      .eq("tipo", "tarefa").in("status", ["aberta", "fazendo"]).or(RAIZ_OU_FILHA_MANUAL)
      .order("ultima_movimentacao").limit(1000),
    supabase.from("projetos").select("id, nome").eq("status", "ativo").order("ordem_prioridade"),
    supabase.from("pessoas").select("id, nome").eq("papel", "socia").eq("ativa", true).order("nome"),
    supabase.from("itens").select("recorte_retorno").eq("origem", "recorte").not("recorte_retorno", "is", null).gte("criado_em", diasAtras(14)),
  ]);

  const linhas: LinhaBacklog[] = (abertas ?? []).map((t) => ({
    id: t.id, titulo: t.titulo, corpo: t.corpo, prioridade: t.prioridade, prazo: t.prazo, status: t.status,
    projeto_id: t.projeto_id, projeto: (t.projeto as unknown as { nome: string } | null)?.nome ?? null,
    responsavel_id: t.responsavel_id, responsavel: (t.responsavel as unknown as { nome: string } | null)?.nome ?? null,
    recorrente: !!t.recorrencia_id, dias: diasDesde(t.ultima_movimentacao),
  }));

  // como saber se os recortes estão ajudando: os retornos das últimas duas semanas
  const contagem = Object.fromEntries(RETORNOS.map(([k]) => [k, (recortes ?? []).filter((r) => r.recorte_retorno === k).length]));
  const total = (recortes ?? []).length;
  const fracos = contagem.trocado + contagem.abandonado;
  const alerta = total >= 5 && fracos / total > 0.4;

  return (
    <ProvedorDetalhe euId={pessoa.id} projetos={projetos ?? []} pessoas={socias ?? []}>
      <main className="pagina">
        <Cabecalho atual="backlog" />
        <NavegacaoProjetos />

        <div className="saudacao">
          <h1 className="m-h1">tarefas</h1>
          <p className="m-lead" style={{ margin: 0, color: "var(--m-ink-quiet)" }}>tudo o que está em aberto, das mais paradas para as mais novas. arquivar também é uma resposta, e nada é apagado.</p>
        </div>

        <BacklogLista linhas={linhas} projetos={projetos ?? []} pessoas={socias ?? []} />

        <section className="bloco">
          <h2>os recortes estão ajudando?</h2>
          <p className="m-meta" style={{ margin: 0 }}>últimas duas semanas</p>
          {total ? (
            <>
              <div className="linha">
                {RETORNOS.map(([k, rotulo]) => <span className="chip" key={k}>{rotulo} <span className="m-mono">{contagem[k]}</span></span>)}
              </div>
              {alerta && <p className="erro" style={{ margin: 0 }}>{Math.round((fracos / total) * 100)}% foram trocados ou abandonados. vale revisar o prompt de gerar_recortes, usando os recortes editados como exemplo.</p>}
            </>
          ) : <p className="aviso">ainda sem recortes nas últimas duas semanas.</p>}
        </section>
      </main>
    </ProvedorDetalhe>
  );
}
