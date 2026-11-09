import { redirect } from "next/navigation";
import { pessoaAtual } from "@/lib/pessoa";
import { Captura } from "@/components/Captura";
import { CartaoConfirmacao } from "@/components/CartaoConfirmacao";
import { TarefasAbertas } from "@/components/TarefasAbertas";
import { Bonequinho, rotuloEstado } from "@/components/Bonequinho";
import { TempoReal } from "@/components/TempoReal";
import { Mostrar } from "@/components/Mostrar";
import { PainelDoDia } from "@/components/PainelDoDia";
import { CapturasAutomaticas } from "@/components/CapturasAutomaticas";
import { ProvedorDetalhe } from "@/components/ProvedorDetalhe";
import { SELECT_CARTAO, aindaNaoComeca, paraCartoes } from "@/lib/cartao";
import { carregarNovidades } from "@/lib/novidades";
import { Novidades } from "@/components/Novidades";
import { NavegacaoProjetos } from "@/components/NavegacaoProjetos";
import Link from "next/link";
import type { ResumoPessoa } from "@/lib/estados-bonequinho";
import { diasAtras, hojeISO } from "@/lib/datas";
import type { Destino } from "@/lib/ia/schemas";
import { Cabecalho } from "@/components/Cabecalho";
import { BilhetePopup, type BilheteRecebido } from "@/components/BilhetePopup";

