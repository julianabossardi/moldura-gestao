"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/client";
import { TIPOS_LINK, ehRapido, normalizarUrl, type LinkProjeto } from "@/lib/links";
import { Icone } from "../Icone";

// acesso rápido ao que está no ar: site publicado, app, homologação, repositório, design
export function LinksRapidos({ projetoId, links, extras }: { projetoId: string; links: LinkProjeto[]; extras: LinkProjeto[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [url, setUrl] = useState("");
  const [tipo, setTipo] = useState("site");
  const rapidos = [...links.filter(ehRapido), ...extras];

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    const novo = { titulo: titulo.trim() || TIPOS_LINK[tipo], url: normalizarUrl(url), tipo };
    await supabaseNavegador().from("projetos").update({ links: [...links, novo] }).eq("id", projetoId);
    setTitulo(""); setUrl(""); setAberto(false);
    router.refresh();
  }

  return (
    <section className="bloco links-rapidos">
      <div className="linha">
        {rapidos.map((l, k) => (
          <a key={k} className="link-rapido" href={l.url} target="_blank" rel="noreferrer">
            <span className="m-meta">{TIPOS_LINK[l.tipo ?? ""] ?? "link"}</span>
            <span className="m-small">{l.titulo}</span>
          </a>
        ))}
        <button className="btn sutil" onClick={() => setAberto(!aberto)}><Icone nome="mais" /> {rapidos.length ? "link" : "adicionar links rápidos"}</button>
      </div>
      {aberto && (
        <form className="linha" onSubmit={adicionar}>
          <select className="campo filtro" value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="tipo de link">
            {Object.entries(TIPOS_LINK).filter(([k]) => k !== "documento").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input className="campo" style={{ flex: 1, minWidth: 140 }} placeholder="nome (opcional)" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          <input className="campo" style={{ flex: 2, minWidth: 200 }} placeholder="endereço" value={url} onChange={(e) => setUrl(e.target.value)} />
          <button className="btn">fixar</button>
        </form>
      )}
    </section>
  );
}
