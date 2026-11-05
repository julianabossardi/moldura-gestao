"use client";
import { useEffect, useRef, useState } from "react";
import { haQuanto } from "@/lib/datas";
import { useDetalheOpcional } from "./ProvedorDetalhe";
import { Avatar } from "./Avatar";

export type Notificacao = { id: string; item_id: string; quem: string | null; verbo: string; titulo: string; em: string };

const CHAVE = "notificacoes-vistas-em";

// sininho do cabeçalho: lista o que as outras fizeram. o "novo" é guardado só neste aparelho
export function Notificacoes({ lista }: { lista: Notificacao[] }) {
  const [aberta, setAberta] = useState(false);
  const [vistasEm, setVistasEm] = useState<string | null>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const detalhe = useDetalheOpcional();

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- storage só existe no navegador
      setVistasEm(localStorage.getItem(CHAVE) ?? "");
    } catch { setVistasEm(""); }
  }, []);
  useEffect(() => {
    if (!aberta) return;
    const fora = (e: MouseEvent) => { if (!caixa.current?.contains(e.target as Node)) setAberta(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberta(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", fora); document.removeEventListener("keydown", esc); };
  }, [aberta]);

  const novas = vistasEm === null ? 0 : lista.filter((n) => n.em > vistasEm).length;

  function alternar() {
    const abrir = !aberta;
    setAberta(abrir);
    if (abrir && lista[0]) {
      try { localStorage.setItem(CHAVE, lista[0].em); } catch { /* ignora */ }
    } else if (!abrir && lista[0]) {
      setVistasEm(lista[0].em);
    }
  }

  return (
    <div className="notificacoes" ref={caixa}>
      <button type="button" className="notificacoes-botao" onClick={alternar} aria-expanded={aberta} aria-label={`notificações${novas ? `, ${novas} novas` : ""}`}>
        notificações{novas > 0 && <span className="notificacoes-conta m-mono">{novas}</span>}
      </button>
      {aberta && (
        <div className="notificacoes-painel" role="dialog" aria-label="notificações">
          <span className="m-small">o que a equipe fez nos últimos 7 dias</span>
          {lista.length ? (
            <ul>
              {lista.map((n) => (
                <li key={n.id}>
                  <button type="button" className={`notificacao ${vistasEm !== null && n.em > vistasEm ? "nova" : ""}`}
                    onClick={() => { setAberta(false); detalhe?.abrir(n.item_id); }} disabled={!detalhe}>
                    <Avatar nome={n.quem} tam={48} />
                    <span><strong>{(n.quem ?? "alguém").split(" ")[0].toLowerCase()}</strong> {n.verbo} {n.titulo}</span>
                    <span className="m-mono">{haQuanto(n.em)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="aviso">nada novo por enquanto.</p>
          )}
        </div>
      )}
    </div>
  );
}
