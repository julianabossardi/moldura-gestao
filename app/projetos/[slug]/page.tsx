import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { pessoaAtual } from "@/lib/pessoa";
import { temaParaCss, type Tema } from "@/lib/tema";
import { variacaoSemana, type Metrica } from "@/lib/metricas";
import { carregarNovidades } from "@/lib/novidades";
import { Novidades } from "@/components/Novidades";
import { diasAte, haQuanto, hojeISO, semanasDesde } from "@/lib/datas";
import { naSprint, sprintAtual } from "@/lib/sprint";
import { SprintAtual } from "@/components/projeto/SprintAtual";
import { sinaisDoCodigo, type Integracoes } from "@/lib/sinais";
import { NavegacaoProjetos } from "@/components/NavegacaoProjetos";
import { Captura } from "@/components/Captura";
import { CartaoItem } from "@/components/CartaoItem";
import { ProvedorDetalhe } from "@/components/ProvedorDetalhe";
import { LinhaClicavel } from "@/components/LinhaClicavel";
import { LinhaDoTempo } from "@/components/projeto/LinhaDoTempo";
import { LinksRapidos } from "@/components/projeto/LinksRapidos";
import { SELECT_CARTAO, paraCartoes } from "@/lib/cartao";
import type { Marco } from "@/lib/marcos";
import type { LinkProjeto } from "@/lib/links";
import { TempoReal } from "@/components/TempoReal";
import { ArquivarProjeto } from "@/components/projeto/ArquivarProjeto";
import { ReativarBanner } from "@/components/projeto/ReativarBanner";
import { EditarProjeto } from "@/components/projeto/EditarProjeto";
import { DocumentosFixados } from "@/components/projeto/DocumentosFixados";
import { ColunasTarefas } from "@/components/projeto/ColunasTarefas";
import { Cabecalho } from "@/components/Cabecalho";

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

  const [{ data: socias }, { data: clientes }, { data: outros }, { data: fazendoBrutas }, novidades, { data: tarefasBrutas }, { data: decisoes }, { data: memoria }] =
    await Promise.all([
      supabase.from("pessoas").select("id, nome").eq("papel", "socia").eq("ativa", true).order("nome"),
      supabase.from("pessoas").select("id, nome").eq("papel", "cliente").eq("ativa", true).contains("projetos_cliente", [projeto.id]),
      supabase.from("projetos").select("id, nome").eq("status", "ativo").neq("id", projeto.id).order("ordem_prioridade"),
      supabase.from("itens").select(SELECT_CARTAO).eq("projeto_id", projeto.id).eq("status", "fazendo"),
      carregarNovidades(supabase, { projetoId: projeto.id, limite: 10 }),
      supabase.from("itens").select(SELECT_CARTAO)
        .eq("projeto_id", projeto.id).eq("tipo", "tarefa").in("status", ["aberta", "fazendo"]).is("pai_id", null),
      supabase.from("itens").select("id, titulo, corpo, criado_em").eq("projeto_id", projeto.id).eq("tipo", "decisao").order("criado_em", { ascending: false }),
      supabase.from("itens").select("id, tipo, titulo, url, validade").eq("projeto_id", projeto.id).in("tipo", ["ideia", "reflexao", "referencia"]).eq("status", "aberta").order("criado_em", { ascending: false }),
    ]);

  const [fazendo, tarefas] = await Promise.all([paraCartoes(supabase, fazendoBrutas), paraCartoes(supabase, tarefasBrutas)]);
  // sprint quinzenal: em andamento + abertas com prazo até o fim dela, as atrasadas primeiro
  const sprint = sprintAtual(projeto.sprint_inicio ?? projeto.criado_em, hojeISO());
  // inclui recortes em andamento (fazendo traz também as subtarefas)
  const candidatas = [...fazendo, ...tarefas.filter((t) => !fazendo.some((f) => f.id === t.id))];
  const daSprint = candidatas.filter((t) => naSprint(t, sprint)).sort((a, b) => (a.status === "fazendo" ? -1 : 1) - (b.status === "fazendo" ? -1 : 1) || (a.prazo ?? "9999").localeCompare(b.prazo ?? "9999"));
  const marcos = (projeto.marcos ?? []) as Marco[];
  const links = (projeto.links ?? []) as LinkProjeto[];
  const integracoes = (projeto.integracoes ?? {}) as Integracoes;
  // o repositório configurado em "sinais do código" já vira um link rápido
  const linksExtras: LinkProjeto[] = integracoes.github ? [{ titulo: integracoes.github, url: `https://github.com/${integracoes.github}`, tipo: "repositorio" }] : [];
  const sinais = !gestao && (integracoes.github || integracoes.vercel?.projeto_id) ? await sinaisDoCodigo(integracoes) : null;


  const pessoasEdicao = [...(socias ?? []), ...(clientes ?? []).map((c) => ({ id: c.id, nome: `${c.nome} (cliente)` }))];
  return (
    <ProvedorDetalhe euId={pessoa.id} projetos={[{ id: projeto.id, nome: projeto.nome }, ...(outros ?? [])]} pessoas={pessoasEdicao}>
    <div className="tema-projeto" style={temaParaCss(tema)}>
      <main className="pagina">
        <Cabecalho atual="projeto" contexto={`dentro de ${projeto.nome.toLowerCase()}`} />

        <NavegacaoProjetos atual={slug} />
        {arquivado && <ReativarBanner projetoId={projeto.id} />}

        <div className="cabeca-projeto">
          <div className="saudacao">
            <h1 className="m-h1">{projeto.nome}</h1>
            {projeto.descricao && <p className="m-lead" style={{ margin: 0, color: "var(--m-ink-quiet)" }}>{projeto.descricao}</p>}
            {projeto.criado_em && (
              <span className="m-mono" style={{ color: "var(--m-ink-muted)" }}>
                desde {new Date(projeto.criado_em).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })} · {semanasDesde(projeto.criado_em)} {semanasDesde(projeto.criado_em) === 1 ? "semana" : "semanas"}
              </span>
            )}
          </div>
          {!arquivado && (
            <div className="linha">
              <EditarProjeto projetoId={projeto.id} marcos={marcos} metricas={(projeto.metricas ?? []) as Metrica[]} integracoes={integracoes} />
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
            <SprintAtual projetoId={projeto.id} sprint={sprint} objetivos={(projeto.sprint_objetivos ?? {}) as Record<string, string>} editavel={!arquivado}>
              {daSprint.length ? (
                <div className="grade-cartoes">{daSprint.map((t) => <CartaoItem key={t.id} item={t} euId={pessoa.id} />)}</div>
              ) : (
                <p className="aviso">nada em andamento nem com prazo nesta sprint.</p>
              )}
            </SprintAtual>

            <section className="bloco">
              <h2>marcos</h2>
              {marcos.length ? (
                <LinhaDoTempo projetoId={projeto.id} marcos={marcos} editavel={!arquivado} />
              ) : (
                <p className="aviso">nenhum marco ainda. dá para criar a linha do tempo em editar.</p>
              )}
            </section>

            {!arquivado && <LinksRapidos projetoId={projeto.id} links={links} extras={linksExtras} />}

            {metricas.length > 0 && (
              <section className="numeros">
                {metricas.map((m, i) => {
                  const v = variacaoSemana(m);
                  return (
                    <div className={`vidro numero ${i === 0 ? "foco" : ""}`} key={i}>
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
              <h2>novidades</h2>
              <Novidades itens={novidades} mostrarProjeto={false} vazio="nada neste projeto nos últimos 14 dias." />
            </section>

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

          </>
        ) : (
          <>
            <ColunasTarefas
              tarefas={tarefas}
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
                  <LinhaClicavel key={d.id} id={d.id}>
                    <div><div className="m-body">{d.titulo}</div>{d.corpo && <div className="m-meta">{d.corpo}</div>}</div>
                    <span className="m-mono">{new Date(d.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
                  </LinhaClicavel>
                ))
              ) : (
                <p className="aviso">nenhuma decisão registrada ainda.</p>
              )}
            </section>

            <DocumentosFixados projetoId={projeto.id} links={links} />

            <section className="bloco">
              <h2>ideias e referências</h2>
              {(memoria ?? []).length ? (
                (memoria ?? []).map((m) => {
                  const dias = m.validade ? diasAte(m.validade) : null;
                  return (
                    <LinhaClicavel key={m.id} id={m.id}>
                      <span>{m.titulo}</span>
                      <span className="linha" style={{ flexWrap: "nowrap" }}>
                        <span className="m-meta">{m.tipo === "referencia" ? "referência" : m.tipo === "reflexao" ? "reflexão" : "ideia"}</span>
                        {dias !== null && <span className={dias <= 7 ? "selo" : "m-mono"}>{dias <= 7 ? `expira em ${Math.max(dias, 0)} dias` : `${dias} dias`}</span>}
                      </span>
                    </LinhaClicavel>
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
    </ProvedorDetalhe>
  );
}
