"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/client";
import { DIAS_SPRINT, type Sprint } from "@/lib/sprint";

const curta = (iso: string) => new Date(iso + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");

type Props = {
  projetoId: string;
  sprint: Sprint;
  objetivos: Record<string, string>;
  editavel: boolean;
  children: React.ReactNode; // as tarefas da sprint, montadas no servidor
};

// a sprint quinzenal do projeto: número, régua dos 14 dias, objetivo e as tarefas que cabem nela
export function SprintAtual({ projetoId, sprint, objetivos, editavel, children }: Props) {
  const router = useRouter();
  const objetivo = objetivos[String(sprint.numero)] ?? "";
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(objetivo);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    await supabaseNavegador().from("projetos")
      .update({ sprint_objetivos: { ...objetivos, [String(sprint.numero)]: texto.trim() } })
      .eq("id", projetoId);
    setSalvando(false);
    setEditando(false);
    router.refresh();
  }

  return (
    <section className="bloco sprint">
      <div className="sprint-topo">
        <h2>sprint {sprint.numero}</h2>
        <span className="m-mono">
          {curta(sprint.inicio)} a {curta(sprint.fim)} · {sprint.comecou
            ? `dia ${sprint.dia} de ${DIAS_SPRINT} · ${sprint.restam === 0 ? "último dia" : `faltam ${sprint.restam} ${sprint.restam === 1 ? "dia" : "dias"}`}`
            : "ainda não começou"}
        </span>
      </div>

      <div className="regua" role="img" aria-label={`dia ${sprint.dia} de ${DIAS_SPRINT}`}>
        {Array.from({ length: DIAS_SPRINT }, (_, i) => (
          <span key={i} className={`regua-dia ${i + 1 < sprint.dia ? "passou" : ""} ${i + 1 === sprint.dia ? "hoje" : ""}`} />
        ))}
      </div>

      {editando ? (
        <form className="linha sprint-objetivo" onSubmit={salvar}>
          <input className="campo" autoFocus value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="o que precisa estar pronto no fim desta sprint" />
          <button className="btn" disabled={salvando}>{salvando ? "salvando" : "salvar"}</button>
          <button type="button" className="btn sutil" onClick={() => { setTexto(objetivo); setEditando(false); }}>cancelar</button>
        </form>
      ) : (
        <div className="linha sprint-objetivo">
          <span className="rotulo">objetivo</span>
          {objetivo ? <span className="m-lead">{objetivo}</span> : <span className="aviso">sem objetivo ainda.</span>}
          {editavel && <button className="btn sutil" onClick={() => setEditando(true)}>{objetivo ? "editar" : "definir objetivo"}</button>}
        </div>
      )}

      {children}
    </section>
  );
}
