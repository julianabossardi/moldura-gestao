"use client";
import { useEffect } from "react";

// gaveta na lateral direita: é onde abrem os detalhes de tudo (tarefa, entrega, reunião, memória)
export function Gaveta({ titulo, onFechar, children }: { titulo: string; onFechar: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onFechar]);
  return (
    <>
      <div className="veu" onClick={onFechar} />
      <aside className="painel vidro gaveta" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="linha" style={{ justifyContent: "space-between" }}>
          <span className="m-meta">{titulo}</span>
          <button className="btn sutil" onClick={onFechar}>fechar</button>
        </div>
        {children}
      </aside>
    </>
  );
}
