import Link from "next/link";
import { redirect } from "next/navigation";
import { pessoaAtual } from "@/lib/pessoa";
import { gerarEmbedding } from "@/lib/embedding";
import { NavegacaoProjetos } from "@/components/NavegacaoProjetos";
import { PreviaLink } from "@/components/PreviaLink";
import { ReabrirItem } from "@/components/ReabrirItem";
import { ProvedorDetalhe } from "@/components/ProvedorDetalhe";
import { LinhaClicavel } from "@/components/LinhaClicavel";
import { CartaoItem } from "@/components/CartaoItem";
import { carregarEntregas } from "@/lib/entregas";
import { Cabecalho } from "@/components/Cabecalho";

type Props = { searchParams: Promise<{ q?: string; projeto?: string; tipo?: string; autora?: string; site?: string }> };
type Linha = {
  id: string; tipo: string; titulo: string; corpo: string | null; url: string | null; status: string; tags: string[]; criado_em: string;
  autor: { nome: string } | null; projeto: { nome: string } | null;
};

const TIPOS: Record<string, string> = { ideia: "ideia", reflexao: "reflexão", referencia: "referência", decisao: "decisão", entrega: "entrega", tarefa: "tarefa" };
const SELECT = "id, tipo, titulo, corpo, url, status, tags, criado_em, autor:pessoas!autor_id(nome), projeto:projetos(nome)";
const naMemoria = (i: Pick<Linha, "tipo" | "status">) => i.tipo !== "tarefa" || ["concluida", "arquivada", "expirada"].includes(i.status);