export default async function Inicio() {
  const { supabase, pessoa } = await pessoaAtual();
  if (!pessoa) {
    return (
      <main className="login"><div className="vidro">
        <h1 className="m-h3" style={{ margin: 0 }}>quase lá</h1>
        <p className="m-body">seu e-mail ainda não está na lista da moldura. fala com a Juliana.</p>
      </div></main>
    );
  }
  if (pessoa.papel === "cliente") {
    const { data: projeto } = await supabase.from("portal_projetos").select("slug").limit(1).maybeSingle();
    if (projeto) redirect(`/p/${projeto.slug}`);
    return <main className="login"><div className="vidro"><p className="m-body">seu acesso está sem projeto agora. fala com a moldura.</p></div></main>;
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const [{ data: projetos }, { data: abertasBrutas }, { data: emCursoBrutas }, { data: pendentesBrutas }, { data: pessoasAtivas }, { data: resumo }, { count: paradas }] = await Promise.all([
    supabase.from("projetos").select("id, nome, slug, ordem_prioridade").eq("status", "ativo").order("ordem_prioridade"),
    // todas as minhas tarefas (ou sem responsável), em qualquer status; feitas e canceladas só as recentes (filtro abaixo)
    supabase.from("itens").select(SELECT_CARTAO).eq("tipo", "tarefa").in("status", ["aberta", "fazendo", "concluida", "arquivada"])
      .or(`responsavel_id.eq.${pessoa.id},responsavel_id.is.null`).is("pai_id", null).order("ultima_movimentacao", { ascending: false }).limit(200),
    // tarefas de agora: em andamento, ou feitas hoje
    supabase.from("itens").select(SELECT_CARTAO).eq("tipo", "tarefa").eq("responsavel_id", pessoa.id)
      .or(`status.eq.fazendo,and(status.eq.concluida,concluido_em.gte.${hojeISO()})`).order("ultima_movimentacao", { ascending: false }),
    // minhas capturas e as que as clientes mandaram: qualquer sócia confirma
    supabase.from("capturas").select("id, proposta, autor_id, autor:pessoas!autor_id(nome, papel)").eq("status", "proposta").order("criado_em"),
    supabase.from("pessoas").select("id, nome").eq("ativa", true).eq("papel", "socia"),
    supabase.rpc("equipe_resumo"),
    // tarefas minhas que o job marcou como paradas (sem responsável entram no backlog de quem criou)
    supabase.from("itens").select("id", { count: "exact", head: true }).eq("tipo", "tarefa").eq("status", "aberta").is("pai_id", null).not("parada_em", "is", null)
      .or(`responsavel_id.eq.${pessoa.id},and(responsavel_id.is.null,autor_id.eq.${pessoa.id})`),
  ]);

  // capturas minhas confirmadas sozinhas, ainda sem resposta
  const { data: autoBrutas } = await supabase.from("capturas").select("id, proposta").eq("autor_id", pessoa.id).eq("status", "confirmada")
    .eq("proposta->>auto", "true").is("proposta->>auto_visto", null).gte("criado_em", diasAtras(14));
  const automaticas = (autoBrutas ?? []).map((c) => {
    const p = c.proposta as { destinos?: Destino[]; auto_pulados?: number };
    return { id: c.id, titulos: (p.destinos ?? []).filter((d) => d.acao !== "atualizar").map((d) => d.titulo), pulados: p.auto_pulados ?? 0 };
  });
  type Autor = { nome: string; papel: string } | null;
  const pendentes = (pendentesBrutas ?? []).filter((c) => c.autor_id === pessoa.id || (c.autor as unknown as Autor)?.papel === "cliente");
  const equipe = (resumo ?? []) as ResumoPessoa[];
  const euResumo = equipe.find((p) => p.id === pessoa.id);
  const outras = equipe.filter((p) => p.id !== pessoa.id);

  // bilhetes que deixaram para mim e ainda não li: aparecem num pop-up, um por vez
  const { data: bilhetesBrutos } = await supabase.from("bilhetes").select("id, texto, criado_em, de:pessoas!de_id(nome)").eq("para_id", pessoa.id).is("lido_em", null).order("criado_em");
  const bilhetes: BilheteRecebido[] = (bilhetesBrutos ?? []).map((b) => ({ id: b.id, texto: b.texto, criado_em: b.criado_em, de: (b.de as unknown as { nome: string } | null)?.nome ?? "alguém" }));

  const recente = diasAtras(30);
  const [novidades, minhas, emCurso] = await Promise.all([
    carregarNovidades(supabase, { limite: 10 }),
    paraCartoes(supabase, ((abertasBrutas ?? []) as unknown as { status: string; ultima_movimentacao?: string }[]).filter((t) => ["aberta", "fazendo"].includes(t.status) || (t.ultima_movimentacao ?? "") >= recente)),
    paraCartoes(supabase, emCursoBrutas),
  ]);
  // o que só começa mais tarde (ex.: depende de um prazo de fora) não aparece ainda no painel
  const minhasHoje = minhas.filter((t) => !aindaNaoComeca(t));
  const abertas = minhasHoje.filter((t) => t.status === "aberta");
  // em andamento primeiro, depois as feitas hoje
  emCurso.sort((a, b) => (a.status === "fazendo" ? -1 : 0) - (b.status === "fazendo" ? -1 : 0));

  // projeto do dia: o de hoje, se já escolhido; senão o mais prioritário com tarefa minha aberta
  const comTarefa = new Set(abertas.map((t) => t.projeto_id));
  const sugerido = projetos?.find((p) => comTarefa.has(p.id))?.id ?? projetos?.[0]?.id ?? null;
  const projetoDoDia = pessoa.projeto_do_dia_em === hoje ? pessoa.projeto_do_dia : sugerido;

  const idsAtualizar = (pendentes ?? []).flatMap((c) => ((c.proposta as { destinos: Destino[] })?.destinos ?? []).map((d) => d.item_id).filter(Boolean)) as string[];
  const { data: existentes } = idsAtualizar.length ? await supabase.from("itens").select("id, titulo").in("id", idsAtualizar) : { data: [] };
  const titulosExistentes = Object.fromEntries((existentes ?? []).map((i) => [i.id, i.titulo]));

  // o topo: como eu estou, e logo ao lado como está a equipe (sem caixa, bonequinhos soltos)
  const saudacao = (
    <>
      <div className="cabeca-eu">
        {euResumo && <Bonequinho pessoa={euResumo} tamanho={160} />}
        <div className="saudacao">
          <h1 className="m-h1">oi, {pessoa.nome.split(" ")[0].toLowerCase()}</h1>
          <p className="m-lead" style={{ margin: 0 }}>como você se sente hoje?</p>
          {euResumo && <span className="m-mono" style={{ color: "var(--m-ink-muted)" }}>agora: {rotuloEstado(euResumo)}</span>}
        </div>
      </div>
      <div className="equipe-topo" aria-label="equipe">
        {outras.map((p) => (
          // clicar na colega abre a página dela, com as tarefas e a caixa de bilhete
          <Link href={`/equipe/${p.id}`} className="pessoa-topo" key={p.id} aria-label={`abrir a página de ${p.nome.split(" ")[0].toLowerCase()}`}>
            <Bonequinho pessoa={p} tamanho={96} />
            <div className="pessoa-topo-texto">
              <strong>{p.nome.split(" ")[0].toLowerCase()}</strong>
              <span className="m-mono">{rotuloEstado(p)}</span>
              {p.fazendo_titulo && <span className="pessoa-fazendo">fazendo: {p.fazendo_titulo}</span>}
            </div>
          </Link>
        ))}
        {!outras.length && <p className="aviso">quando a Lari e a Vivi entrarem, elas aparecem aqui.</p>}
      </div>
      {(paradas ?? 0) > 0 && (
        <Link href="/backlog" className="m-small aviso-faxina">tarefas: {paradas} {paradas === 1 ? "tarefa parada" : "tarefas paradas"}. limpar</Link>
      )}
    </>
  );

  return (
    <ProvedorDetalhe euId={pessoa.id} projetos={projetos ?? []} pessoas={pessoasAtivas ?? []}>
    <main className="pagina">
      <Cabecalho atual="inicio" />
      <BilhetePopup bilhetes={bilhetes} />

      <NavegacaoProjetos />

      {(pendentes ?? []).length > 0 && (
        <section className="bloco">
          <h2>{pendentes!.length} {pendentes!.length === 1 ? "captura" : "capturas"} para confirmar</h2>
          {pendentes!.map((c) => (
            <CartaoConfirmacao key={c.id} id={c.id} destinos={(c.proposta as { destinos: Destino[] }).destinos} titulosExistentes={titulosExistentes} de={c.autor_id === pessoa.id ? undefined : (c.autor as unknown as Autor)?.nome} />
          ))}
        </section>
      )}

      <CapturasAutomaticas capturas={automaticas} />

      <PainelDoDia
        pessoaId={pessoa.id}
        pessoaNome={pessoa.nome}
        projetos={projetos ?? []}
        projetoInicial={projetoDoDia}
        estadosIniciais={pessoa.estados ?? []}
        saudacao={saudacao}
        abaixoDoSeletor={<Mostrar autorId={pessoa.id} projetos={projetos ?? []} projetoInicial={projetoDoDia} />}
        emCurso={emCurso}
      />

      <TarefasAbertas
        tarefas={minhasHoje}
        projetos={projetos ?? []}
        pessoas={pessoasAtivas ?? []}
        autorId={pessoa.id}
        projetoDoDia={projetoDoDia}
      />

      <section className="bloco">
        <h2>novidades</h2>
        <Novidades itens={novidades} vazio="nada nos últimos 14 dias. o botão mostrar para a equipe é o jeito de começar." />
      </section>

      <TempoReal />
      <Captura />
    </main>
    </ProvedorDetalhe>
  );
}
