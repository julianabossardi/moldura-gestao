"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/client";
import type { Recorte } from "@/lib/ia/schemas";

type Projeto = { id: string; nome: string };
type Props = { pessoaId: string; projetos: Projeto[]; projetoInicial: string | null; estadosIniciais: string[] };

const TEMPOS = [{ r: "30 min", m: 30 }, { r: "1h", m: 60 }, { r: "2h", m: 120 }, { r: "3h+", m: 180 }];
const ESTADOS = ["leve", "criativa", "focada"];

export function Seletor({ pessoaId, projetos, projetoInicial, estadosIniciais }: Props) {
  const router = useRouter();
  const [projeto, setProjeto] = useState(projetoInicial ?? projetos[0]?.id ?? "");
  const [minutos, setMinutos] = useState(60);
  const [estados, setEstados] = useState<string[]>(estadosIniciais.length ? estadosIniciais : ["focada"]);
  const [quantidade, setQuantidade] = useState<number | "auto">("auto");
  const [recortes, setRecortes] = useState<Recorte[]>([]);
  const [titulos, setTitulos] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(false);
  const [vazio, setVazio] = useState(false);

  const supabase = supabaseNavegador();

  async function gerar(p = projeto, e = estados, t = minutos, q = quantidade) {
    setCarregando(true);
    setVazio(false);
    const r = await fetch("/api/recortes", { method: "POST", body: JSON.stringify({ projeto_id: p, minutos: t, estados: e, quantidade: q }) });
    const j = await r.json();
    setRecortes(j.recortes ?? []);
    setTitulos(j.titulos ?? {});
    setVazio(r.ok && !(j.recortes ?? []).length);
    setCarregando(false);
  }

  async function escolherProjeto(id: string) {
    setProjeto(id);
    await supabase.from("pessoas").update({ projeto_do_dia: id, projeto_do_dia_em: new Date().toISOString().slice(0, 10) }).eq("id", pessoaId);
  }
  async function alternarEstado(s: string) {
    const novo = estados.includes(s) ? estados.filter((x) => x !== s) : [...estados, s];
    if (!novo.length) return;
    setEstados(novo);
    await supabase.from("pessoas").update({ estados: novo }).eq("id", pessoaId);
  }

  async function agir(acao: "comecar" | "outro", r: Recorte) {
    await fetch("/api/recortes/acao", { method: "POST", body: JSON.stringify({ acao, recorte: r, projeto_id: projeto }) });
    if (acao === "comecar") {
      setRecortes([]);
      router.refresh();
    } else {
      setRecortes((x) => x.filter((y) => y !== r));
      gerar();
    }
  }

  return (
    <section className="seletor">
      <div className="vidro">
        <div className="seletor">
          <div className="linha">
            <span className="rotulo">hoje</span>
            {projetos.map((p) => (
              <button key={p.id} className="chip" aria-pressed={projeto === p.id} onClick={() => escolherProjeto(p.id)}>{p.nome}</button>
            ))}
          </div>
          <div className="linha">
            <span className="rotulo">tempo</span>
            {TEMPOS.map((t) => <button key={t.m} className="chip" aria-pressed={minutos === t.m} onClick={() => setMinutos(t.m)}>{t.r}</button>)}
          </div>
          <div className="linha">
            <span className="rotulo">estado</span>
            {ESTADOS.map((s) => <button key={s} className="chip" aria-pressed={estados.includes(s)} onClick={() => alternarEstado(s)}>{s}</button>)}
          </div>
          <div className="linha">
            <span className="rotulo">recortes</span>
            {([1, 2, 3, "auto"] as const).map((q) => <button key={q} className="chip" aria-pressed={quantidade === q} onClick={() => setQuantidade(q)}>{q}</button>)}
          </div>
          <div><button className="btn acento" disabled={carregando || !projeto} onClick={() => gerar()}>{carregando ? "cortando…" : "me dá recortes"}</button></div>
        </div>
      </div>

      {vazio && <p className="aviso">nenhuma tarefa aberta nesse projeto para você. grave algo ou escolha outro projeto.</p>}
      <div className="recortes">
        {recortes.map((r, i) => (
          <article className="vidro recorte" key={i}>
            <span className="m-meta">{titulos[r.pai_id]}</span>
            <h3 className="m-h4">{r.titulo}</h3>
            <span className="m-mono">{r.minutos_estimados} min</span>
            {r.mini_passos.length > 0 && <ul>{r.mini_passos.map((p, j) => <li key={j}>{p}</li>)}</ul>}
            {r.por_que_agora && <p className="m-meta" style={{ margin: 0 }}>{r.por_que_agora}</p>}
            <div className="acoes">
              <button className="btn" onClick={() => agir("comecar", r)}>começar</button>
              <button className="btn sutil" onClick={() => agir("outro", r)}>outro</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
