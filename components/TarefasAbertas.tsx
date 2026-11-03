"use client";
import { useState } from "react";
import type { ItemCartao } from "@/lib/cartao";
import { PainelItem, type ItemEditavel } from "./PainelItem";
import { CartaoItem } from "./CartaoItem";
import { Icone } from "./Icone";

type Props = {
  tarefas: ItemCartao[];
  projetos: { id: string; nome: string }[];
  pessoas: { id: string; nome: string }[];
  autorId: string;
  projetoDoDia: string | null;
};

// o backlog: tudo que está aberto com você, além das tarefas de agora
export function TarefasAbertas({ tarefas, projetos, pessoas, autorId, projetoDoDia }: Props) {
  const [novo, setNovo] = useState<ItemEditavel | null>(null);
  const grupos = [...projetos, { id: "", nome: "soltas" }]
    .map((p) => ({ ...p, lista: tarefas.filter((t) => (t.projeto_id ?? "") === p.id) }))
    .filter((g) => g.lista.length);

  return (
    <section className="bloco">
      <div className="linha" style={{ justifyContent: "space-between" }}>
        <div>
          <h2>todas as suas tarefas</h2>
          <p className="m-meta" style={{ margin: 0 }}>o que está aberto com você ou sem responsável, além das de agora.</p>
        </div>
        <button className="btn sutil" onClick={() => setNovo({
          tipo: "tarefa", titulo: "", corpo: null, objetivo: null, definicao_pronto: null, projeto_id: projetoDoDia,
          responsavel_id: autorId, prioridade: "media", prazo: null, visivel_cliente: false,
        })}><Icone nome="mais" /> nova</button>
      </div>
      <details className="backlog">
        <summary>{tarefas.length} {tarefas.length === 1 ? "tarefa aberta" : "tarefas abertas"}</summary>
        {grupos.map((g) => (
          <div key={g.id || "soltas"} className="bloco" style={{ marginTop: 16 }}>
            <span className="m-small">{g.nome}</span>
            <div className="grade-cartoes">{g.lista.map((t) => <CartaoItem key={t.id} item={t} euId={autorId} />)}</div>
          </div>
        ))}
      </details>
      {novo && <PainelItem item={novo} autorId={autorId} projetos={projetos} pessoas={pessoas} onFechar={() => setNovo(null)} />}
    </section>
  );
}
