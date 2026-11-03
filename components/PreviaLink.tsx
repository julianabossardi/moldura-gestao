"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { useDetalhe } from "./ProvedorDetalhe";

type Previa = { titulo?: string; descricao?: string; imagem?: string; dominio?: string };

// cartão de referência com a prévia do link; clicar abre os detalhes na gaveta (o link está lá)
export function PreviaLink({ url, id, titulo }: { url: string; id: string; titulo: string }) {
  const { abrir } = useDetalhe();
  const [p, setP] = useState<Previa>({});
  useEffect(() => {
    let vivo = true;
    fetch(`/api/previa?url=${encodeURIComponent(url)}`).then((r) => r.json()).then((j) => vivo && setP(j)).catch(() => {});
    return () => { vivo = false; };
  }, [url]);
  let dominio = p.dominio;
  try { dominio ??= new URL(url).hostname.replace(/^www\./, ""); } catch { /* link estranho: sem domínio */ }
  return (
    <button type="button" className="previa" onClick={() => abrir(id)}>
      {p.imagem && <img src={p.imagem} alt="" loading="lazy" />}
      <span className="m-meta">{dominio}</span>
      <span className="m-small">{titulo}</span>
      {p.descricao && <span className="m-meta previa-desc">{p.descricao}</span>}
    </button>
  );
}
