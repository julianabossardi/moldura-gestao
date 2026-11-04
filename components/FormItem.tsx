"use client";
import { useState } from "react";
import { supabaseNavegador } from "@/lib/supabase/client";
import { IssoPodeAjudar } from "./IssoPodeAjudar";
import { Icone } from "./Icone";

export type ItemEditavel = {
  id?: string;
  tipo: string;
  titulo: string;
  corpo: string | null;
  objetivo?: string | null;
  definicao_pronto?: string | null;
  projeto_id: string | null;
  responsavel_id: string | null;
  prioridade: string | null;
  prazo: string | null;
  visivel_cliente: boolean;
  status?: string;
  origem?: string;
};

type Props = {
  item: ItemEditavel;
  autorId: string;
  projetos: { id: string; nome: string }[];
  pessoas: { id: string; nome: string }[];
  onSalvo: () => void;
};

const TIPOS = ["tarefa", "ideia", "reflexao", "referencia", "decisao", "entrega"];
const NOMES: Record<string, string> = { reflexao: "reflexão", referencia: "referência", decisao: "decisão" };

// edição manual de qualquer item. tarefa tem objetivo e definição de pronto; o resto, um texto livre
export function FormItem({ item, autorId, projetos, pessoas, onSalvo }: Props) {
  const [f, setF] = useState(item);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const novo = !item.id;
  const tarefa = f.tipo === "tarefa";
  const campo = <K extends keyof ItemEditavel>(k: K, v: ItemEditavel[K]) => setF((x) => ({ ...x, [k]: v }));

  // na interface, prioridade é só "importante ou não". alta vira estrela; tirar a estrela volta para média
  const ehImportante = f.prioridade === "alta";
  const alternarImportante = () => campo("prioridade", ehImportante ? "media" : "alta");

  async function salvar(extra: Partial<ItemEditavel> = {}) {
    if (!f.titulo.trim()) return setErro("falta um título.");
    setSalvando(true);
    const supabase = supabaseNavegador();
    const dados = {
      tipo: f.tipo,
      titulo: f.titulo.trim(),
      corpo: f.corpo || null,
      objetivo: tarefa ? f.objetivo || null : null,
      definicao_pronto: tarefa ? f.definicao_pronto || null : null,
      projeto_id: f.projeto_id || null,
      responsavel_id: tarefa ? f.responsavel_id || null : null,
      prioridade: tarefa ? f.prioridade || "media" : null,
      prazo: f.prazo || null,
      visivel_cliente: f.visivel_cliente,
      ...extra,
    };
    const { data: salvo, error } = novo
      ? await supabase.from("itens").insert({ ...dados, autor_id: autorId, origem: "manual" }).select("id").single()
      : await supabase.from("itens").update(dados).eq("id", item.id!).select("id").single();
    setSalvando(false);
    if (error) return setErro("não deu para salvar. tenta de novo.");
    // o embedding é gerado ao criar ou editar; sem provedor, a plataforma segue sem busca por sentido
    if (salvo) fetch(`/api/itens/${salvo.id}/embedding`, { method: "POST" }).catch(() => {});
    onSalvo();
  }

  return (
    <div className="form-item">
      <label className="rotulo-campo">título
        <input className="campo" value={f.titulo} onChange={(e) => campo("titulo", e.target.value)} autoFocus />
      </label>
      {tarefa && <IssoPodeAjudar itemId={item.id} texto={f.titulo} />}

      {tarefa ? (
        <>
          <label className="rotulo-campo">objetivo
            <textarea className="campo" rows={2} placeholder="para que serve esta tarefa" value={f.objetivo ?? ""} onChange={(e) => campo("objetivo", e.target.value)} />
          </label>
          <label className="rotulo-campo">definição de pronto
            <textarea className="campo" rows={2} placeholder="como saber que acabou" value={f.definicao_pronto ?? ""} onChange={(e) => campo("definicao_pronto", e.target.value)} />
          </label>
          {f.corpo && (
            <label className="rotulo-campo">anotações
              <textarea className="campo" rows={3} value={f.corpo ?? ""} onChange={(e) => campo("corpo", e.target.value)} />
            </label>
          )}
        </>
      ) : (
        <label className="rotulo-campo">texto
          <textarea className="campo" rows={5} value={f.corpo ?? ""} onChange={(e) => campo("corpo", e.target.value)} />
        </label>
      )}

      <div className="grade2">
        <label className="rotulo-campo">tipo
          <select className="campo" value={f.tipo} onChange={(e) => campo("tipo", e.target.value)}>
            {TIPOS.map((t) => <option key={t} value={t}>{NOMES[t] ?? t}</option>)}
          </select>
        </label>
        <label className="rotulo-campo">projeto
          <select className="campo" value={f.projeto_id ?? ""} onChange={(e) => campo("projeto_id", e.target.value || null)}>
            <option value="">solto</option>
            {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </label>
      </div>
      {tarefa && (
        <div className="grade2">
          <label className="rotulo-campo">responsável
            <select className="campo" value={f.responsavel_id ?? ""} onChange={(e) => campo("responsavel_id", e.target.value || null)}>
              <option value="">sem responsável</option>
              {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </label>
          <div className="rotulo-campo">importante
            <button type="button" className="chip" aria-pressed={ehImportante} onClick={alternarImportante}>
              <Icone nome="estrela" tam={16} /> {ehImportante ? "importante" : "marcar como importante"}
            </button>
          </div>
        </div>
      )}
      <label className="rotulo-campo">prazo
        <input className="campo" type="date" value={f.prazo ?? ""} onChange={(e) => campo("prazo", e.target.value || null)} />
      </label>
      <label className="linha" style={{ gap: 8 }}>
        <input type="checkbox" checked={f.visivel_cliente} onChange={(e) => campo("visivel_cliente", e.target.checked)} />
        <span className="m-small">mostrar ao cliente</span>
      </label>

      {erro && <p className="erro">{erro}</p>}
      <div className="linha" style={{ justifyContent: "space-between", marginTop: 8 }}>
        <button className="btn" disabled={salvando} onClick={() => salvar()}>salvar</button>
        {!novo && f.status !== "arquivada" && (
          <button className="btn sutil" disabled={salvando} onClick={() => salvar({ status: "arquivada" })}>arquivar</button>
        )}
      </div>
    </div>
  );
}
