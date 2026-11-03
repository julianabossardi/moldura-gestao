import { pessoaAtual } from "@/lib/pessoa";
import { Seletor } from "@/components/Seletor";
import { Captura } from "@/components/Captura";
import { CartaoConfirmacao } from "@/components/CartaoConfirmacao";
import { FazendoAgora } from "@/components/FazendoAgora";
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
  const [{ data: projetos }, { data: abertas }, { data: fazendo }, { data: pendentes }] = await Promise.all([
    supabase.from("projetos").select("id, nome, slug, ordem_prioridade").eq("status", "ativo").order("ordem_prioridade"),
    supabase.from("itens").select("id, titulo, projeto_id, prioridade").eq("tipo", "tarefa").eq("status", "aberta")
      .or(`responsavel_id.eq.${pessoa.id},responsavel_id.is.null`).is("pai_id", null).order("ultima_movimentacao", { ascending: false }),
    supabase.from("itens").select("id, titulo, origem").eq("status", "fazendo").eq("responsavel_id", pessoa.id).limit(1),
    supabase.from("capturas").select("id, proposta").eq("autor_id", pessoa.id).eq("status", "proposta").order("criado_em"),
  ]);

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
        <img src="/marca/logo_preto.svg" alt="moldura" />
        <span className="m-meta">{(pessoa.estados ?? []).join(" + ") || "sem estado"}</span>
      </header>

      <div className="saudacao">
        <h1 className="m-h1">oi, {pessoa.nome.split(" ")[0].toLowerCase()}</h1>
        <p className="m-lead" style={{ margin: 0, color: "var(--m-ink-quiet)" }}>o que cabe hoje?</p>
      </div>

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

      <section className="bloco">
        <details>
          <summary>minhas tarefas abertas ({abertas?.length ?? 0})</summary>
          {(projetos ?? []).map((p) => {
            const lista = (abertas ?? []).filter((t) => t.projeto_id === p.id);
            return lista.length ? (
              <div key={p.id} style={{ marginTop: 16 }}>
                <span className="m-meta">{p.nome}</span>
                {lista.map((t) => <div className="item" key={t.id}><span>{t.titulo}</span><span className="m-meta">{t.prioridade}</span></div>)}
              </div>
            ) : null;
          })}
          {(abertas ?? []).filter((t) => !t.projeto_id).map((t) => <div className="item" key={t.id}><span>{t.titulo}</span><span className="m-meta">solta</span></div>)}
        </details>
      </section>

      <Captura />
    </main>
  );
}
