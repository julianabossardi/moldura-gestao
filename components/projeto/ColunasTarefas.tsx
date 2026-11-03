"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/client";
import { PainelItem, type ItemEditavel } from "../PainelItem";

type Tarefa = ItemEditavel & { id: string; prazo: string | null };
type Props = {
  tarefas: Tarefa[];
  pessoas: { id: string; nome: string }[];
  projetos: { id: string; nome: string }[];
  autorId: string;
  projetoId: string;
};

const PESO: Record<string, number> = { alta: 0, media: 1, baixa: 2 };

// tarefas abertas em colunas por responsável. arrastar troca o responsável; clicar abre o painel
export function ColunasTarefas({ tarefas, pessoas, projetos, autorId, projetoId }: Props) {
  const router = useRouter();
  const [aberto, setAberto] = useState<ItemEditavel | null>(null);
  const [alvo, setAlvo] = useState<string | null>(null);
  const arrastando = useRef<string | null>(null);

  const colunas = [...pessoas.map((p) => ({ id: p.id, nome: p.nome })), { id: "", nome: "sem responsável" }];
  const ordenar = (a: Tarefa, b: Tarefa) => (PESO[a.prioridade ?? "media"] ?? 1) - (PESO[b.prioridade ?? "media"] ?? 1);

  async function soltar(responsavel: string) {
    const id = arrastando.current;
    arrastando.current = null;
    setAlvo(null);
    if (!id) return;
    await supabaseNavegador().from("itens").update({ responsavel_id: responsavel || null }).eq("id", id);
    router.refresh();
  }

  const novo = (): ItemEditavel => ({
    tipo: "tarefa", titulo: "", corpo: null, projeto_id: projetoId, responsavel_id: autorId,
    prioridade: "media", prazo: null, visivel_cliente: false,
  });

  return (
    <section className="bloco">
      <div className="linha" style={{ justifyContent: "space-between" }}>
        <h2>tarefas abertas</h2>
        <button className="btn sutil" onClick={() => setAberto(novo())}>nova tarefa</button>
      </div>
      <div className="colunas">
        {colunas.map((col) => (
          <div
            key={col.id || "sem"}
            className={`coluna ${alvo === (col.id || "sem") ? "alvo" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setAlvo(col.id || "sem"); }}
            onDragLeave={() => setAlvo(null)}
            onDrop={() => soltar(col.id)}
          >
            <span className="m-small">{col.nome.toLowerCase()}</span>
            {tarefas.filter((t) => (t.responsavel_id ?? "") === col.id).sort(ordenar).map((t) => (
              <button key={t.id} className="cartao-tarefa" draggable onDragStart={() => (arrastando.current = t.id)} onClick={() => setAberto(t)}>
                <span>{t.titulo}</span>
                <span className="m-meta">
                  {t.prioridade}{t.prazo ? ` · ${new Date(t.prazo + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}` : ""}{t.status === "fazendo" ? " · fazendo" : ""}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
      {aberto && <PainelItem key={aberto.id ?? "novo"} item={aberto} autorId={autorId} projetos={projetos} pessoas={pessoas} onFechar={() => setAberto(null)} />}
    </section>
  );
}
