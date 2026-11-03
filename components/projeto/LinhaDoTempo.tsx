"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/client";
import { camposDoProximo, ordenarMarcos, type Marco } from "@/lib/marcos";
import { Icone } from "../Icone";

// marcos do projeto numa linha do tempo: dá para ir para trás e para a frente; abre no próximo marco
export function LinhaDoTempo({ projetoId, marcos: inicial, editavel }: { projetoId: string; marcos: Marco[]; editavel: boolean }) {
  const router = useRouter();
  const [marcos, setMarcos] = useState(ordenarMarcos(inicial));
  const proximo = Math.max(0, marcos.findIndex((m) => !m.feito));
  const [i, setI] = useState(marcos.findIndex((m) => !m.feito) === -1 ? marcos.length - 1 : proximo);
  const atual = marcos[i];
  const data = (d: string | null) => (d ? new Date(d + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "sem data");

  async function alternarFeito() {
    const novos = marcos.map((m, k) => (k === i ? { ...m, feito: !m.feito } : m));
    setMarcos(novos);
    await supabaseNavegador().from("projetos").update({ marcos: novos, ...camposDoProximo(novos) }).eq("id", projetoId);
    router.refresh();
  }

  return (
    <div className="linha-tempo">
      <div className="trilha" role="list">
        {marcos.map((m, k) => (
          <button
            key={k}
            role="listitem"
            className={`ponto ${m.feito ? "feito" : ""} ${k === proximo && !m.feito ? "proximo" : ""} ${k === i ? "atual" : ""}`}
            onClick={() => setI(k)}
            aria-label={`${m.titulo}, ${data(m.data)}${m.feito ? ", feito" : ""}`}
            aria-current={k === i}
          >
            <span className="bolinha" />
            <span className="m-mono">{data(m.data)}</span>
          </button>
        ))}
      </div>
      {atual && (
        <div className="vidro quieto linha" style={{ justifyContent: "space-between" }}>
          <button className="btn sutil" disabled={i === 0} onClick={() => setI(i - 1)} aria-label="marco anterior">‹</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span className="m-meta">{atual.feito ? "feito" : i === proximo ? "próximo marco" : i < proximo ? "ficou para trás" : "mais adiante"}</span>
            <div className="m-lead">{atual.titulo}</div>
            <span className="m-mono">{data(atual.data)}</span>
          </div>
          {editavel && <button className="chip" aria-pressed={atual.feito} onClick={alternarFeito}><Icone nome="check" /> {atual.feito ? "feito" : "marcar como feito"}</button>}
          <button className="btn sutil" disabled={i === marcos.length - 1} onClick={() => setI(i + 1)} aria-label="próximo marco">›</button>
        </div>
      )}
    </div>
  );
}
