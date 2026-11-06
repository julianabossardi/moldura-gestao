"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PropostaReuniao } from "@/lib/reuniao/tipos";
import type { Conferencia } from "@/lib/reuniao/passo2";

type Props = {
  id: string;
  proposta: PropostaReuniao;
  conferencia: Conferencia | null; // o que o código conferiu (não é opinião do modelo)
  erroPasso2: string | null;
  projetos: Record<string, string>; // slug -> nome
  titulos: Record<string, string>; // item_id -> título atual
};

// uma lista por projeto, cada linha com caixa marcada e editável no lugar
export function RevisaoReuniao({ id, proposta: inicial, conferencia, erroPasso2, projetos, titulos }: Props) {
  const router = useRouter();
  const [p, setP] = useState(inicial);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  type Lista = "novas" | "atualizacoes" | "decisoes" | "ideias" | "ja_feitas";
  const mudar = (b: number, lista: Lista, n: number, campos: Record<string, unknown>) =>
    setP((x) => ({
      ...x,
      projetos: x.projetos.map((bl, bi) => (bi !== b ? bl : { ...bl, [lista]: (bl[lista] as object[]).map((it, k) => (k === n ? { ...it, ...campos } : it)) })),
    }));

  // desdobramento de decisão vira tarefa nova no mesmo projeto, sem dono, para a pessoa completar
  const virarTarefa = (b: number, k: number, n: number) =>
    setP((x) => ({
      ...x,
      projetos: x.projetos.map((bl, bi) => {
        if (bi !== b) return bl;
        const texto = bl.decisoes[k].desdobramentos[n];
        return {
          ...bl,
          novas: [...bl.novas, { tipo: "tarefa", titulo: texto, corpo: null, responsavel: null, prioridade: null, trecho: bl.decisoes[k].trecho ?? null, dono_origem: null, incluido: true }],
          decisoes: bl.decisoes.map((d, di) => (di !== k ? d : { ...d, desdobramentos: d.desdobramentos.filter((_, j) => j !== n) })),
        };
      }),
    }));

  const marcadas = p.projetos.reduce((s, b) => s + [...b.novas, ...b.atualizacoes, ...b.decisoes, ...b.ideias, ...b.ja_feitas].filter((x) => x.incluido !== false).length, 0);
  const total = p.projetos.reduce((s, b) => s + b.novas.length + b.atualizacoes.length + b.decisoes.length + b.ideias.length + b.ja_feitas.length, 0);

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

      {erroPasso2 && (
        <p className="aviso" role="status">o cruzamento com o contexto não rodou ({erroPasso2}). esta é a leitura direta da transcrição.</p>
      )}
      {conferencia && <ConferenciaCodigo c={conferencia} />}
      {p.notas.length > 0 && (
        <details className="vidro quieto">
          <summary className="m-small">notas do modelo ({p.notas.length}), podem não bater com a conferência</summary>
          <ul className="m-small" style={{ margin: "8px 0 0", paddingLeft: 18 }}>{p.notas.map((n, i) => <li key={i}>{n}</li>)}</ul>
        </details>
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
              {n.responsavel && n.dono_origem === "papel" && <span className="selo" title="a fala não disse quem faz; o dono veio do papel de cada uma">dono sugerido pelo papel</span>}
              <Trecho texto={n.trecho} />
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
              <Trecho texto={d.trecho} />
              {d.desdobramentos.length > 0 && (
                <div style={{ flexBasis: "100%", paddingLeft: 28, display: "grid", gap: 4 }}>
                  <span className="m-meta">costuma sair daqui (sugestão, não é tarefa):</span>
                  {d.desdobramentos.map((t, n) => (
                    <span className="linha" key={n} style={{ gap: 8 }}>
                      <span className="m-small">{t}</span>
                      <button type="button" className="btn sutil" onClick={(e) => { e.preventDefault(); virarTarefa(bi, k, n); }}>virar tarefa</button>
                    </span>
                  ))}
                </div>
              )}
            </label>
          ))}
          {b.ideias.map((d, k) => (
            <label className="linha-revisao" key={`i${k}`}>
              <Caixa marcada={d.incluido !== false} onChange={(v) => mudar(bi, "ideias", k, { incluido: v })} />
              <span className="selo">ideia</span>
              <input className="campo" value={d.titulo} onChange={(e) => mudar(bi, "ideias", k, { titulo: e.target.value })} />
              <Trecho texto={d.trecho} />
            </label>
          ))}
        </div>
      ))}

      {p.projetos.some((b) => b.ja_feitas.length) && (
        <div className="bloco">
          <h2>já estava feito</h2>
          <p className="m-meta" style={{ margin: 0 }}>apareceu na conversa, mas o contexto diz que já foi feito. entra como tarefa concluída, a menos que o banco já tenha uma igual.</p>
          {p.projetos.flatMap((b, bi) => b.ja_feitas.map((j, k) => (
            <label className="linha-revisao" key={`f${bi}-${k}`}>
              <Caixa marcada={(j as { incluido?: boolean }).incluido !== false} onChange={(v) => mudar(bi, "ja_feitas", k, { incluido: v })} />
              <span className="selo">já feito</span>
              <span>{j.titulo}</span>
              <span className="m-meta">{b.projeto_slug ? projetos[b.projeto_slug] ?? b.projeto_slug : "soltos"}</span>
              <Trecho texto={j.trecho} />
            </label>
          )))}
        </div>
      )}

      {!total && <p className="aviso">a IA não achou nada para guardar nesta reunião.</p>}
      {erro && <p className="erro">{erro}</p>}
      <div><button className="btn acento" disabled={enviando} onClick={aprovar}>
        {enviando ? "aprovando…" : marcadas === total ? "aprovar tudo" : `aprovar ${marcadas} de ${total}`}
      </button></div>
    </section>
  );
}

// o que a pessoa disse na reunião, como prova de onde o item veio
function Trecho({ texto }: { texto?: string | null }) {
  if (!texto) return null;
  return <span className="m-meta" style={{ flexBasis: "100%", paddingLeft: 28, fontStyle: "italic" }}>disse: “{texto}”</span>;
}

// conferência feita pelo código. mostra só o que achou; se não achou nada, uma linha só
function ConferenciaCodigo({ c }: { c: Conferencia }) {
  const blocos: [string, string[]][] = [
    ["trechos que não existem na transcrição (apagados)", c.trechos_apagados],
    ["tarefas em prioridade alta fora do folga", c.altas_fora],
    ["mesma tarefa para donos diferentes (separadas, com o nome no título)", c.mesmo_titulo],
    ["o que mudou em relação à leitura direta", c.mudou],
  ];
  const achou = blocos.filter(([, l]) => l.length);
  if (!achou.length) return <p className="m-meta" style={{ margin: 0 }}>conferência do código: nada a apontar.</p>;
  return (
    <details className="vidro quieto" open={achou.some(([t]) => !t.startsWith("o que mudou"))}>
      <summary className="m-small">conferência do código ({achou.reduce((s, [, l]) => s + l.length, 0)})</summary>
      {achou.map(([titulo, lista]) => (
        <div key={titulo} style={{ marginTop: 8 }}>
          <span className="m-meta">{titulo}</span>
          <ul className="m-small" style={{ margin: "2px 0 0", paddingLeft: 18 }}>{lista.map((l, i) => <li key={i}>{l}</li>)}</ul>
        </div>
      ))}
    </details>
  );
}