export default async function Memoria({ searchParams }: Props) {
  const { q = "", projeto = "", tipo = "", autora = "", site = "" } = await searchParams;
  const { supabase, pessoa } = await pessoaAtual();
  if (!pessoa || pessoa.papel !== "socia") redirect("/");

  const [{ data: projetos }, { data: socias }] = await Promise.all([
    supabase.from("projetos").select("id, nome").order("ordem_prioridade"),
    supabase.from("pessoas").select("id, nome").eq("papel", "socia"),
  ]);

  const filtrando = !!(q || projeto || tipo || autora || site);
  let itens: Linha[] = [];
  let modo: "sentido" | "texto" | "recentes" = "recentes";

  if (q) {
    // busca por sentido (embedding da consulta); sem provedor de embeddings, cai para busca por texto
    const emb = await gerarEmbedding(q, "query");
    if (emb) {
      modo = "sentido";
      const { data: achados } = await supabase.rpc("buscar_memoria", {
        consulta: JSON.stringify(emb), p_projeto: projeto || null, p_tipo: tipo || null, p_autor: autora || null, p_site: !!site, qtd: 30,
      });
      const ordem = (achados ?? []) as { id: string }[];
      const { data } = ordem.length ? await supabase.from("itens").select(SELECT).in("id", ordem.map((a) => a.id)) : { data: [] };
      itens = ordem.map((a) => (data as unknown as Linha[]).find((i) => i.id === a.id)).filter(Boolean) as Linha[];
    } else {
      modo = "texto";
      const termo = q.replace(/[%,()]/g, " ");
      let query = supabase.from("itens").select(SELECT).or(`titulo.ilike.%${termo}%,corpo.ilike.%${termo}%,url.ilike.%${termo}%`).order("criado_em", { ascending: false }).limit(60);
      if (projeto) query = query.eq("projeto_id", projeto);
      if (tipo) query = query.eq("tipo", tipo);
      if (autora) query = query.eq("autor_id", autora);
      if (site) query = query.contains("tags", ["site"]);
      itens = (((await query).data ?? []) as unknown as Linha[]).filter(naMemoria);
    }
  } else {
    let query = supabase.from("itens").select(SELECT).or("tipo.neq.tarefa,status.in.(concluida,arquivada,expirada)").order("criado_em", { ascending: false }).limit(60);
    if (projeto) query = query.eq("projeto_id", projeto);
    if (tipo) query = query.eq("tipo", tipo);
    if (autora) query = query.eq("autor_id", autora);
    if (site) query = query.contains("tags", ["site"]);
    itens = ((await query).data ?? []) as unknown as Linha[];
  }

  const referencias = !filtrando ? itens.filter((i) => i.tipo === "referencia" && i.url).slice(0, 8) : [];
  const entregas = !filtrando ? (await carregarEntregas(supabase)).slice(0, 8) : [];
  const resto = !filtrando ? itens.filter((i) => !referencias.includes(i) && i.tipo !== "entrega") : itens;

  return (
    <ProvedorDetalhe euId={pessoa.id} projetos={projetos ?? []} pessoas={socias ?? []}>
    <main className="pagina">
      <Cabecalho atual="memoria" />
      <NavegacaoProjetos />

      <div className="saudacao">
        <h1 className="m-h1">memória</h1>
        <p className="m-lead" style={{ margin: 0, color: "var(--m-ink-quiet)" }}>tudo o que já passou por aqui e pode voltar a ser útil.</p>
      </div>

      <form method="get" className="vidro foco busca" role="search">
        <input className="campo" name="q" defaultValue={q} placeholder="busque por sentido: “inspiração de mapa”, “texto sobre curadoria”" aria-label="buscar" />
        <div className="linha">
          <select className="campo filtro" name="projeto" defaultValue={projeto} aria-label="projeto">
            <option value="">todos os projetos</option>
            {(projetos ?? []).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          <select className="campo filtro" name="tipo" defaultValue={tipo} aria-label="tipo">
            <option value="">todos os tipos</option>
            {Object.entries(TIPOS).filter(([k]) => k !== "tarefa").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="campo filtro" name="autora" defaultValue={autora} aria-label="autora">
            <option value="">todas as autoras</option>
            {(socias ?? []).map((p) => <option key={p.id} value={p.id}>{p.nome.toLowerCase()}</option>)}
          </select>
          <label className="linha" style={{ gap: 6 }}><input type="checkbox" name="site" value="1" defaultChecked={!!site} /><span className="m-small">para o site</span></label>
          <button className="btn">buscar</button>
          {filtrando && <Link href="/memoria" className="btn sutil">limpar</Link>}
        </div>
        {q && modo === "texto" && <p className="aviso" style={{ margin: 0 }}>busca por texto, porque o provedor de embeddings ainda não está ligado.</p>}
      </form>

      {referencias.length > 0 && (
        <section className="bloco">
          <h2>referências recentes</h2>
          <div className="previas">{referencias.map((r) => <PreviaLink key={r.id} id={r.id} url={r.url!} titulo={r.titulo} />)}</div>
        </section>
      )}

      {entregas.length > 0 && (
        <section className="bloco">
          <h2>entregas recentes</h2>
          <div className="grade-cartoes">{entregas.map((e) => <CartaoItem key={e.id} item={e} euId={pessoa.id} mostrarProjeto />)}</div>
        </section>
      )}

      <section className="bloco">
        <h2>{filtrando ? `${resto.length} ${resto.length === 1 ? "resultado" : "resultados"}` : "na memória"}</h2>
        {resto.length ? resto.map((i) => (
          <div className="item memoria-item" key={i.id}>
            <LinhaClicavel id={i.id} className="memoria-abrir">
              <div className="m-body">{i.titulo}</div>
              {i.corpo && <div className="m-meta memoria-corpo">{i.corpo}</div>}
              <div className="m-meta">
                {[TIPOS[i.tipo], i.projeto?.nome, i.autor?.nome.toLowerCase(), new Date(i.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })].filter(Boolean).join(" · ")}
                {i.tags.includes("site") && <span className="selo" style={{ marginLeft: 8 }}>para o site</span>}
                {["expirada", "arquivada"].includes(i.status) && <span className="m-mono" style={{ marginLeft: 8 }}>{i.status}</span>}
              </div>
            </LinhaClicavel>
            {["expirada", "arquivada"].includes(i.status) && <ReabrirItem id={i.id} />}
          </div>
        )) : <p className="aviso">{filtrando ? "nada por aqui com esses filtros." : "a memória começa a se formar quando você captura ideias, referências e decisões."}</p>}
      </section>
    </main>
    </ProvedorDetalhe>
  );
}
