"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/client";

type Props = {
  projetoId: string;
  nome: string;
  tarefas: { id: string; titulo: string }[];
  outros: { id: string; nome: string }[];
};

// antes de arquivar, pergunta em lote o que fazer com cada tarefa aberta
export function ArquivarProjeto({ projetoId, nome, tarefas, outros }: Props) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [decisoes, setDecisoes] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  async function arquivar() {
    setSalvando(true);
    const lista = tarefas.map((t) => {
      const d = decisoes[t.id] ?? "arquivar";
      return d.startsWith("mover:") ? { item_id: t.id, acao: "mover", projeto_id: d.slice(6) } : { item_id: t.id, acao: "arquivar" };
    });
    await supabaseNavegador().rpc("arquivar_projeto", { p_id: projetoId, decisoes: lista });
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <button className="btn sutil" onClick={() => setAberto(true)}>arquivar projeto</button>
      {aberto && (
        <>
          <div className="veu" onClick={() => setAberto(false)} />
          <aside className="painel vidro" role="dialog" aria-label={`arquivar ${nome}`}>
            <h2 className="m-h4" style={{ margin: 0 }}>arquivar {nome}</h2>
            <p className="m-meta" style={{ margin: 0 }}>
              nada é apagado. o projeto sai da navegação e das sugestões, e ideias e referências continuam na memória.
            </p>
            {tarefas.length > 0 ? (
              <>
                <p className="m-small" style={{ margin: 0 }}>{tarefas.length} {tarefas.length === 1 ? "tarefa aberta" : "tarefas abertas"}. o que fazer com cada uma?</p>
                {tarefas.map((t) => (
                  <label className="rotulo-campo" key={t.id}>
                    <span style={{ color: "var(--m-ink)" }}>{t.titulo}</span>
                    <select className="campo" value={decisoes[t.id] ?? "arquivar"} onChange={(e) => setDecisoes({ ...decisoes, [t.id]: e.target.value })}>
                      <option value="arquivar">arquivar</option>
                      {outros.map((o) => <option key={o.id} value={`mover:${o.id}`}>mover para {o.nome}</option>)}
                    </select>
                  </label>
                ))}
              </>
            ) : (
              <p className="aviso">nenhuma tarefa aberta.</p>
            )}
            <div className="linha" style={{ justifyContent: "space-between" }}>
              <button className="btn acento" disabled={salvando} onClick={arquivar}>{salvando ? "arquivando…" : "arquivar"}</button>
              <button className="btn sutil" onClick={() => setAberto(false)}>voltar</button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
