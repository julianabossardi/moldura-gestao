/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/client";
import type { Recorte } from "@/lib/ia/schemas";
import type { ItemCartao } from "@/lib/cartao";
import { hojeISO } from "@/lib/datas";
import { CartaoItem } from "./CartaoItem";
import { Avatar } from "./Avatar";
import { Icone } from "./Icone";
import { useDetalhe } from "./ProvedorDetalhe";

type Projeto = { id: string; nome: string };
type Props = {
  pessoaId: string;
  pessoaNome: string;
  projetos: Projeto[];
  projetoInicial: string | null;
  estadosIniciais: string[];
  saudacao: React.ReactNode; // lado esquerdo do topo, montado no servidor
  abaixoDoSeletor?: React.ReactNode; // fica logo abaixo da caixa de seleção ("mostrar para a equipe")
  emCurso: ItemCartao[]; // tarefas de agora que já estão no banco (em andamento ou feitas hoje)
};

type Sessao = { recortes: Recorte[]; titulos: Record<string, string>; projeto: string; projetosDosPais?: Record<string, string> };

const TEMPOS = [{ r: "30 min", m: 30 }, { r: "1h", m: 60 }, { r: "2h", m: 120 }, { r: "3h+", m: 180 }];
// "leve" continua no banco; na tela vira "distraída": pede tarefas mais fáceis e mais guiadas
const ESTADOS = [
  { valor: "focada", rotulo: "focada" },
  { valor: "criativa", rotulo: "criativa" },
  { valor: "leve", rotulo: "distraída" },
];
const TODOS = "todos";

