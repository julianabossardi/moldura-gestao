"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/client";
import { Icone } from "./Icone";

type Tarefa = { id: string; titulo: string; corpo: string | null; prazo: string | null };

// as tarefas em que a cliente é responsável (aprovar uma tela, mandar conteúdo): só dá para concluir
export function TarefasCliente({ tarefas, prazos }: { tarefas: Tarefa[]; prazos: Record<string, string> }) {
  const router = useRouter();
  const [feitas, setFeitas] = useState<string[]>([]);
  const [erro, setErro] = useState("");

  async function concluir(id: string) {
    setErro("");
    const { error } = await supabaseNavegador().from("itens").update({ status: "concluida" }).eq("id", id);
    if (error) return setErro("não deu para concluir agora. tenta de novo.");
    setFeitas((f) => [...f, id]);
    router.refresh();
  }

  const abertas = tarefas.filter((t) => !feitas.includes(t.id));
  if (!abertas.length) return <p className="aviso">nada pendente com você. obrigada!</p>;
  return (
    <>
      {abertas.map((t) => (
        <div className="vidro quieto linha" style={{ justifyContent: "space-between" }} key={t.id}>
          <div>
            <div className="m-lead">{t.titulo}</div>
            {t.corpo && <div className="m-meta">{t.corpo}</div>}
            {t.prazo && <div className="m-mono">até {prazos[t.id]}</div>}
          </div>
          <button className="btn" onClick={() => concluir(t.id)}><Icone nome="check-branco" /> concluir</button>
        </div>
      ))}
      {erro && <p className="erro">{erro}</p>}
    </>
  );
}
