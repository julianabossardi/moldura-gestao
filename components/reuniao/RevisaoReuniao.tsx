"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PropostaReuniao } from "@/lib/reuniao/tipos";

type Props = {
  id: string;
  proposta: PropostaReuniao;
  projetos: Record<string, string>; // slug -> nome
  titulos: Record<string, string>; // item_id -> título atual
};

// uma lista por projeto, cada linha com caixa marcada e editável no lugar
export function RevisaoReuniao({ id, proposta: inicial, projetos, titulos }: Props) {
  const router = useRouter();
  const [p, setP] = useState(inicial);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  type Lista = "novas" | "atualizacoes" | "decisoes" | "ideias";
  const mudar = (b: number, lista: Lista, n: number, campos: Record<string, unknown>) =>
    setP((x) => ({
      ...x,
      projetos: x.projetos.map((bl, bi) => (bi !== b ? bl : { ...bl, [lista]: (bl[lista] as object[]).map((it, k) => (k === n ? { ...it, ...campos } : it)) })),
    }));

  const marcadas = p.projetos.reduce((s, b) => s + [...b.novas, ...b.atualizacoes, ...b.decisoes, ...b.ideias].filter((x) => x.incluido !== false).length, 0);
  const total = p.projetos.reduce((s, b) => s + b.novas.length + b.atualizacoes.length + b.decisoes.length + b.ideias.length, 0);

  async function aprovar() {
    setEnviando(true);
    setErro("");
    const r = await fetch(`/api/reunioes/${id}/aprovar`, { method: "POST", body: JSON.stringify({ proposta: p }) });
    if (!r.ok) {
      setEnviando(false);
      return setErro("não deu para aprovar agora. tenta de novo.");
    }
    router.refresh();
  }

  const Caixa = ({ marcada, onChange }: { marcada: boolean; onChange: (v: boolean) => void }) => (
    <input type="checkbox" checked={marcada} onChange={(e) => onChange(e.target.checked)} aria-label="incluir" />
  );

  return (
    <section className="bloco" style={{ gap: "var(--m-space-6)" }}>
      {p.resumo && (
        <div className="vidro quieto">
          <span className="m-meta">resumo</span>
          <p className="m-body" style={{ margin: "4px 0 0", whiteSpace: "pre-line" }}>{p.resumo}</p>
        </div>
      )}

      {p.projetos.map((b, bi) => (
        <div className="bloco" key={bi}>
          <h2>{b.projeto_slug ? projetos[b.projeto_slug] ?? b.projeto_slug : "soltos"}</h2>

          {b.novas.map((n, k) => (
            <label className="linha-revisao" key={`n${k}`}>
              <Caixa marcada={n.incluido !== false} onChange={(v) => mudar(bi, "novas", k, { incluido: v })} />
              <span className="selo">nova tarefa</span>
              <input className="campo" value={n.titulo} onChange={(e) => mudar(bi, "novas", k, { titulo: e.target.value })} />
              <span className="m-meta">{[n.responsavel, n.prioridade].filter(Boolean).join(" · ")}</span>
            </label>
          ))}
          {b.atualizacoes.map((u, k) => (
            <label className="linha-revisao" key={`a${k}`}>
              <Caixa marcada={u.incluido !== false} onChange={(v) => mudar(bi, "atualizacoes", k, { incluido: v })} />
              <span className="selo">atualiza</span>
              <span style={{ flex: 1 }}>{titulos[u.item_id] ?? u.item_id}</span>
              <span className="m-meta">{u.campo}:</span>
              <input className="campo" style={{ maxWidth: 160 }} value={u.valor} onChange={(e) => mudar(bi, "atualizacoes", k, { valor: e.target.value })} />
            </label>
          ))}
          {b.decisoes.map((d, k) => (
            <label className="linha-revisao" key={`d${k}`}>
              <Caixa marcada={d.incluido !== false} onChange={(v) => mudar(bi, "decisoes", k, { incluido: v })} />
              <span className="selo">decisão</span>
              <input className="campo" value={d.titulo} onChange={(e) => mudar(bi, "decisoes", k, { titulo: e.target.value })} />
            </label>
          ))}
          {b.ideias.map((d, k) => (
            <label className="linha-revisao" key={`i${k}`}>
              <Caixa marcada={d.incluido !== false} onChange={(v) => mudar(bi, "ideias", k, { incluido: v })} />
              <span className="selo">ideia</span>
              <input className="campo" value={d.titulo} onChange={(e) => mudar(bi, "ideias", k, { titulo: e.target.value })} />
            </label>
          ))}
        </div>
      ))}

      {!total && <p className="aviso">a IA não achou nada para guardar nesta reunião.</p>}
      {erro && <p className="erro">{erro}</p>}
      <div><button className="btn acento" disabled={enviando} onClick={aprovar}>
        {enviando ? "aprovando…" : marcadas === total ? "aprovar tudo" : `aprovar ${marcadas} de ${total}`}
      </button></div>
    </section>
  );
}
