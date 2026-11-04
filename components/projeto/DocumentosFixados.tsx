"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/client";
import { ehRapido, normalizarUrl, type LinkProjeto } from "@/lib/links";

// documentos de trabalho do projeto (os links rápidos ficam em "como estamos")
export function DocumentosFixados({ projetoId, links }: { projetoId: string; links: LinkProjeto[] }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [url, setUrl] = useState("");
  const [aberto, setAberto] = useState(false);
  const documentos = links.filter((l) => !ehRapido(l));

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    const novo = { titulo: titulo.trim() || url.trim(), url: normalizarUrl(url), tipo: "documento" };
    await supabaseNavegador().from("projetos").update({ links: [...links, novo] }).eq("id", projetoId);
    setTitulo(""); setUrl(""); setAberto(false);
    router.refresh();
  }

  return (
    <section className="bloco">
      <div className="linha" style={{ justifyContent: "space-between" }}>
        <h2>documentos fixados</h2>
        <button className="btn sutil" onClick={() => setAberto(!aberto)}>adicionar documento</button>
      </div>
      {aberto && (
        <form className="linha" onSubmit={adicionar}>
          <input className="campo" style={{ flex: 1, minWidth: 140 }} placeholder="título" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          <input className="campo" style={{ flex: 2, minWidth: 200 }} placeholder="link" value={url} onChange={(e) => setUrl(e.target.value)} />
          <button className="btn">fixar</button>
        </form>
      )}
      {documentos.length ? documentos.map((l, i) => (
        <a key={i} className="item" href={l.url} target="_blank" rel="noreferrer"><span>{l.titulo}</span><span className="m-meta">abrir</span></a>
      )) : <p className="aviso">nenhum documento fixado ainda.</p>}
    </section>
  );
}
