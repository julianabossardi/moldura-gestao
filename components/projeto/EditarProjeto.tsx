"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/client";
import type { Metrica } from "@/lib/metricas";

type Props = { projetoId: string; marco: string | null; marcoEm: string | null; metricas: Metrica[] };

// próximo marco e números digitados à mão (os números "sql" vêm do job diário)
export function EditarProjeto({ projetoId, marco, marcoEm, metricas }: Props) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [m, setM] = useState(marco ?? "");
  const [data, setData] = useState(marcoEm ?? "");
  const [valores, setValores] = useState<Record<number, string>>({});
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    const hoje = new Date().toISOString().slice(0, 10);
    const novas = metricas.map((x, i) => {
      if (x.fonte !== "manual" || valores[i] === undefined || valores[i] === "") return x;
      const valor = Number(valores[i]);
      return { ...x, valor, historico: [...(x.historico ?? []).filter((h) => h.data !== hoje), { data: hoje, valor }].slice(-60) };
    });
    await supabaseNavegador().from("projetos").update({ proximo_marco: m || null, proximo_marco_em: data || null, metricas: novas }).eq("id", projetoId);
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
                ) : (
                  <span className="m-meta">{x.fonte === "sql" ? "lido todo dia pelo job" : "chega na fase 6"}{x.erro ? ` · erro: ${x.erro}` : ""}</span>
                )}
              </label>
            ))}
            <button className="btn" disabled={salvando} onClick={salvar}>salvar</button>
          </aside>
        </>
      )}
    </>
  );
}
