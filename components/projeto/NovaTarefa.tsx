"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gaveta } from "../Gaveta";
import { FormItem } from "../FormItem";
import { Icone } from "../Icone";

// botão do cabeçalho do projeto. criar tarefa é aqui, e "é recorrente?" abre os campos de repetição
export function NovaTarefa({ projetoId, euId, projetos, pessoas, recorrentes }: {
  projetoId: string; euId: string; projetos: { id: string; nome: string }[]; pessoas: { id: string; nome: string }[];
  recorrentes: { id: string; titulo: string; projeto_id: string }[];
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button className="btn" onClick={() => setAberto(true)}><Icone nome="mais-branco" /> nova tarefa</button>
      {aberto && (
        <Gaveta titulo="nova tarefa" onFechar={() => setAberto(false)}>
          <FormItem
            item={{ tipo: "tarefa", titulo: "", corpo: null, objetivo: null, definicao_pronto: null, projeto_id: projetoId, responsavel_id: euId, prioridade: "media", prazo: null, visivel_cliente: false }}
            autorId={euId}
            projetos={projetos}
            pessoas={pessoas}
            recorrentes={recorrentes}
            onSalvo={() => { setAberto(false); router.refresh(); }}
          />
        </Gaveta>
      )}
    </>
  );
}
