"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/client";
import type { ItemCartao } from "@/lib/cartao";
import { PainelItem, type ItemEditavel } from "../PainelItem";
import { CartaoItem } from "../CartaoItem";
import { Avatar } from "../Avatar";
import { Icone } from "../Icone";

type Props = {
  tarefas: ItemCartao[];
  pessoas: { id: string; nome: string }[];
  projetos: { id: string; nome: string }[];
  clientes: { id: string; nome: string }[];
  autorId: string;
  projetoId: string;
};

const PESO: Record<string, number> = { alta: 0, media: 1, baixa: 2 };

// tarefas abertas em colunas por responsável, em cartões. arrastar troca o responsável; clicar abre os detalhes
export function ColunasTarefas({ tarefas, pessoas, projetos, clientes, autorId, projetoId }: Props) {
  const router = useRouter();
  const [novo, setNovo] = useState<ItemEditavel | null>(null);
  const [alvo, setAlvo] = useState<string | null>(null);
  const arrastando = useRef<string | null>(null);

  const ehCliente = (id: string | null) => !!id && clientes.some((c) => c.id === id);
  // tarefa de cliente fica numa coluna só, com o selo "com o cliente"
  const colunas = [
    ...pessoas.map((p) => ({ id: p.id, nome: p.nome })),
    { id: "", nome: "sem responsável" },
    ...(clientes.length ? [{ id: "__cliente", nome: "com o cliente" }] : []),
  ];
  const daColuna = (colId: string) => tarefas.filter((t) => (colId === "__cliente" ? ehCliente(t.responsavel_id) : (t.responsavel_id ?? "") === colId));
  const ordenar = (a: ItemCartao, b: ItemCartao) => (PESO[a.prioridade ?? "media"] ?? 1) - (PESO[b.prioridade ?? "media"] ?? 1);

  async function soltar(responsavel: string) {
    const id = arrastando.current;
    arrastando.current = null;
    setAlvo(null);
    if (!id) return;
    const destino = responsavel === "__cliente" ? clientes[0]?.id : responsavel || null;
    await supabaseNavegador().from("itens").update({ responsavel_id: destino ?? null }).eq("id", id);
    router.refresh();
  }

  return (
    <section className="bloco">
      <div className="linha" style={{ justifyContent: "space-between" }}>
        <h2>tarefas abertas</h2>
        <button className="btn sutil" onClick={() => setNovo({
          tipo: "tarefa", titulo: "", corpo: null, objetivo: null, definicao_pronto: null, projeto_id: projetoId,
          responsavel_id: autorId, prioridade: "media", prazo: null, visivel_cliente: false,
        })}><Icone nome="mais" /> nova tarefa</button>
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
            <span className="linha" style={{ gap: 8 }}>
              {col.id && col.id !== "__cliente" ? <Avatar nome={col.nome} tam={48} /> : null}
              <span className="m-small">{col.nome.toLowerCase()}</span>
            </span>
            {daColuna(col.id).sort(ordenar).map((t) => (
              <CartaoItem
                key={t.id}
                item={t}
                euId={autorId}
                onDragStart={() => (arrastando.current = t.id)}
                topo={ehCliente(t.responsavel_id) ? <span className="selo">com o cliente</span> : undefined}
              />
            ))}
          </div>
        ))}
      </div>
      {novo && <PainelItem item={novo} autorId={autorId} projetos={projetos} pessoas={[...pessoas, ...clientes.map((c) => ({ id: c.id, nome: `${c.nome} (cliente)` }))]} onFechar={() => setNovo(null)} />}
    </section>
  );
}
