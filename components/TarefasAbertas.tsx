"use client";
import { useState } from "react";
import { PainelItem, type ItemEditavel } from "./PainelItem";

type Tarefa = ItemEditavel & { id: string };
type Props = {
  tarefas: Tarefa[];
  projetos: { id: string; nome: string }[];
  pessoas: { id: string; nome: string }[];
  autorId: string;
  projetoDoDia: string | null;
};

export function TarefasAbertas({ tarefas, projetos, pessoas, autorId, projetoDoDia }: Props) {
  const [aberto, setAberto] = useState<ItemEditavel | null>(null);
  const novo = (): ItemEditavel => ({
    tipo: "tarefa", titulo: "", corpo: null, projeto_id: projetoDoDia, responsavel_id: autorId,
    prioridade: "media", prazo: null, visivel_cliente: false,
  });

  return (
    <section className="bloco">
      <div className="linha" style={{ justifyContent: "space-between" }}>
        <details style={{ flex: 1 }}>
          <summary>minhas tarefas abertas ({tarefas.length})</summary>
          {[...projetos, { id: "", nome: "soltas" }].map((p) => {
            const lista = tarefas.filter((t) => (t.projeto_id ?? "") === p.id);
            return lista.length ? (
              <div key={p.id || "soltas"} style={{ marginTop: 16 }}>
                <span className="m-meta">{p.nome}</span>
                {lista.map((t) => (
                  <button key={t.id} className="item item-botao" onClick={() => setAberto(t)}>
                    <span>{t.titulo}</span><span className="m-meta">{t.prioridade}</span>
                  </button>
                ))}
              </div>
            ) : null;
          })}
        </details>
        <button className="btn sutil" onClick={() => setAberto(novo())}>nova</button>
      </div>
      {aberto && <PainelItem key={aberto.id ?? "novo"} item={aberto} autorId={autorId} projetos={projetos} pessoas={pessoas} onFechar={() => setAberto(null)} />}
    </section>
  );
}
