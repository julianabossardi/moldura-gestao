import { redirect } from "next/navigation";
import { pessoaAtual } from "@/lib/pessoa";
import { Captura } from "@/components/Captura";
import { CartaoConfirmacao } from "@/components/CartaoConfirmacao";
import { TarefasAbertas } from "@/components/TarefasAbertas";
import { Bonequinho, rotuloEstado } from "@/components/Bonequinho";
import { TempoReal } from "@/components/TempoReal";
import { Mostrar } from "@/components/Mostrar";
import { CartaoItem } from "@/components/CartaoItem";
import { PainelDoDia } from "@/components/PainelDoDia";
import { CapturasAutomaticas } from "@/components/CapturasAutomaticas";
import { ProvedorDetalhe } from "@/components/ProvedorDetalhe";
import { SELECT_CARTAO, paraCartoes } from "@/lib/cartao";
import { carregarEntregas } from "@/lib/entregas";
import { NavegacaoProjetos } from "@/components/NavegacaoProjetos";
import Link from "next/link";
import type { ResumoPessoa } from "@/lib/estados-bonequinho";
import { diasAtras, hojeISO } from "@/lib/datas";
import type { Destino } from "@/lib/ia/schemas";

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
  const [{ data: projetos }, { data: abertasBrutas }, { data: emCursoBrutas }, { data: pendentesBrutas }, { data: pessoasAtivas }, { data: resumo }, { data: avisosBrutos }, { count: paradas }] = await Promise.all([
    supabase.from("projetos").select("id, nome, slug, ordem_prioridade").eq("status", "ativo").order("ordem_prioridade"),
    supabase.from("itens").select(SELECT_CARTAO).eq("tipo", "tarefa").eq("status", "aberta")
      .or(`responsavel_id.eq.${pessoa.id},responsavel_id.is.null`).is("pai_id", null).order("ultima_movimentacao", { ascending: false }),
    // tarefas de agora: em andamento, ou feitas hoje
    supabase.from("itens").select(SELECT_CARTAO).eq("tipo", "tarefa").eq("responsavel_id", pessoa.id)
      .or(`status.eq.fazendo,and(status.eq.concluida,concluido_em.gte.${hojeISO()})`).order("ultima_movimentacao", { ascending: false }),
    // minhas capturas e as que as clientes mandaram: qualquer sócia confirma
    supabase.from("capturas").select("id, proposta, autor_id, autor:pessoas!autor_id(nome, papel)").eq("status", "proposta").order("criado_em"),
    supabase.from("pessoas").select("id, nome").eq("ativa", true).eq("papel", "socia"),
    supabase.rpc("equipe_resumo"),
    // quem reagiu às minhas entregas nas últimas 48h
    supabase.from("reacoes")
      .select("id, tipo, pessoa:pessoas(nome), item:itens!inner(titulo, autor_id)")
      .eq("item.autor_id", pessoa.id).neq("pessoa_id", pessoa.id).gte("criado_em", diasAtras(2)).order("criado_em", { ascending: false }),
    // tarefas minhas que a faxina marcou como paradas (sem responsável entram na faxina de quem criou)
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

  const [entregas, abertas, emCurso] = await Promise.all([
    carregarEntregas(supabase),
    paraCartoes(supabase, abertasBrutas),
    paraCartoes(supabase, emCursoBrutas),
  ]);
  // em andamento primeiro, depois as feitas hoje
  emCurso.sort((a, b) => (a.status === "fazendo" ? -1 : 0) - (b.status === "fazendo" ? -1 : 0));
  const avisos = (avisosBrutos ?? []) as unknown as { id: string; tipo: string; pessoa: { nome: string } | null; item: { titulo: string } }[];

  // projeto do dia: o de hoje, se já escolhido; senão o mais prioritário com tarefa minha aberta
  const comTarefa = new Set(abertas.map((t) => t.projeto_id));
  const sugerido = projetos?.find((p) => comTarefa.has(p.id))?.id ?? projetos?.[0]?.id ?? null;
  const projetoDoDia = pessoa.projeto_do_dia_em === hoje ? pessoa.projeto_do_dia : sugerido;

  const idsAtualizar = (pendentes ?? []).flatMap((c) => ((c.proposta as { destinos: Destino[] })?.destinos ?? []).map((d) => d.item_id).filter(Boolean)) as string[];
  const { data: existentes } = idsAtualizar.length ? await supabase.from("itens").select("id, titulo").in("id", idsAtualizar) : { data: [] };
  const titulosExistentes = Object.fromEntries((existentes ?? []).map((i) => [i.id, i.titulo]));

  const saudacao = (
    <>
      <div className="cabeca-eu">
        {euResumo && <Bonequinho pessoa={euResumo} tamanho={96} />}
        <div className="saudacao">
          <h1 className="m-h1">oi, {pessoa.nome.split(" ")[0].toLowerCase()}</h1>
          <p className="m-lead" style={{ margin: 0, color: "var(--m-ink-quiet)" }}>
            {euResumo ? `estado: ${rotuloEstado(euResumo)}` : "o que cabe hoje?"}
          </p>
        </div>
      </div>
      {avisos.length > 0 && (
        <div className="avisos">
          {avisos.slice(0, 3).map((a) => (
            <p key={a.id} className="m-meta" style={{ margin: 0 }}>
              {a.pessoa?.nome} {a.tipo === "audio" ? "respondeu em áudio" : a.tipo === "estrela" ? "deu estrela" : "deu foguinho"} em {a.item.titulo}
            </p>
          ))}
        </div>
      )}
      <Mostrar autorId={pessoa.id} projetos={projetos ?? []} projetoInicial={projetoDoDia} />
      {(paradas ?? 0) > 0 && (
        <Link href="/faxina" className="m-small aviso-faxina">faxina: {paradas} {paradas === 1 ? "tarefa parada" : "tarefas paradas"}. resolver</Link>
      )}
    </>
  );

  return (
    <ProvedorDetalhe euId={pessoa.id} projetos={projetos ?? []} pessoas={pessoasAtivas ?? []}>
    <main className="pagina">
      <header className="topo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <Link href="/"><img src="/marca/logo_preto.svg" alt="moldura" /></Link>
      </header>

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
        emCurso={emCurso}
      />

      <TarefasAbertas
        tarefas={abertas}
        projetos={projetos ?? []}
        pessoas={pessoasAtivas ?? []}
        autorId={pessoa.id}
        projetoDoDia={projetoDoDia}
      />

      <section className="bloco">
        <h2>equipe</h2>
        <div className="equipe">
          {outras.map((p) => (
            <div className="vidro quieto pessoa-card" key={p.id}>
              <Bonequinho pessoa={p} />
              <div>
                <div className="m-lead">{p.nome.toLowerCase()}</div>
                <div className="m-meta">{rotuloEstado(p)}</div>
                <div className="m-small">{p.fazendo_titulo ? `fazendo: ${p.fazendo_titulo}` : ""}</div>
              </div>
            </div>
          ))}
          {!outras.length && <p className="aviso">quando a Lari e a Vivi entrarem, elas aparecem aqui.</p>}
        </div>
      </section>

      <section className="bloco">
        <h2>entregas recentes</h2>
        {entregas.length ? (
          <div className="grade-cartoes">{entregas.map((e) => <CartaoItem key={e.id} item={e} euId={pessoa.id} mostrarProjeto />)}</div>
        ) : (
          <p className="aviso">nada nos últimos 14 dias. o botão mostrar para a equipe é o jeito de começar.</p>
        )}
      </section>

      <TempoReal />
      <Captura />
    </main>
    </ProvedorDetalhe>
  );
}
