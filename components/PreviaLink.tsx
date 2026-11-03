"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";

type Previa = { titulo?: string; descricao?: string; imagem?: string; dominio?: string };

export function PreviaLink({ url }: { url: string }) {
  const [p, setP] = useState<Previa>({});
  useEffect(() => {
    let vivo = true;
    fetch(`/api/previa?url=${encodeURIComponent(url)}`).then((r) => r.json()).then((j) => vivo && setP(j)).catch(() => {});
    return () => { vivo = false; };
  }, [url]);
  return (
    <a className="previa" href={url} target="_blank" rel="noreferrer">
      {p.imagem && <img src={p.imagem} alt="" loading="lazy" />}
      <span className="m-meta">{p.dominio ?? new URL(url).hostname.replace(/^www\./, "")}</span>
      {p.titulo && <span className="m-small">{p.titulo}</span>}
      {p.descricao && <span className="m-meta previa-desc">{p.descricao}</span>}
    </a>
  );
}
