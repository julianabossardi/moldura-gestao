"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/client";
import type { Metrica } from "@/lib/metricas";
import type { Integracoes } from "@/lib/sinais";
import { camposDoProximo, ordenarMarcos, type Marco } from "@/lib/marcos";
import { Gaveta } from "../Gaveta";

type Props = { projetoId: string; marcos: Marco[]; metricas: Metrica[]; integracoes: Integracoes };

// marcos da linha do tempo, números digitados à mão (os "sql" vêm do job diário) e integrações
export function EditarProjeto({ projetoId, marcos: marcosIniciais, metricas, integracoes }: Props) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [marcos, setMarcos] = useState<Marco[]>(ordenarMarcos(marcosIniciais));
  const mudarMarco = (k: number, campo: Partial<Marco>) => setMarcos((ms) => ms.map((x, j) => (j === k ? { ...x, ...campo } : x)));
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
    const limpos = ordenarMarcos(marcos.filter((x) => x.titulo.trim()).map((x) => ({ ...x, titulo: x.titulo.trim(), data: x.data || null })));
    await supabaseNavegador().from("projetos").update({ marcos: limpos, ...camposDoProximo(limpos), metricas: novas, integracoes: novasIntegracoes }).eq("id", projetoId);
    setSalvando(false);
    setAberto(false);
    router.refresh();
  }

  return (
    <>
      <button className="btn sutil" onClick={() => setAberto(true)}>editar</button>
      {aberto && (
        <Gaveta titulo="editar projeto" onFechar={() => setAberto(false)}>
            <span className="m-small">marcos</span>
            {marcos.map((x, k) => (
              <div className="linha" key={k}>
                <input className="campo" style={{ flex: 2, minWidth: 140 }} placeholder="nome do marco" value={x.titulo} onChange={(e) => mudarMarco(k, { titulo: e.target.value })} />
                <input className="campo" style={{ flex: 1, minWidth: 130 }} type="date" value={x.data ?? ""} onChange={(e) => mudarMarco(k, { data: e.target.value || null })} />
                <label className="linha" style={{ gap: 6 }}><input type="checkbox" checked={x.feito} onChange={(e) => mudarMarco(k, { feito: e.target.checked })} /><span className="m-small">feito</span></label>
              </div>
            ))}
            <button className="btn sutil" style={{ justifySelf: "start" }} onClick={() => setMarcos([...marcos, { titulo: "", data: null, feito: false }])}>adicionar marco</button>
            <p className="m-meta" style={{ margin: 0 }}>para tirar um marco da linha, apague o nome dele.</p>
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
        </Gaveta>
      )}
    </>
  );
}
