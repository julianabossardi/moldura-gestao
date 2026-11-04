"use client";
import { useState } from "react";
import { supabaseNavegador } from "@/lib/supabase/client";
import { Icone } from "./Icone";

// foguinho e estrela: dá para clicar quantas vezes quiser. cada clique fica guardado
export function BotoesReacao({ itemId, euId, foguinho, estrela }: { itemId: string; euId: string; foguinho: number; estrela: number }) {
  const [n, setN] = useState({ foguinho, estrela });
  async function reagir(e: React.MouseEvent, tipo: "foguinho" | "estrela") {
    e.stopPropagation();
    setN((x) => ({ ...x, [tipo]: x[tipo] + 1 }));
    const { error } = await supabaseNavegador().from("reacoes").insert({ item_id: itemId, pessoa_id: euId, tipo });
    if (error) setN((x) => ({ ...x, [tipo]: x[tipo] - 1 }));
  }
  return (
    <span className="reacoes" onClick={(e) => e.stopPropagation()}>
      <button type="button" className="reacao" onClick={(e) => reagir(e, "foguinho")} aria-label={`foguinho, ${n.foguinho}`}>
        <Icone nome="foguinho" tam={16} /> {n.foguinho > 0 && <span className="m-mono">{n.foguinho}</span>}
      </button>
      <button type="button" className="reacao" onClick={(e) => reagir(e, "estrela")} aria-label={`estrela, ${n.estrela}`}>
        <Icone nome="estrela" tam={16} /> {n.estrela > 0 && <span className="m-mono">{n.estrela}</span>}
      </button>
    </span>
  );
}
