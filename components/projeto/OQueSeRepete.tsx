"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/client";
import { DIAS_NA_SEMANA, ROTULO_FREQUENCIA, textoDaRegra, type Frequencia, type Ocorrencia, type Recorrencia } from "@/lib/recorrencia";
import { Icone } from "../Icone";
import { Gaveta } from "../Gaveta";

export type RecorrenciaComPrevisao = Recorrencia & { previsao: Ocorrencia[]; responsavel: string | null };

const NOME_DIA: Record<string, string> = { seg: "segunda", ter: "terça", qua: "quarta", qui: "quinta", sex: "sexta", sab: "sábado", dom: "domingo" };
const dataCurta = (iso: string) => new Date(iso + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

// botão do cabeçalho do projeto: abre a gaveta com o modelo de cada tarefa recorrente e, calculado na hora, o que vem
// pelas próximas 4 semanas. criar é pelo "nova tarefa" (é recorrente?). mudar aqui só vale para as próximas tarefas;
// as que já foram criadas ficam como estão
export function OQueSeRepete({ projetoId, euId, recorrencias, pessoas }: {
  projetoId: string; euId: string; recorrencias: RecorrenciaComPrevisao[]; pessoas: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);

  async function alternar(r: RecorrenciaComPrevisao) {
    await supabaseNavegador().from("recorrencias").update({ ativa: !r.ativa }).eq("id", r.id);
    // ligar de volta cria já as tarefas do período; desligar não apaga nada
    if (!r.ativa) await fetch("/api/recorrencias/rodar", { method: "POST" }).catch(() => {});
    router.refresh();
  }

  if (!recorrencias.length) return null;
  return (
    <>
      <button className="btn sutil" onClick={() => setAberto(true)}><Icone nome="menu" /> o que se repete ({recorrencias.filter((r) => r.ativa).length})</button>
      {aberto && (
        <Gaveta titulo="o que se repete" onFechar={() => { setAberto(false); setEditando(null); }}>
          {recorrencias.map((r) => (
            <div key={r.id} className="bloco" style={{ gap: 6, opacity: r.ativa ? 1 : 0.6 }}>
              <div className="m-body">{r.titulo}{!r.ativa && <span className="m-mono"> · desligada</span>}</div>
              <div className="m-meta">{textoDaRegra(r)}{r.responsavel ? ` · ${r.responsavel.toLowerCase()}` : ""}</div>
              {r.ativa && (
                <div className="linha" style={{ gap: 6 }}>
                  {r.previsao.length ? r.previsao.map((o, k) => (
                    <span key={k} className={o.criada ? "selo" : "m-mono"} title={o.criada ? "já criada" : "ainda vai ser criada"}>
                      {dataCurta(o.prazo)}{r.quantidade > 1 || r.variacoes.length ? ` · ${o.titulo.replace(r.titulo, "").replace(/^ \(|\)$/g, "") || `#${o.vez}`}` : ""}
                    </span>
                  )) : <span className="m-meta">nada previsto nas próximas 4 semanas</span>}
                </div>
              )}
              <div className="linha">
                <button className="btn sutil" onClick={() => setEditando(editando === r.id ? null : r.id)}>editar</button>
                <button className="btn sutil" onClick={() => alternar(r)}>{r.ativa ? "desligar" : "ligar"}</button>
              </div>
              {editando === r.id && <FormRecorrencia projetoId={projetoId} euId={euId} inicial={r} outras={recorrencias.filter((o) => o.id !== r.id)} pessoas={pessoas} onFim={() => { setEditando(null); router.refresh(); }} />}
            </div>
          ))}
        </Gaveta>
      )}
    </>
  );
}

function FormRecorrencia({ projetoId, euId, inicial, outras, pessoas, onFim }: {
  projetoId: string; euId: string; inicial?: Recorrencia; outras: Recorrencia[]; pessoas: { id: string; nome: string }[]; onFim: () => void;
}) {
  const [titulo, setTitulo] = useState(inicial?.titulo ?? "");
  const [objetivo, setObjetivo] = useState(inicial?.objetivo ?? "");
  const [pronto, setPronto] = useState(inicial?.definicao_pronto ?? "");
  const [dono, setDono] = useState(inicial?.responsavel_id ?? "");
  const [prioridade, setPrioridade] = useState(inicial?.prioridade ?? "media");
  const [frequencia, setFrequencia] = useState<Frequencia>(inicial?.frequencia ?? "semanal");
  const [quantidade, setQuantidade] = useState(inicial?.quantidade ?? 1);
  const [variacoes, setVariacoes] = useState((inicial?.variacoes ?? []).join(", "));
  const [prazo, setPrazo] = useState(inicial?.prazo_no_periodo ?? "sex");
  const [depende, setDepende] = useState(inicial?.depende_de ?? "");
  const [erro, setErro] = useState("");

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    const linha = {
      projeto_id: projetoId, titulo: titulo.trim(), objetivo: objetivo.trim() || null, definicao_pronto: pronto.trim() || null,
      prioridade, responsavel_id: dono || null, frequencia, quantidade: Math.max(1, Math.min(14, quantidade || 1)),
      variacoes: variacoes.split(",").map((v) => v.trim()).filter(Boolean), prazo_no_periodo: prazo, depende_de: depende || null,
    };
    const tabela = supabaseNavegador().from("recorrencias");
    const { error } = inicial ? await tabela.update(linha).eq("id", inicial.id) : await tabela.insert({ ...linha, criada_por: euId });
    if (error) return setErro("não consegui guardar. confere os campos e tenta de novo.");
    onFim();
  }

  return (
    <form className="bloco" style={{ gap: 8 }} onSubmit={salvar}>
      <input className="campo" placeholder="tarefa que se repete" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
      <input className="campo" placeholder="objetivo (opcional)" value={objetivo} onChange={(e) => setObjetivo(e.target.value)} />
      <input className="campo" placeholder="definição de pronto" value={pronto} onChange={(e) => setPronto(e.target.value)} />
      <div className="linha">
        <select className="campo filtro" value={frequencia} onChange={(e) => setFrequencia(e.target.value as Frequencia)} aria-label="frequência">
          {Object.entries(ROTULO_FREQUENCIA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className="m-meta">por período <input className="campo" type="number" min={1} max={14} style={{ width: 64 }} value={quantidade} onChange={(e) => setQuantidade(Number(e.target.value))} /></label>
        <select className="campo filtro" value={prazo} onChange={(e) => setPrazo(e.target.value)} aria-label="vence em">
          {DIAS_NA_SEMANA.map((d) => <option key={d} value={d}>vence na {NOME_DIA[d]}</option>)}
          <option value="ultimo_dia_util">vence no último dia útil</option>
        </select>
      </div>
      <div className="linha">
        <select className="campo filtro" value={dono} onChange={(e) => setDono(e.target.value)} aria-label="dono padrão">
          <option value="">sem dono padrão</option>
          {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome.toLowerCase()}</option>)}
        </select>
        <select className="campo filtro" value={prioridade} onChange={(e) => setPrioridade(e.target.value)} aria-label="prioridade">
          <option value="alta">alta</option><option value="media">média</option><option value="baixa">baixa</option>
        </select>
        <select className="campo filtro" value={depende} onChange={(e) => setDepende(e.target.value)} aria-label="depende de">
          <option value="">não depende de outra</option>
          {outras.map((o) => <option key={o.id} value={o.id}>depende de: {o.titulo}</option>)}
        </select>
      </div>
      <input className="campo" placeholder="variações que se alternam, separadas por vírgula (opcional)" value={variacoes} onChange={(e) => setVariacoes(e.target.value)} />
      {erro && <p className="erro" role="alert">{erro}</p>}
      <div className="linha"><button className="btn acento">guardar</button><button type="button" className="btn sutil" onClick={onFim}>voltar sem guardar</button></div>
    </form>
  );
}
