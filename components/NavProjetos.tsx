"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/client";

type P = { id: string; slug: string; nome: string };

// navegação entre projetos. arrastar muda a ordem de prioridade, que alimenta o projeto do dia
export function NavProjetos({ ativos, arquivados, atual }: { ativos: P[]; arquivados: P[]; atual?: string }) {
  const router = useRouter();
  const [lista, setLista] = useState(ativos);
  const [sobre, setSobre] = useState<number | null>(null);
  const origem = useRef<number | null>(null);

  async function soltar(destino: number) {
    const de = origem.current;
    origem.current = null;
    setSobre(null);
    if (de === null || de === destino) return;
    const nova = [...lista];
    nova.splice(destino, 0, nova.splice(de, 1)[0]);
    setLista(nova);
    const supabase = supabaseNavegador();
    await Promise.all(nova.map((p, i) => supabase.from("projetos").update({ ordem_prioridade: i + 1 }).eq("id", p.id)));
    router.refresh();
  }

  async function reativar(id: string) {
    await supabaseNavegador().rpc("reativar_projeto", { p_id: id });
    router.refresh();
  }

  return (
    <nav className="nav-projetos" aria-label="projetos">
      <div className="linha">
        <Link href="/" className="chip" aria-current={!atual ? "page" : undefined} aria-pressed={!atual}>início</Link>
        {lista.map((p, i) => (
          <Link
            key={p.id}
            href={`/projetos/${p.slug}`}
            className={`chip arrastavel ${sobre === i ? "sobre" : ""}`}
            aria-pressed={atual === p.slug}
            draggable
            onDragStart={() => (origem.current = i)}
            onDragOver={(e) => { e.preventDefault(); setSobre(i); }}
            onDragLeave={() => setSobre(null)}
            onDrop={() => soltar(i)}
            title="arraste para mudar a prioridade"
          >
            <span className="m-mono">{i + 1}</span> {p.nome}
          </Link>
        ))}
      </div>
      {arquivados.length > 0 && (
        <details className="arquivados">
          <summary>projetos arquivados ({arquivados.length})</summary>
          {arquivados.map((p) => (
            <div className="item" key={p.id}>
              <Link href={`/projetos/${p.slug}`}>{p.nome}</Link>
              <button className="btn sutil" onClick={() => reativar(p.id)}>reativar</button>
            </div>
          ))}
        </details>
      )}
    </nav>
  );
}