// o topo da página inicial (saudação ao lado do seletor) e o bloco das tarefas de agora.
// a pessoa diz como está e quanto tempo tem; a plataforma devolve de 1 a 3 tarefas para focar nesse período
export function PainelDoDia({ pessoaId, pessoaNome, projetos, projetoInicial, estadosIniciais, saudacao, abaixoDoSeletor, emCurso }: Props) {
  const router = useRouter();
  const { abrir } = useDetalhe();
  const chave = `sessao-${pessoaId}-${hojeISO()}`;
  const [projeto, setProjeto] = useState(projetoInicial ?? projetos[0]?.id ?? TODOS);
  const [minutos, setMinutos] = useState(60);
  const [estados, setEstados] = useState<string[]>(estadosIniciais.length ? estadosIniciais : ["focada"]);
  const [quantidade, setQuantidade] = useState<number | "auto">("auto");
  const [sessao, setSessao] = useState<Sessao>({ recortes: [], titulos: {}, projeto: "" });
  const [carregando, setCarregando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [editando, setEditando] = useState<number | null>(null);
  const [titulosEditados, setTitulosEditados] = useState<Record<number, string>>({});

  const supabase = supabaseNavegador();

  // as sugestões que ainda não começaram ficam guardadas neste aparelho até o fim do dia
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(chave);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- storage só existe no navegador
      if (salvo) setSessao(JSON.parse(salvo));
    } catch { /* sem storage: começa vazio */ }
  }, [chave]);
  function guardar(s: Sessao) {
    setSessao(s);
    try { localStorage.setItem(chave, JSON.stringify(s)); } catch { /* ignora */ }
  }

  async function pedir(qtd: number | "auto" = quantidade, somar = false) {
    setCarregando(true);
    setAviso("");
    const r = await fetch("/api/recortes", { method: "POST", body: JSON.stringify({ projeto_id: projeto === TODOS ? null : projeto, minutos, estados, quantidade: qtd }) });
    const j = await r.json().catch(() => ({}));
    setCarregando(false);
    if (!r.ok) return setAviso("não consegui montar as tarefas agora. tente de novo daqui a pouco.");
    const novos: Recorte[] = j.recortes ?? [];
    if (!novos.length && !somar) return setAviso(projeto === TODOS ? "nenhuma tarefa aberta para você. grave algo ou crie uma tarefa." : "nenhuma tarefa aberta nesse projeto para você. grave algo ou escolha todos.");
    guardar({
      recortes: somar ? [...sessao.recortes, ...novos] : novos,
      titulos: { ...(somar ? sessao.titulos : {}), ...(j.titulos ?? {}) },
      projetosDosPais: { ...(somar ? sessao.projetosDosPais : {}), ...(j.projetos ?? {}) },
      projeto,
    });
    setEditando(null);
    setTitulosEditados({});
  }

  async function escolherProjeto(id: string) {
    setProjeto(id);
    if (id === TODOS) return;
    await supabase.from("pessoas").update({ projeto_do_dia: id, projeto_do_dia_em: hojeISO() }).eq("id", pessoaId);
  }
  async function alternarEstado(s: string) {
    const novo = estados.includes(s) ? estados.filter((x) => x !== s) : [...estados, s];
    if (!novo.length) return;
    setEstados(novo);
    await supabase.from("pessoas").update({ estados: novo }).eq("id", pessoaId);
  }

  async function agir(acao: "comecar" | "outro" | "concluir", original: Recorte, indice: number) {
    const novoTitulo = titulosEditados[indice];
    const editado = acao !== "outro" && !!novoTitulo && novoTitulo.trim() !== original.titulo;
    const r = editado ? { ...original, titulo: novoTitulo.trim() } : original;
    await fetch("/api/recortes/acao", { method: "POST", body: JSON.stringify({ acao, recorte: r, projeto_id: sessao.projetosDosPais?.[r.pai_id] ?? sessao.projeto ?? projeto, editado }) });
    const resto = sessao.recortes.filter((_, k) => k !== indice);
    guardar({ ...sessao, recortes: resto });
    setEditando(null);
    setTitulosEditados({});
    if (acao === "outro") pedir(1, true);
    else router.refresh();
  }

  async function marcarFeita(id: string) {
    await supabase.from("itens").update({ status: "concluida", recorte_retorno: "concluido" }).eq("id", id);
    router.refresh();
  }
  // marcou feita sem querer: volta para em andamento
  async function desfazerFeita(id: string) {
    await supabase.from("itens").update({ status: "fazendo", recorte_retorno: "aceito" }).eq("id", id);
    router.refresh();
  }

  const vazio = !emCurso.length && !sessao.recortes.length;

  return (
    <>
      <div className="hero">
        <div className="hero-saudacao">{saudacao}</div>
        <div className="hero-direita">
        <div className="vidro hero-seletor">
          <div className="linha"><span className="rotulo">projeto</span>
            <button className="chip" aria-pressed={projeto === TODOS} onClick={() => escolherProjeto(TODOS)}>todos</button>
            {projetos.map((p) => <button key={p.id} className="chip" aria-pressed={projeto === p.id} onClick={() => escolherProjeto(p.id)}>{p.nome.toLowerCase()}</button>)}
          </div>
          <div className="linha"><span className="rotulo">tempo disponível</span>
            {TEMPOS.map((t) => <button key={t.m} className="chip" aria-pressed={minutos === t.m} onClick={() => setMinutos(t.m)}>{t.r}</button>)}
          </div>
          <div className="linha"><span className="rotulo">como você está</span>
            {ESTADOS.map((e) => (
              <button key={e.valor} className="chip" aria-pressed={estados.includes(e.valor)} onClick={() => alternarEstado(e.valor)}>
                <img className="icone-pixel" src={`/bonequinhos/_simbolos/${e.valor}.png`} alt="" height={16} aria-hidden /> {e.rotulo}
              </button>
            ))}
          </div>
          {estados.includes("leve") && <p className="m-meta seletor-dica">distraída: as tarefas vêm mais fáceis e com o passo a passo.</p>}
          <div className="linha"><span className="rotulo">quantas tarefas</span>
            {([1, 2, 3, "auto"] as const).map((q) => <button key={q} className="chip" aria-pressed={quantidade === q} onClick={() => setQuantidade(q)}>{q === "auto" ? "quantas achar melhor" : q}</button>)}
          </div>
          <div><button className="btn acento" disabled={carregando || !projeto} onClick={() => pedir()}>{carregando ? "escolhendo…" : "me dá tarefas"}</button></div>
        </div>
        {abaixoDoSeletor}
        </div>
      </div>

      <section className="bloco sessao-caixa">
        <h2>suas tarefas de agora</h2>
        {aviso && <p className="aviso" role="status">{aviso}</p>}
        {vazio ? (
          <p className="aviso">diga o projeto, o tempo e como você está, e peça tarefas. elas aparecem aqui para você focar nesse período.</p>
        ) : (
          <div className="grade-cartoes sessao">
            {emCurso.map((t) => (
              <CartaoItem
                key={t.id}
                item={t}
                euId={pessoaId}
                destaque
                mostrarProjeto
                rodape={t.status === "fazendo"
                  ? <button className="btn" onClick={() => marcarFeita(t.id)}><Icone nome="check-branco" /> feita</button>
                  : <button className="btn sutil" onClick={() => desfazerFeita(t.id)}>desfazer feita</button>}
              />
            ))}
            {sessao.recortes.map((r, i) => (
              <article key={`${r.pai_id}-${i}`} className="cartao destaque sugestao" role="button" tabIndex={0} onClick={() => abrir(r.pai_id)} onKeyDown={(e) => e.key === "Enter" && abrir(r.pai_id)}>
                <div className="cartao-corpo">
                  <Avatar nome={pessoaNome} tam={48} />
                  <div className="cartao-texto">
                    {editando === i ? (
                      <input className="campo" autoFocus value={titulosEditados[i] ?? r.titulo} onClick={(e) => e.stopPropagation()} onChange={(e) => setTitulosEditados({ ...titulosEditados, [i]: e.target.value })} />
                    ) : (
                      <h3 className="cartao-titulo">{titulosEditados[i] ?? r.titulo}</h3>
                    )}
                    {r.por_que_agora && <p className="m-meta" style={{ margin: 0 }}>{r.por_que_agora}</p>}
                    <div className="cartao-meta">
                      <span className="m-mono">{r.minutos_estimados} min</span>
                      <span className="m-mono cartao-projeto">{sessao.titulos[r.pai_id]}</span>
                    </div>
                    {r.mini_passos.length > 0 && <ul className="passos">{r.mini_passos.map((p, j) => <li key={j}>{p}</li>)}</ul>}
                  </div>
                </div>
                <div className="cartao-acoes" onClick={(e) => e.stopPropagation()}>
                  <button className="btn" onClick={() => agir("comecar", r, i)}>começar</button>
                  <button className="btn sutil" onClick={() => agir("concluir", r, i)}><Icone nome="check" /> feita</button>
                  <button className="btn sutil" onClick={() => agir("outro", r, i)}>outra</button>
                  <button className="btn sutil" onClick={() => setEditando(editando === i ? null : i)}>{editando === i ? "pronto" : "editar"}</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
