"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/client";

type Parada = { id: string; titulo: string; corpo: string | null; projeto: string | null; dias: number };
type Passo = { titulo: string; minutos_estimados: number; mini_passos: string[]; por_que_agora: string; filho_id?: string };

// uma tarefa parada por vez, com duas saídas: arquivar ou priorizar (que traz o menor primeiro passo)
export function FaxinaFluxo({ paradas }: { paradas: Parada[] }) {
  const router = useRouter();
  // a lista encolhe a cada tarefa resolvida (o servidor tira da faxina), então mostro sempre a primeira que falta
  const [resolvidas, setResolvidas] = useState<string[]>([]);
  const [total] = useState(paradas.length);
  const [ocupada, setOcupada] = useState(false);
  const [passo, setPasso] = useState<{ ok: Passo | null } | null>(null);
  const atual = paradas.find((p) => !resolvidas.includes(p.id));
  const i = resolvidas.length;

  async function resolver(acao: "arquivar" | "priorizar") {
    if (!atual) return;
    setOcupada(true);
    const r = await fetch("/api/faxina", { method: "POST", body: JSON.stringify({ acao, item_id: atual.id }) });
    const j = await r.json();
    setOcupada(false);
    if (acao === "priorizar") return setPasso({ ok: j.passo ?? null });
    seguir();
  }
  function seguir() {
    if (atual) setResolvidas((r) => [...r, atual.id]);
    setPasso(null);
    router.refresh();
  }
  async function comecar() {
    if (passo?.ok?.filho_id) await supabaseNavegador().from("itens").update({ status: "fazendo", recorte_retorno: "aceito" }).eq("id", passo.ok.filho_id);
    router.push("/");
  }

  if (!atual) return <div className="vidro quieto"><p className="m-body" style={{ margin: 0 }}>faxina feita. nada parado na sua lista.</p></div>;

  if (passo) {
    return (
      <div className="vidro recorte">
        <span className="m-meta">{atual?.titulo} subiu para prioridade alta</span>
        {passo.ok ? (
          <>
            <h3 className="m-h4">{passo.ok.titulo}</h3>
            <span className="m-mono">{passo.ok.minutos_estimados} min</span>
            {passo.ok.mini_passos.length > 0 && <ul>{passo.ok.mini_passos.map((p, k) => <li key={k}>{p}</li>)}</ul>}
            {passo.ok.por_que_agora && <p className="m-meta" style={{ margin: 0 }}>{passo.ok.por_que_agora}</p>}
            <div className="acoes"><button className="btn" onClick={comecar}>começar</button><button className="btn sutil" onClick={seguir}>depois</button></div>
          </>
        ) : (
          <>
            <p className="m-body" style={{ margin: 0 }}>não consegui cortar o primeiro passo agora. a tarefa ficou em prioridade alta e aparece nos seus recortes.</p>
            <div className="acoes"><button className="btn" onClick={seguir}>próxima</button></div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="vidro recorte">
      <span className="m-mono">{Math.min(i + 1, total)} de {total}</span>
      <h3 className="m-h3" style={{ margin: 0 }}>{atual.titulo}</h3>
      <span className="m-meta">{[atual.projeto, `parada há ${atual.dias} dias`].filter(Boolean).join(" · ")}</span>
      {atual.corpo && <p className="m-body" style={{ margin: 0 }}>{atual.corpo}</p>}
      <div className="acoes">
        <button className="btn" disabled={ocupada} onClick={() => resolver("priorizar")}>{ocupada ? "pensando…" : "priorizar"}</button>
        <button className="btn sutil" disabled={ocupada} onClick={() => resolver("arquivar")}>arquivar</button>
        <Link href="/" className="btn sutil">deixar para depois</Link>
      </div>
    </div>
  );
}
