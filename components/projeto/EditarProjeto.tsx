"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/client";
import type { Metrica } from "@/lib/metricas";
import type { Integracoes } from "@/lib/sinais";

type Props = { projetoId: string; marco: string | null; marcoEm: string | null; metricas: Metrica[]; integracoes: Integracoes };

// próximo marco e números digitados à mão (os números "sql" vêm do job diário)
export function EditarProjeto({ projetoId, marco, marcoEm, metricas, integracoes }: Props) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [m, setM] = useState(marco ?? "");
  const [data, setData] = useState(marcoEm ?? "");
  const [valores, setValores] = useState<Record<number, string>>({});
  const [propriedades, setPropriedades] = useState<Record<number, string>>({});
  const [github, setGithub] = useState(integracoes.github ?? "");
  const [vercelId, setVercelId] = useState(integracoes.vercel?.projeto_id ?? "");
  const [vercelTime, setVercelTime] = useState(integracoes.vercel?.time_id ?? "");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    const hoje = new Date().toISOString().slice(0, 10);
    const novas = metricas.map((x, i) => {
      if (x.fonte === "ga4" && propriedades[i] !== undefined) return { ...x, propriedade: propriedades[i].trim() || null };
      if (x.fonte !== "manual" || valores[i] === undefined || valores[i] === "") return x;
      const valor = Number(valores[i]);
      return { ...x, valor, historico: [...(x.historico ?? []).filter((h) => h.data !== hoje), { data: hoje, valor }].slice(-60) };
    });
    const novasIntegracoes: Integracoes = {
      ...(github.trim() && { github: github.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "") }),
      ...(vercelId.trim() && { vercel: { projeto_id: vercelId.trim(), ...(vercelTime.trim() && { time_id: vercelTime.trim() }) } }),
    };
    await supabaseNavegador().from("projetos").update({ proximo_marco: m || null, proximo_marco_em: data || null, metricas: novas, integracoes: novasIntegracoes }).eq("id", projetoId);
    setSalvando(false);
    setAberto(false);
    router.refresh();
  }

  return (
    <>
      <button className="btn sutil" onClick={() => setAberto(true)}>editar</button>
      {aberto && (
        <>
          <div className="veu" onClick={() => setAberto(false)} />
          <aside className="painel vidro" role="dialog" aria-label="editar projeto">
            <div className="linha" style={{ justifyContent: "space-between" }}>
              <h2 className="m-h4" style={{ margin: 0 }}>editar projeto</h2>
              <button className="btn sutil" onClick={() => setAberto(false)}>fechar</button>
            </div>
            <label className="rotulo-campo">próximo marco
              <input className="campo" value={m} onChange={(e) => setM(e.target.value)} placeholder="deixe vazio para esconder" />
            </label>
            <label className="rotulo-campo">data do marco
              <input className="campo" type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </label>
            {metricas.map((x, i) => (
              <label className="rotulo-campo" key={i}>
                {x.rotulo} <span className="m-mono">({x.fonte})</span>
                {x.fonte === "manual" ? (
                  <input className="campo" type="number" defaultValue={x.valor ?? 0} onChange={(e) => setValores({ ...valores, [i]: e.target.value })} />
                ) : x.fonte === "ga4" ? (
                  <input className="campo" placeholder="id numérico da propriedade do GA4" defaultValue={x.propriedade ?? ""} onChange={(e) => setPropriedades({ ...propriedades, [i]: e.target.value })} />
                ) : (
                  <span className="m-meta">lido todo dia pelo job{x.erro ? ` · erro: ${x.erro}` : ""}</span>
                )}
              </label>
            ))}
            <span className="m-small" style={{ marginTop: 8 }}>sinais do código</span>
            <label className="rotulo-campo">repositório no GitHub
              <input className="campo" placeholder="dono/repositório" value={github} onChange={(e) => setGithub(e.target.value)} />
            </label>
            <div className="grade2">
              <label className="rotulo-campo">projeto na Vercel (id)
                <input className="campo" value={vercelId} onChange={(e) => setVercelId(e.target.value)} />
              </label>
              <label className="rotulo-campo">time na Vercel (id)
                <input className="campo" value={vercelTime} onChange={(e) => setVercelTime(e.target.value)} />
              </label>
            </div>
            <button className="btn" disabled={salvando} onClick={salvar}>salvar</button>
          </aside>
        </>
      )}
    </>
  );
}
