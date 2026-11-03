"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/client";

export type ItemEditavel = {
  id?: string;
  tipo: string;
  titulo: string;
  corpo: string | null;
  projeto_id: string | null;
  responsavel_id: string | null;
  prioridade: string | null;
  prazo: string | null;
  visivel_cliente: boolean;
  status?: string;
};

type Props = {
  item: ItemEditavel;
  autorId: string;
  projetos: { id: string; nome: string }[];
  pessoas: { id: string; nome: string }[];
  onFechar: () => void;
};

const TIPOS = ["tarefa", "ideia", "reflexao", "referencia", "decisao", "entrega"];
const NOMES: Record<string, string> = { reflexao: "reflexão", referencia: "referência", decisao: "decisão" };

export function PainelItem({ item, autorId, projetos, pessoas, onFechar }: Props) {
  const router = useRouter();
  const [f, setF] = useState(item);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const novo = !item.id;
  const campo = <K extends keyof ItemEditavel>(k: K, v: ItemEditavel[K]) => setF((x) => ({ ...x, [k]: v }));

  async function salvar(extra: Partial<ItemEditavel> = {}) {
    if (!f.titulo.trim()) return setErro("falta um título.");
    setSalvando(true);
    const supabase = supabaseNavegador();
    const dados = {
      tipo: f.tipo,
      titulo: f.titulo.trim(),
      corpo: f.corpo || null,
      projeto_id: f.projeto_id || null,
      responsavel_id: f.tipo === "tarefa" ? f.responsavel_id || null : null,
      prioridade: f.tipo === "tarefa" ? f.prioridade || "media" : null,
      prazo: f.prazo || null,
      visivel_cliente: f.visivel_cliente,
      ...extra,
    };
    const { error } = novo
      ? await supabase.from("itens").insert({ ...dados, autor_id: autorId, origem: "manual" })
      : await supabase.from("itens").update(dados).eq("id", item.id!);
    setSalvando(false);
    if (error) return setErro("não deu para salvar. tenta de novo.");
    router.refresh();
    onFechar();
  }

  return (
    <>
      <div className="veu" onClick={onFechar} />
      <aside className="painel vidro" role="dialog" aria-label={novo ? "novo item" : "editar item"}>
        <div className="linha" style={{ justifyContent: "space-between" }}>
          <h2 className="m-h4" style={{ margin: 0 }}>{novo ? "novo item" : "editar item"}</h2>
          <button className="btn sutil" onClick={onFechar}>fechar</button>
        </div>

        <label className="rotulo-campo">título
          <input className="campo" value={f.titulo} onChange={(e) => campo("titulo", e.target.value)} autoFocus />
        </label>
        <label className="rotulo-campo">texto
          <textarea className="campo" rows={5} value={f.corpo ?? ""} onChange={(e) => campo("corpo", e.target.value)} />
        </label>
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
        {f.tipo === "tarefa" && (
          <div className="grade2">
            <label className="rotulo-campo">responsável
              <select className="campo" value={f.responsavel_id ?? ""} onChange={(e) => campo("responsavel_id", e.target.value || null)}>
                <option value="">sem responsável</option>
                {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </label>
            <label className="rotulo-campo">prioridade
              <select className="campo" value={f.prioridade ?? "media"} onChange={(e) => campo("prioridade", e.target.value)}>
                <option value="alta">alta</option><option value="media">média</option><option value="baixa">baixa</option>
              </select>
            </label>
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
          {!novo && (
            <span className="linha">
              {f.status !== "concluida" && <button className="btn sutil" disabled={salvando} onClick={() => salvar({ status: "concluida" } as never)}>concluir</button>}
              <button className="btn sutil" disabled={salvando} onClick={() => salvar({ status: "arquivada" } as never)}>arquivar</button>
            </span>
          )}
        </div>
      </aside>
    </>
  );
}
