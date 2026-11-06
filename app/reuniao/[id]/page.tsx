import type { Conferencia } from "@/lib/reuniao/passo2";
import { notFound, redirect } from "next/navigation";
import { pessoaAtual } from "@/lib/pessoa";
import type { Painel, PropostaReuniao, Segmento } from "@/lib/reuniao/tipos";
import { BLOCO_SEGUNDOS, mmss } from "@/lib/reuniao/tipos";
import { NavegacaoProjetos } from "@/components/NavegacaoProjetos";
import { ProcessandoReuniao } from "@/components/reuniao/ProcessandoReuniao";
import { AssociarFalantes } from "@/components/reuniao/AssociarFalantes";
import { RevisaoReuniao } from "@/components/reuniao/RevisaoReuniao";
import { PainelProjetoView } from "@/components/reuniao/PainelProjetoView";
import { ProvedorDetalhe } from "@/components/ProvedorDetalhe";
import { CartaoItem } from "@/components/CartaoItem";
import { SELECT_CARTAO, paraCartoes } from "@/lib/cartao";
import { Cabecalho } from "@/components/Cabecalho";

export default async function ReuniaoPorId({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, pessoa } = await pessoaAtual();
  if (!pessoa || pessoa.papel !== "socia") redirect("/");

  const { data: r } = await supabase.from("reunioes").select("*").eq("id", id).single();
  if (!r) notFound();
  if (r.status === "gravando") redirect("/reuniao");

  const [{ data: socias }, { data: pessoas }, { data: projetos }] = await Promise.all([
    supabase.from("pessoas").select("id, nome").eq("papel", "socia").eq("ativa", true).order("nome"),
    supabase.from("pessoas").select("id, nome"),
    supabase.from("projetos").select("id, slug, nome"),
  ]);
  const transcricao = (r.transcricao ?? null) as Segmento[] | null;
  const falantes = (r.falantes ?? {}) as Record<string, string | null>;
  const data = new Date(r.data + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  let corpo: React.ReactNode;

  if (r.status === "processando" && !transcricao) {
    corpo = <ProcessandoReuniao id={id} />;
  } else if (r.status === "processando" && transcricao) {
    // um trecho de áudio de cada voz, para a pessoa saber quem é quem
    const paths = (r.audio_paths ?? []) as string[];
    const trechos = await Promise.all(
      Object.keys(falantes).map(async (f) => {
        const falas = transcricao.filter((s) => s.falante === f);
        const s = falas.find((x) => x.fim - x.inicio >= 3) ?? falas[0];
        const idx = Math.floor(s.inicio / BLOCO_SEGUNDOS);
        const local = s.inicio - idx * BLOCO_SEGUNDOS;
        const { data: url } = paths[idx] ? await supabase.storage.from("midia").createSignedUrl(paths[idx], 3600) : { data: null };
        return { falante: f, url: url?.signedUrl ?? null, de: Math.floor(local), ate: Math.ceil(local + Math.min(s.fim - s.inicio, 10)), amostra: s.texto.slice(0, 110) };
      }),
    );
    corpo = <AssociarFalantes id={id} falantes={falantes} trechos={trechos} socias={socias ?? []} />;
  } else if (r.status === "em_revisao") {
    const proposta = r.proposta as PropostaReuniao;
    const ids = proposta.projetos.flatMap((b) => b.atualizacoes.map((u) => u.item_id));
    const { data: itens } = ids.length ? await supabase.from("itens").select("id, titulo").in("id", ids) : { data: [] };
    corpo = (
      <RevisaoReuniao
        id={id}
        proposta={proposta}
        conferencia={(r.conferencia ?? null) as Conferencia | null}
        erroPasso2={r.passo2_erro ?? null}
        projetos={Object.fromEntries((projetos ?? []).map((p) => [p.slug, p.nome]))}
        titulos={Object.fromEntries((itens ?? []).map((i) => [i.id, i.titulo]))}
      />
    );
  } else {
    // aprovada: histórico com resumo, transcrição e o que foi aprovado
    const painel = r.painel as Painel | null;
    const criados = await paraCartoes(supabase, (await supabase.from("itens").select(SELECT_CARTAO).eq("reuniao_id", id).order("criado_em")).data);
    const porProjeto = Object.entries(criados.reduce<Record<string, typeof criados>>((acc, c) => {
      (acc[c.projeto ?? "soltos"] ??= []).push(c);
      return acc;
    }, {}));
    const nome = (f: string) => pessoas?.find((p) => p.id === falantes[f])?.nome ?? f;
    corpo = (
      <>
        {r.resumo && <section className="bloco"><h2>resumo</h2><p className="m-body" style={{ margin: 0, whiteSpace: "pre-line" }}>{r.resumo}</p></section>}
        <section className="bloco">
          <h2>encaminhamentos</h2>
          <p className="m-meta" style={{ margin: 0 }}>o que saiu da reunião e já está nos projetos: tarefas, decisões e ideias.</p>
          {porProjeto.length ? porProjeto.map(([nome, lista]) => (
            <div className="bloco" key={nome}>
              <span className="m-small">{nome}</span>
              <div className="grade-cartoes">{lista.map((c) => <CartaoItem key={c.id} item={c} euId={pessoa.id} />)}</div>
            </div>
          )) : <p className="aviso">nenhum item novo. as atualizações foram aplicadas nos itens existentes.</p>}
        </section>
        {painel && (
          <details className="bloco">
            <summary>o que mudou antes desta reunião</summary>
            {painel.projetos.map((b, i) => (
              <div key={i} style={{ marginTop: 16 }}><h3 className="m-lead" style={{ margin: "0 0 8px" }}>{b.projeto?.nome ?? "soltos"}</h3><PainelProjetoView bloco={b} /></div>
            ))}
          </details>
        )}
        {transcricao && (
          <details className="bloco">
            <summary>transcrição</summary>
            {transcricao.map((s, i) => (
              <div className="fala" key={i}><span className="m-mono">{mmss(s.inicio)}</span><span><strong>{nome(s.falante).toLowerCase()}</strong> {s.texto}</span></div>
            ))}
          </details>
        )}
      </>
    );
  }

  const titulo = { processando: "processando", em_revisao: "revisão", aprovada: "reunião" }[r.status as string] ?? "reunião";
  return (
    <ProvedorDetalhe euId={pessoa.id} projetos={(projetos ?? []).map((p) => ({ id: p.id, nome: p.nome }))} pessoas={socias ?? []}>
    <main className="pagina">
      <Cabecalho atual="reuniao" contexto="reunião anterior" />
      <NavegacaoProjetos />
      <div className="saudacao">
        <h1 className="m-h1">{titulo}</h1>
        <p className="m-lead" style={{ margin: 0, color: "var(--m-ink-quiet)" }}>{data}</p>
      </div>
      {corpo}
    </main>
    </ProvedorDetalhe>
  );
}
