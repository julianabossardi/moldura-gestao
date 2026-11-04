import Link from "next/link";
import { redirect } from "next/navigation";
import { pessoaAtual } from "@/lib/pessoa";
import { diasAtras, diasDesde } from "@/lib/datas";
import { NavegacaoProjetos } from "@/components/NavegacaoProjetos";
import { FaxinaFluxo } from "@/components/FaxinaFluxo";

const RETORNOS = [
  ["aceito", "aceitos"], ["trocado", "trocados"], ["editado", "editados"], ["concluido", "concluídos"], ["abandonado", "abandonados"],
] as const;

export default async function Faxina() {
  const { supabase, pessoa } = await pessoaAtual();
  if (!pessoa || pessoa.papel !== "socia") redirect("/");

  const [{ data: paradas }, { data: recortes }] = await Promise.all([
    supabase.from("itens")
      .select("id, titulo, corpo, ultima_movimentacao, projeto:projetos(nome)")
      .eq("tipo", "tarefa").eq("status", "aberta").is("pai_id", null).not("parada_em", "is", null)
      // tarefa sem responsável entra na faxina de quem criou
      .or(`responsavel_id.eq.${pessoa.id},and(responsavel_id.is.null,autor_id.eq.${pessoa.id})`)
      .order("ultima_movimentacao"),
    supabase.from("itens").select("recorte_retorno").eq("origem", "recorte").not("recorte_retorno", "is", null).gte("criado_em", diasAtras(14)),
  ]);

  const lista = (paradas ?? []).map((p) => ({
    id: p.id, titulo: p.titulo, corpo: p.corpo,
    projeto: (p.projeto as unknown as { nome: string } | null)?.nome ?? null,
    dias: diasDesde(p.ultima_movimentacao),
  }));

  // como saber se os recortes estão ajudando: os retornos das últimas duas semanas
  const contagem = Object.fromEntries(RETORNOS.map(([k]) => [k, (recortes ?? []).filter((r) => r.recorte_retorno === k).length]));
  const total = (recortes ?? []).length;
  const fracos = contagem.trocado + contagem.abandonado;
  const alerta = total >= 5 && fracos / total > 0.4;

  return (
    <main className="pagina">
      <header className="topo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <Link href="/"><img src="/marca/logo_preto.svg" alt="moldura" /></Link>
        <span className="m-meta">faxina</span>
      </header>
      <NavegacaoProjetos />

      <div className="saudacao">
        <h1 className="m-h1">faxina</h1>
        <p className="m-lead" style={{ margin: 0, color: "var(--m-ink-quiet)" }}>tarefas sem movimento há 30 dias. arquivar também é uma resposta.</p>
      </div>

      <FaxinaFluxo paradas={lista} />

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
  );
}
