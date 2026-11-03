"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Auto = { id: string; titulos: string[]; pulados: number };

// capturas que ficaram 3 dias sem resposta e foram confirmadas sozinhas. dá para desfazer
export function CapturasAutomaticas({ capturas }: { capturas: Auto[] }) {
  const router = useRouter();
  const [feitas, setFeitas] = useState<string[]>([]);
  async function responder(id: string, manter: boolean) {
    setFeitas((f) => [...f, id]);
    await fetch(`/api/capturas/${id}/desfazer`, { method: "POST", body: JSON.stringify({ manter }) });
    router.refresh();
  }
  const lista = capturas.filter((c) => !feitas.includes(c.id));
  if (!lista.length) return null;
  return (
    <section className="bloco">
      <h2>{lista.length === 1 ? "uma captura foi confirmada sozinha" : `${lista.length} capturas foram confirmadas sozinhas`}</h2>
      <p className="m-meta" style={{ margin: 0 }}>ficaram 3 dias esperando e entraram como estavam, para nada se perder.</p>
      {lista.map((c) => (
        <div className="vidro quieto linha" style={{ justifyContent: "space-between" }} key={c.id}>
          <div style={{ minWidth: 0 }}>
            <div className="m-body">{c.titulos.join(" · ") || "sem itens novos"}</div>
            {c.pulados > 0 && <div className="m-meta">{c.pulados === 1 ? "uma atualização ficou de fora" : `${c.pulados} atualizações ficaram de fora`}: confira à mão.</div>}
          </div>
          <span className="linha">
            <button className="btn sutil" onClick={() => responder(c.id, true)}>está certo</button>
            <button className="btn sutil" onClick={() => responder(c.id, false)}>desfazer</button>
          </span>
        </div>
      ))}
    </section>
  );
}
