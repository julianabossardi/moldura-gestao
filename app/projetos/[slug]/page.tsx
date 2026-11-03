import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { pessoaAtual } from "@/lib/pessoa";
import { temaParaCss, type Tema } from "@/lib/tema";
import { variacaoSemana, type Metrica } from "@/lib/metricas";
import { carregarEntregas } from "@/lib/entregas";
import { diasAtras, diasAte, haQuanto } from "@/lib/datas";
import { sinaisDoCodigo, type Integracoes } from "@/lib/sinais";
import { NavegacaoProjetos } from "@/components/NavegacaoProjetos";
import { Captura } from "@/components/Captura";
import { EntregaCard } from "@/components/EntregaCard";
import { TempoReal } from "@/components/TempoReal";
import { ArquivarProjeto } from "@/components/projeto/ArquivarProjeto";
import { ReativarBanner } from "@/components/projeto/ReativarBanner";
import { EditarProjeto } from "@/components/projeto/EditarProjeto";
import { DocumentosFixados } from "@/components/projeto/DocumentosFixados";
import { ColunasTarefas } from "@/components/projeto/ColunasTarefas";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ aba?: string }> };

export default async function Projeto({ params, searchParams }: Props) {
  const { slug } = await params;
  const { aba = "como-estamos" } = await searchParams;
  const { supabase, pessoa } = await pessoaAtual();
  if (!pessoa || pessoa.papel !== "socia") redirect("/");

  const { data: projeto } = await supabase.from("projetos").select("*").eq("slug", slug).single();
  if (!projeto) notFound();

  const arquivado = projeto.status === "arquivado";
  const tema = projeto.tema as Tema;
  const metricas = ((projeto.metricas ?? []) as Metrica[]).slice(0, 3);
  const gestao = aba === "gestao";

  const [{ data: socias }, { data: clientes }, { data: outros }, { data: fazendo }, { data: movidos }, entregas, { data: tarefas }, { data: decisoes }, { data: memoria }] =
    await Promise.all([
      supabase.from("pessoas").select("id, nome").eq("papel", "socia").eq("ativa", true).order("nome"),
      supabase.from("pessoas").select("id, nome").eq("papel", "cliente").eq("ativa", true).contains("projetos_cliente", [projeto.id]),
      supabase.from("projetos").select("id, nome").eq("status", "ativo").neq("id", projeto.id).order("ordem_prioridade"),
      supabase.from("itens").select("id, titulo, responsavel:pessoas!responsavel_id(nome)").eq("projeto_id", projeto.id).eq("status", "fazendo"),
      supabase.from("itens").select("responsavel_id, autor_id").eq("projeto_id", projeto.id).gte("ultima_movimentacao", diasAtras(7)),
      carregarEntregas(supabase, projeto.id),
      supabase.from("itens")
        .select("id, tipo, titulo, corpo, projeto_id, responsavel_id, prioridade, prazo, visivel_cliente, status")
        .eq("projeto_id", projeto.id).eq("tipo", "tarefa").in("status", ["aberta", "fazendo"]).is("pai_id", null),
      supabase.from("itens").select("id, titulo, corpo, criado_em").eq("projeto_id", projeto.id).eq("tipo", "decisao").order("criado_em", { ascending: false }),
      supabase.from("itens").select("id, tipo, titulo, url, validade").eq("projeto_id", projeto.id).in("tipo", ["ideia", "reflexao", "referencia"]).eq("status", "aberta").order("criado_em", { ascending: false }),
    ]);

  const integracoes = (projeto.integracoes ?? {}) as Integracoes;
  const sinais = !gestao && (integracoes.github || integracoes.vercel?.projeto_id) ? await sinaisDoCodigo(integracoes) : null;

  const nomes = Object.fromEntries((socias ?? []).map((p) => [p.id, p.nome]));
  const movimento = Object.entries(
    (movidos ?? []).reduce<Record<string, number>>((acc, i) => {
      const quem = i.responsavel_id ?? i.autor_id;
      acc[quem] = (acc[quem] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <div className="tema-projeto" style={temaParaCss(tema)}>
      <main className="pagina">
        <header className="topo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <Link href="/"><img src="/marca/logo_preto.svg" alt="moldura" /></Link>
          <span className="m-meta">dentro de {projeto.nome}</span>
        </header>

        <NavegacaoProjetos atual={slug} />
        {arquivado && <ReativarBanner projetoId={projeto.id} />}

        <div className="cabeca-projeto">
          <div className="saudacao">
            <h1 className="m-h1">{projeto.nome}</h1>
            {projeto.descricao && <p className="m-lead" style={{ margin: 0, color: "var(--m-ink-quiet)" }}>{projeto.descricao}</p>}
          </div>
          {!arquivado && (
            <div className="linha">
              <EditarProjeto projetoId={projeto.id} marco={projeto.proximo_marco} marcoEm={projeto.proximo_marco_em} metricas={(projeto.metricas ?? []) as Metrica[]} integracoes={integracoes} />
              <ArquivarProjeto projetoId={projeto.id} nome={projeto.nome} tarefas={(tarefas ?? []).map((t) => ({ id: t.id, titulo: t.titulo }))} outros={outros ?? []} />
            </div>
          )}
        </div>

        <div className="abas" role="tablist">
          <Link className="aba" href={`/projetos/${slug}`} aria-current={!gestao ? "page" : undefined}>como estamos</Link>
          <Link className="aba" href={`/projetos/${slug}?aba=gestao`} aria-current={gestao ? "page" : undefined}>gestão</Link>
        </div>

        {!gestao ? (
          <>
            {metricas.length > 0 && (
              <section className="numeros">
                {metricas.map((m, i) => {
                  const v = variacaoSemana(m);
                  return (
                    <div className="vidro numero" key={i}>
                      <span className="m-meta">{m.rotulo}</span>
                      <span className="grande">{m.valor ?? "·"}</span>
                      <span className="m-mono" style={{ color: "var(--m-ink-quiet)" }}>
                        {v === null ? "sem comparação ainda" : v === 0 ? "igual à semana passada" : `${v > 0 ? "+" : ""}${v} na semana`}
                      </span>
                      {m.erro && <span className="erro">não consegui ler hoje</span>}
                    </div>
                  );
                })}
              </section>
            )}

            <section className="bloco">
              <h2>em curso agora</h2>
              {(fazendo ?? []).length ? (
                (fazendo ?? []).map((f) => {
                  const r = f.responsavel as unknown as { nome: string } | null;
                  return <div className="item" key={f.id}><span>{f.titulo}</span><span className="m-meta">{r?.nome?.toLowerCase()}</span></div>;
                })
              ) : (
                <p className="aviso">ninguém com algo em curso neste projeto agora.</p>
              )}
            </section>

            {projeto.proximo_marco && (
              <section className="bloco">
                <h2>próximo marco</h2>
                <div className="vidro quieto linha" style={{ justifyContent: "space-between" }}>
                  <span className="m-lead">{projeto.proximo_marco}</span>
                  {projeto.proximo_marco_em && (
                    <span className="m-mono">{new Date(projeto.proximo_marco_em + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
                  )}
                </div>
              </section>
            )}

            {entregas.length > 0 && (
              <section className="bloco">
                <h2>entregas recentes</h2>
                <div className="entregas">{entregas.map((e) => <EntregaCard key={e.id} entrega={e} euId={pessoa.id} />)}</div>
              </section>
            )}

            {sinais && (sinais.commits.length > 0 || sinais.deploys.length > 0) && (
              <section className="bloco">
                <h2>sinais do código</h2>
                {sinais.deploys.map((d) => (
                  <a className="item" key={d.id} href={d.url} target="_blank" rel="noreferrer">
                    <span><span className={d.estado === "error" ? "selo" : "m-mono"}>{d.estado === "ready" ? "no ar" : d.estado === "error" ? "falhou" : d.estado}</span> {d.mensagem ?? "deploy"}</span>
                    <span className="m-meta">{haQuanto(d.em)}</span>
                  </a>
                ))}
                {sinais.commits.map((c) => (
                  <a className="item" key={c.sha} href={c.url} target="_blank" rel="noreferrer">
                    <span><span className="m-mono">{c.sha}</span> {c.mensagem} <span className="m-meta">{c.autor.toLowerCase()}</span></span>
                    <span className="m-meta">{haQuanto(c.em)}</span>
                  </a>
                ))}
              </section>
            )}

            <section className="bloco">
              <h2>movimento da semana</h2>
              {movimento.length ? (
                <div className="linha">
                  {movimento.map(([id, n]) => (
                    <span className="chip" key={id}>{(nomes[id] ?? "").toLowerCase()} <span className="m-mono">{n}</span></span>
                  ))}
                </div>
              ) : (
                <p className="aviso">nada se mexeu nos últimos 7 dias.</p>
              )}
            </section>
          </>
        ) : (
          <>
            <ColunasTarefas
              tarefas={(tarefas ?? []) as never}
              pessoas={socias ?? []}
              projetos={[{ id: projeto.id, nome: projeto.nome }, ...(outros ?? [])]}
              clientes={clientes ?? []}
              autorId={pessoa.id}
              projetoId={projeto.id}
            />

            <section className="bloco">
              <h2>decisões e regras</h2>
              {(decisoes ?? []).length ? (
                (decisoes ?? []).map((d) => (
                  <div className="item" key={d.id}>
                    <div><div className="m-body">{d.titulo}</div>{d.corpo && <div className="m-meta">{d.corpo}</div>}</div>
                    <span className="m-mono">{new Date(d.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
                  </div>
                ))
              ) : (
                <p className="aviso">nenhuma decisão registrada ainda.</p>
              )}
            </section>

            <DocumentosFixados projetoId={projeto.id} links={(projeto.links ?? []) as { titulo: string; url: string }[]} />

            <section className="bloco">
              <h2>ideias e referências</h2>
              {(memoria ?? []).length ? (
                (memoria ?? []).map((m) => {
                  const dias = m.validade ? diasAte(m.validade) : null;
                  return (
                    <div className="item" key={m.id}>
                      <span>{m.url ? <a href={m.url} target="_blank" rel="noreferrer">{m.titulo}</a> : m.titulo}</span>
                      <span className="linha" style={{ flexWrap: "nowrap" }}>
                        <span className="m-meta">{m.tipo === "referencia" ? "referência" : m.tipo === "reflexao" ? "reflexão" : "ideia"}</span>
                        {dias !== null && <span className={dias <= 7 ? "selo" : "m-mono"}>{dias <= 7 ? `expira em ${Math.max(dias, 0)} dias` : `${dias} dias`}</span>}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="aviso">nada guardado neste projeto.</p>
              )}
            </section>
          </>
        )}

        <TempoReal />
        {!arquivado && <Captura projetoId={projeto.id} />}
      </main>
    </div>
  );
}
