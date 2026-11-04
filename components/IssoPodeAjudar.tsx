"use client";
import { useEffect, useState } from "react";

type Ajuda = { id: string; titulo: string; tipo: string; url: string | null };

// memória que reaparece: até 3 itens parecidos, num bloco discreto. fechar é um toque e não fica registrado
export function IssoPodeAjudar({ itemId, texto }: { itemId?: string; texto?: string }) {
  const [ajudas, setAjudas] = useState<Ajuda[]>([]);
  const [fechadas, setFechadas] = useState<string[]>([]);

  useEffect(() => {
    let vivo = true;
    const t = setTimeout(async () => {
      try {
        const r = await fetch("/api/ajudas", { method: "POST", body: JSON.stringify({ item_id: itemId, texto }) });
        const j = await r.json();
        if (vivo) setAjudas(j.ajudas ?? []);
      } catch { /* sem rede: o bloco simplesmente não aparece */ }
    }, 600);
    return () => { vivo = false; clearTimeout(t); };
  }, [itemId, texto]);

  const visiveis = ajudas.filter((a) => !fechadas.includes(a.id));
  if (!visiveis.length) return null;
  const nome = (t: string) => ({ reflexao: "reflexão", referencia: "referência", decisao: "decisão" } as Record<string, string>)[t] ?? t;

  return (
    <aside className="ajuda" aria-label="isso pode ajudar">
      <span className="m-meta">isso pode ajudar</span>
      {visiveis.map((a) => (
        <div className="ajuda-item" key={a.id}>
          {a.url ? <a href={a.url} target="_blank" rel="noreferrer">{a.titulo}</a> : <span>{a.titulo}</span>}
          <span className="m-meta">{nome(a.tipo)}</span>
          <button type="button" className="ajuda-fechar" aria-label="fechar sugestão" onClick={() => setFechadas([...fechadas, a.id])}>×</button>
        </div>
      ))}
    </aside>
  );
}
