import { pessoaAtual } from "@/lib/pessoa";
import { Seletor } from "@/components/Seletor";
import { Captura } from "@/components/Captura";
import { CartaoConfirmacao } from "@/components/CartaoConfirmacao";
import { TarefasAbertas } from "@/components/TarefasAbertas";
import { FazendoAgora } from "@/components/FazendoAgora";
import { Bonequinho, rotuloEstado } from "@/components/Bonequinho";
import { TempoReal } from "@/components/TempoReal";
import { Mostrar } from "@/components/Mostrar";
import { EntregaCard } from "@/components/EntregaCard";
import { carregarEntregas } from "@/lib/entregas";
import { NavegacaoProjetos } from "@/components/NavegacaoProjetos";
import Link from "next/link";
import type { ResumoPessoa } from "@/lib/estados-bonequinho";
import { diasAtras } from "@/lib/datas";
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
  if (pessoa.papel === "cliente") return <main className="login"><div className="vidro"><p className="m-body">o portal do cliente chega na fase 6.</p></div></main>;

  const hoje = new Date().toISOString().slice(0, 10);
  const [{ data: projetos }, { data: abertas }, { data: fazendo }, { data: pendentes }, { data: pessoasAtivas }, { data: resumo }, { data: avisosBrutos }] = await Promise.all([
    supabase.from("projetos").select("id, nome, slug, ordem_prioridade").eq("status", "ativo").order("ordem_prioridade"),
    supabase.from("itens").select("id, tipo, titulo, corpo, projeto_id, responsavel_id, prioridade, prazo, visivel_cliente, status").eq("tipo", "tarefa").eq("status", "aberta")
      .or(`responsavel_id.eq.${pessoa.id},responsavel_id.is.null`).is("pai_id", null).order("ultima_movimentacao", { ascending: false }),
    supabase.from("itens").select("id, titulo, origem").eq("status", "fazendo").eq("responsavel_id", pessoa.id).limit(1),
    supabase.from("capturas").select("id, proposta").eq("autor_id", pessoa.id).eq("status", "proposta").order("criado_em"),
    supabase.from("pessoas").select("id, nome").eq("ativa", true).eq("papel", "socia"),
    supabase.rpc("equipe_resumo"),
    // quem reagiu às minhas entregas nas últimas 48h
    supabase.from("reacoes")
      .select("id, tipo, pessoa:pessoas(nome), item:itens!inner(titulo, autor_id)")
      .eq("item.autor_id", pessoa.id).neq("pessoa_id", pessoa.id).gte("criado_em", diasAtras(2)).order("criado_em", { ascending: false }),
  ]);

  const equipe = (resumo ?? []) as ResumoPessoa[];
  const euResumo = equipe.find((p) => p.id === pessoa.id);
  const outras = equipe.filter((p) => p.id !== pessoa.id);

  const entregas = await carregarEntregas(supabase);
  const avisos = (avisosBrutos ?? []) as unknown as { id: string; tipo: string; pessoa: { nome: string } | null; item: { titulo: string } }[];

  // projeto do dia: o de hoje, se já escolhido; senão o mais prioritário com tarefa minha aberta
  const comTarefa = new Set((abertas ?? []).map((t) => t.projeto_id));
  const sugerido = projetos?.find((p) => comTarefa.has(p.id))?.id ?? projetos?.[0]?.id ?? null;
  const projetoDoDia = pessoa.projeto_do_dia_em === hoje ? pessoa.projeto_do_dia : sugerido;

  const idsAtualizar = (pendentes ?? []).flatMap((c) => ((c.proposta as { destinos: Destino[] })?.destinos ?? []).map((d) => d.item_id).filter(Boolean)) as string[];
  const { data: existentes } = idsAtualizar.length ? await supabase.from("itens").select("id, titulo").in("id", idsAtualizar) : { data: [] };
  const titulosExistentes = Object.fromEntries((existentes ?? []).map((i) => [i.id, i.titulo]));

  return (
    <main className="pagina">
      <header className="topo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <Link href="/"><img src="/marca/logo_preto.svg" alt="moldura" /></Link>
        <Mostrar autorId={pessoa.id} projetos={projetos ?? []} projetoInicial={projetoDoDia} />
      </header>

      <NavegacaoProjetos />

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
          {avisos.map((a) => (
            <p key={a.id} className="m-meta" style={{ margin: 0 }}>
              {a.pessoa?.nome} {a.tipo === "audio" ? "respondeu em áudio" : "deu foguinho"} em {a.item.titulo}
            </p>
          ))}
        </div>
      )}

      {(pendentes ?? []).length > 0 && (
        <section className="bloco">
          <h2>{pendentes!.length} {pendentes!.length === 1 ? "captura" : "capturas"} para confirmar</h2>
          {pendentes!.map((c) => (
            <CartaoConfirmacao key={c.id} id={c.id} destinos={(c.proposta as { destinos: Destino[] }).destinos} titulosExistentes={titulosExistentes} />
          ))}
        </section>
      )}

      {fazendo?.[0] && <FazendoAgora item={fazendo[0]} />}

      <Seletor pessoaId={pessoa.id} projetos={projetos ?? []} projetoInicial={projetoDoDia} estadosIniciais={pessoa.estados ?? []} />

      <TarefasAbertas
        tarefas={(abertas ?? []) as never}
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
          <div className="entregas">{entregas.map((e) => <EntregaCard key={e.id} entrega={e} euId={pessoa.id} />)}</div>
        ) : (
          <p className="aviso">nada nos últimos 14 dias. o botão mostrar é o jeito de começar.</p>
        )}
      </section>

      <TempoReal />
      <Captura />
    </main>
  );
}
