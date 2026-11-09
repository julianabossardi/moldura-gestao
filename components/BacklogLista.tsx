"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/client";
import { useDetalhe } from "./ProvedorDetalhe";
import { FaxinaFluxo } from "./FaxinaFluxo";
import { Avatar } from "./Avatar";
import { Icone } from "./Icone";

export type LinhaBacklog = {
  id: string; titulo: string; corpo: string | null; prioridade: string | null; prazo: string | null; status: string;
  projeto_id: string | null; projeto: string | null; responsavel_id: string | null; responsavel: string | null;
  recorrente: boolean; dias: number;
};

const FAIXAS = [
  { valor: 0, rotulo: "todas" },
  { valor: 7, rotulo: "paradas há mais de 7 dias" },
  { valor: 14, rotulo: "mais de 14 dias" },
  { valor: 30, rotulo: "mais de 30 dias" },
  { valor: 60, rotulo: "mais de 60 dias" },
];

// o backlog inteiro numa lista só, da mais parada para a mais nova. dá para filtrar, marcar várias e arquivar de uma vez,
// ou passar uma por uma (priorizar, arquivar) como na antiga faxina. nada é apagado: arquivar só muda o status
export function BacklogLista({ linhas, projetos, pessoas }: {
  linhas: LinhaBacklog[]; projetos: { id: string; nome: string }[]; pessoas: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const { abrir } = useDetalhe();
  const [projeto, setProjeto] = useState("");
  const [pessoa, setPessoa] = useState("");
  const [faixa, setFaixa] = useState(0);
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [resolvidas, setResolvidas] = useState<Set<string>>(new Set());
  const [renovadas, setRenovadas] = useState<Set<string>>(new Set());
  const [umPorVez, setUmPorVez] = useState(false);
  const [ocupada, setOcupada] = useState(false);

  const restantes = useMemo(() => linhas.filter((l) => !resolvidas.has(l.id)), [linhas, resolvidas]);
  const visiveis = useMemo(
    () => restantes.filter((l) => (!projeto || l.projeto_id === projeto) && (!pessoa || (pessoa === "__sem" ? !l.responsavel_id : l.responsavel_id === pessoa)) && l.dias >= faixa),
    [restantes, projeto, pessoa, faixa],
  );
  const contar = (min: number) => restantes.filter((l) => l.dias >= min).length;
  const marcadasVisiveis = visiveis.filter((l) => marcadas.has(l.id));

  const alternar = (id: string) => setMarcadas((m) => { const n = new Set(m); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const resolver = (ids: string[]) => {
    setResolvidas((r) => new Set([...r, ...ids]));
    setMarcadas((m) => new Set([...m].filter((x) => !ids.includes(x))));
    router.refresh();
  };

  async function mudar(ids: string[], dados: Record<string, unknown>) {
    setOcupada(true);
    const { error } = await supabaseNavegador().from("itens").update(dados).in("id", ids);
    setOcupada(false);
    if (!error) resolver(ids);
  }
  const arquivar = (ids: string[]) => mudar(ids, { status: "arquivada" });
  const feita = (id: string) => mudar([id], { status: "concluida" });
  // "ainda vale": conta como movimento (o banco atualiza a data ao salvar) e a tarefa volta a ser nova na lista
  const aindaVale = async (id: string) => {
    setOcupada(true);
    const { error } = await supabaseNavegador().from("itens").update({ parada_em: null }).eq("id", id);
    setOcupada(false);
    if (error) return;
    setRenovadas((r) => new Set([...r, id]));
    router.refresh();
  };

  function arquivarMarcadas() {
    const ids = marcadasVisiveis.map((l) => l.id);
    if (!ids.length) return;
    if (window.confirm(`arquivar ${ids.length} ${ids.length === 1 ? "tarefa" : "tarefas"}? elas saem do backlog, nada é apagado e dá para reabrir.`)) arquivar(ids);
  }
  const marcarParadasHa = (min: number) => setMarcadas(new Set(visiveis.filter((l) => l.dias >= min).map((l) => l.id)));

  if (umPorVez) {
    return (
      <>
        <div className="linha"><button className="btn sutil" onClick={() => { setUmPorVez(false); router.refresh(); }}>voltar para a lista</button></div>
        <FaxinaFluxo paradas={visiveis.map((l) => ({ id: l.id, titulo: l.titulo, corpo: l.corpo, projeto: l.projeto, dias: l.dias }))} />
      </>
    );
  }

  return (
    <>
      <div className="linha" style={{ gap: 8 }}>
        <span className="chip">{restantes.length} em aberto</span>
        <span className="chip">{contar(30)} paradas há mais de 30 dias</span>
        <span className="chip">{contar(14)} há mais de 14</span>
      </div>

      <div className="bloco" style={{ gap: 8 }}>
        <div className="linha">
          <select className="campo filtro" value={faixa} onChange={(e) => setFaixa(Number(e.target.value))} aria-label="tempo parada">
            {FAIXAS.map((f) => <option key={f.valor} value={f.valor}>{f.rotulo}</option>)}
          </select>
          <select className="campo filtro" value={projeto} onChange={(e) => setProjeto(e.target.value)} aria-label="projeto">
            <option value="">todos os projetos</option>
            {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome.toLowerCase()}</option>)}
          </select>
          <select className="campo filtro" value={pessoa} onChange={(e) => setPessoa(e.target.value)} aria-label="pessoa">
            <option value="">todas as pessoas</option>
            {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome.toLowerCase()}</option>)}
            <option value="__sem">sem responsável</option>
          </select>
        </div>
        <div className="linha">
          <button className="btn sutil" onClick={() => marcarParadasHa(30)}>marcar as de mais de 30 dias</button>
          <button className="btn sutil" onClick={() => setMarcadas(new Set(visiveis.map((l) => l.id)))}>marcar todas</button>
          {marcadas.size > 0 && <button className="btn sutil" onClick={() => setMarcadas(new Set())}>desmarcar</button>}
          <button className="btn" disabled={ocupada || !marcadasVisiveis.length} onClick={arquivarMarcadas}>arquivar {marcadasVisiveis.length || ""} {marcadasVisiveis.length === 1 ? "marcada" : "marcadas"}</button>
          <button className="btn sutil" disabled={!visiveis.length} onClick={() => setUmPorVez(true)}>limpar uma por vez</button>
        </div>
      </div>

      {visiveis.length === 0 ? (
        <div className="vidro quieto"><p className="m-body" style={{ margin: 0 }}>{restantes.length ? "nada com esses filtros." : "backlog limpo. nada em aberto."}</p></div>
      ) : (
        <section className="bloco" style={{ gap: 0 }}>
          {visiveis.map((l) => {
            const dias = renovadas.has(l.id) ? 0 : l.dias;
            return (
              <div key={l.id} className="item" style={{ alignItems: "center", gap: 10 }}>
                <input type="checkbox" checked={marcadas.has(l.id)} onChange={() => alternar(l.id)} aria-label={`marcar ${l.titulo}`} />
                <Avatar nome={l.responsavel} tam={48} />
                <button type="button" className="btn sutil" style={{ flex: 1, textAlign: "left", justifyContent: "flex-start" }} onClick={() => abrir(l.id)}>
                  <span className="m-body">{l.titulo}</span>
                  <span className="m-meta" style={{ display: "block" }}>
                    {[l.projeto, l.responsavel?.toLowerCase() ?? "sem responsável", l.prioridade === "alta" ? "importante" : null, l.status === "fazendo" ? "em andamento" : null, l.recorrente ? "repete" : null, l.prazo ? `até ${l.prazo.split("-").reverse().slice(0, 2).join("/")}` : null].filter(Boolean).join(" · ")}
                  </span>
                </button>
                <span className={dias >= 30 ? "selo" : "m-mono"} title="tempo sem movimento">{dias === 0 ? "hoje" : `${dias} ${dias === 1 ? "dia" : "dias"}`}</span>
                <span className="linha" style={{ flexWrap: "nowrap" }}>
                  <button className="btn sutil" disabled={ocupada} onClick={() => aindaVale(l.id)} title="manter: conta como movimento">ainda vale</button>
                  <button className="btn sutil" disabled={ocupada} onClick={() => feita(l.id)}><Icone nome="check" /> feita</button>
                  <button className="btn sutil" disabled={ocupada} onClick={() => arquivar([l.id])}>arquivar</button>
                </span>
              </div>
            );
          })}
        </section>
      )}
    </>
  );
}
