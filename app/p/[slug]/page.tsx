import { notFound, redirect } from "next/navigation";
import { pessoaAtual } from "@/lib/pessoa";
import { temaParaCss, type Tema } from "@/lib/tema";
import { variacaoSemana, type Metrica } from "@/lib/metricas";
import { Captura } from "@/components/Captura";
import { TarefasCliente } from "@/components/TarefasCliente";
import { TempoReal } from "@/components/TempoReal";

// portal do cliente: só o projeto dele, com o tema do projeto e uma assinatura discreta da moldura
export default async function Portal({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase, pessoa } = await pessoaAtual();
  if (!pessoa) redirect("/");

  const { data: projeto } = await supabase.from("portal_projetos").select("*").eq("slug", slug).maybeSingle();
  if (!projeto) notFound();
  const tema = projeto.tema as Tema;
  const metricas = ((projeto.metricas ?? []) as Metrica[]).slice(0, 3);
  const eCliente = pessoa.papel === "cliente";

  const [{ data: entregas }, { data: tarefas }] = await Promise.all([
    supabase.from("itens").select("id, titulo, corpo, criado_em, midia").eq("projeto_id", projeto.id).eq("tipo", "entrega").eq("visivel_cliente", true).order("criado_em", { ascending: false }),
    supabase.from("itens").select("id, titulo, corpo, prazo").eq("projeto_id", projeto.id).eq("tipo", "tarefa").eq("responsavel_id", pessoa.id).in("status", ["aberta", "fazendo"]).order("prazo", { nullsFirst: false }),
  ]);

  // as imagens ficam num bucket privado: links de 1 hora, só das entregas mostradas
  const caminhos = (entregas ?? []).flatMap((e) => (e.midia ?? []) as string[]);
  const { data: assinadas } = caminhos.length ? await supabase.storage.from("midia").createSignedUrls(caminhos, 3600) : { data: [] };
  const imagem = (e: { midia: unknown }) => {
    const c = ((e.midia ?? []) as string[])[0];
    return c ? assinadas?.find((a) => a.path === c)?.signedUrl ?? null : null;
  };
  const prazos = Object.fromEntries((tarefas ?? []).filter((t) => t.prazo).map((t) => [t.id, new Date(t.prazo + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })]));

  return (
    <div className="tema-projeto" style={temaParaCss(tema)}>
      <main className="pagina portal">
        <header className="saudacao" style={{ paddingTop: "var(--m-space-6)" }}>
          <span className="m-meta">oi, {pessoa.nome.split(" ")[0].toLowerCase()}</span>
          <h1 className="m-h1">{projeto.nome}</h1>
          {projeto.descricao && <p className="m-lead" style={{ margin: 0, color: "var(--m-ink-quiet)" }}>{projeto.descricao}</p>}
          {!eCliente && <p className="aviso">prévia: é assim que a cliente enxerga este projeto.</p>}
        </header>

        {(metricas.length > 0 || projeto.proximo_marco) && (
          <section className="bloco" style={{ gap: "var(--m-space-4)" }}>
            <h2>como estamos</h2>
            {metricas.length > 0 && (
              <div className="numeros">
                {metricas.map((m, i) => {
                  const v = variacaoSemana(m);
                  return (
                    <div className="vidro numero" key={i}>
                      <span className="m-meta">{m.rotulo}</span>
                      <span className="grande">{m.valor ?? "·"}</span>
                      <span className="m-mono" style={{ color: "var(--m-ink-quiet)" }}>
                        {v === null ? "" : v === 0 ? "igual à semana passada" : `${v > 0 ? "+" : ""}${v} na semana`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            {projeto.proximo_marco && (
              <div className="vidro quieto linha" style={{ justifyContent: "space-between" }}>
                <div><span className="m-meta">próximo marco</span><div className="m-lead">{projeto.proximo_marco}</div></div>
                {projeto.proximo_marco_em && <span className="m-mono">{new Date(projeto.proximo_marco_em + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}</span>}
              </div>
            )}
          </section>
        )}

        <section className="bloco">
          <h2>suas tarefas</h2>
          <TarefasCliente tarefas={tarefas ?? []} prazos={prazos} />
        </section>

        <section className="bloco">
          <h2>entregas</h2>
          {(entregas ?? []).length ? (
            <div className="entregas">
              {(entregas ?? []).map((e) => {
                const img = imagem(e);
                return (
                  <article className="vidro quieto entrega" key={e.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {img && <img className="entrega-img" src={img} alt={e.titulo} />}
                    <h3 className="m-h4" style={{ margin: 0 }}>{e.titulo}</h3>
                    {e.corpo && <p className="m-body" style={{ margin: 0 }}>{e.corpo}</p>}
                    <span className="m-mono">{new Date(e.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
                  </article>
                );
              })}
            </div>
          ) : <p className="aviso">as entregas aparecem aqui assim que forem mostradas para você.</p>}
        </section>

        <section className="bloco">
          <h2>mandar algo</h2>
          <p className="m-meta" style={{ margin: 0 }}>grave um áudio, cole um link, escreva ou anexe um arquivo na barra abaixo. a moldura recebe e organiza.</p>
        </section>

        <footer className="assinatura">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/marca/simbolo_preto.svg" alt="" width={18} height={18} />
          <span className="m-meta">feito com a moldura</span>
        </footer>

        {eCliente && <TempoReal />}
        <Captura projetoId={projeto.id} placeholder="mandar algo para a moldura" rotuloOk="recebido. a moldura já vai olhar." />
      </main>
    </div>
  );
}
