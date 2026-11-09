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
  titulo?: string; // padrão: "todas as suas tarefas"
  semNova?: boolean; // na página de outra pessoa não se cria tarefa por aqui
};

const FILTROS = [
  { status: "aberta", rotulo: "a fazer" },
  { status: "fazendo", rotulo: "em andamento" },
  { status: "concluida", rotulo: "feitas" },
  { status: "arquivada", rotulo: "canceladas" },
] as const;

// o backlog: tudo que está com você (ou sem responsável), separado por status.
// feitas e canceladas mostram só os últimos 30 dias; abrir a tarefa deixa desfazer ou reabrir
export function TarefasAbertas({ tarefas, projetos, pessoas, autorId, projetoDoDia, titulo = "todas as suas tarefas", semNova }: Props) {
  const [novo, setNovo] = useState<ItemEditavel | null>(null);
  const [filtro, setFiltro] = useState<string>("aberta");
  const daVez = tarefas.filter((t) => t.status === filtro);
  const grupos = [...projetos, { id: "", nome: "soltas" }]
    .map((p) => ({ ...p, lista: daVez.filter((t) => (t.projeto_id ?? "") === p.id) }))
    .filter((g) => g.lista.length);

  return (
    <section className="bloco">
      <div className="linha" style={{ justifyContent: "space-between" }}>
        <h2>{titulo}</h2>
        {!semNova && <button className="btn sutil" onClick={() => setNovo({
          tipo: "tarefa", titulo: "", corpo: null, objetivo: null, definicao_pronto: null, projeto_id: projetoDoDia,
          responsavel_id: autorId, prioridade: "media", prazo: null, visivel_cliente: false,
        })}><Icone nome="mais" /> nova</button>}
      </div>
      <div className="linha filtros-status" role="group" aria-label="status">
        {FILTROS.map((f) => {
          const n = tarefas.filter((t) => t.status === f.status).length;
          return (
            <button key={f.status} className="chip" aria-pressed={filtro === f.status} onClick={() => setFiltro(f.status)}>
              {f.rotulo} <span className="m-mono">{n}</span>
            </button>
          );
        })}
      </div>
      {grupos.length ? grupos.map((g) => (
        <div key={g.id || "soltas"} className="bloco">
          <span className="m-small">{g.nome.toLowerCase()}</span>
          <div className="grade-cartoes">{g.lista.map((t) => <CartaoItem key={t.id} item={t} euId={autorId} />)}</div>
        </div>
      )) : <p className="aviso">nenhuma tarefa aqui.</p>}
      {novo && <PainelItem item={novo} autorId={autorId} projetos={projetos} pessoas={pessoas} onFechar={() => setNovo(null)} />}
    </section>
  );
}
