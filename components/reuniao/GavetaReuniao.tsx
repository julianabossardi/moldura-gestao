"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseNavegador } from "@/lib/supabase/client";
import { ROTULO_STATUS } from "@/lib/reuniao/tipos";
import { Gaveta } from "../Gaveta";
import { LinhaClicavel } from "../LinhaClicavel";

type Reuniao = { id: string; data: string; status: string; resumo: string | null };
type Encaminhamento = { id: string; tipo: string; titulo: string; projeto: { nome: string } | null };

// lista das reuniões anteriores; cada uma abre na gaveta lateral com resumo e encaminhamentos
export function ReunioesAnteriores({ reunioes }: { reunioes: Reuniao[] }) {
  const [aberta, setAberta] = useState<Reuniao | null>(null);
  const data = (d: string) => new Date(d + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  return (
    <section className="bloco">
      <h2>reuniões anteriores</h2>
      {reunioes.map((h) => (
        <button key={h.id} type="button" className="item item-botao" onClick={() => setAberta(h)}>
          <span>{data(h.data)}</span>
          <span className="m-meta">{ROTULO_STATUS[h.status as keyof typeof ROTULO_STATUS]}</span>
        </button>
      ))}
      {aberta && <DetalheReuniao reuniao={aberta} titulo={data(aberta.data)} onFechar={() => setAberta(null)} />}
    </section>
  );
}

function DetalheReuniao({ reuniao, titulo, onFechar }: { reuniao: Reuniao; titulo: string; onFechar: () => void }) {
  const [itens, setItens] = useState<Encaminhamento[] | null>(null);
  useEffect(() => {
    supabaseNavegador().from("itens").select("id, tipo, titulo, projeto:projetos(nome)").eq("reuniao_id", reuniao.id).order("criado_em")
      .then(({ data }) => setItens((data ?? []) as unknown as Encaminhamento[]));
  }, [reuniao.id]);
  const porProjeto = Object.entries((itens ?? []).reduce<Record<string, Encaminhamento[]>>((acc, i) => {
    const k = i.projeto?.nome ?? "soltos";
    (acc[k] ??= []).push(i);
    return acc;
  }, {}));
  const TIPO: Record<string, string> = { tarefa: "tarefa", decisao: "decisão", ideia: "ideia" };
  return (
    <Gaveta titulo={`reunião de ${titulo}`} onFechar={onFechar}>
      <span className="m-meta">{ROTULO_STATUS[reuniao.status as keyof typeof ROTULO_STATUS]}</span>
      {reuniao.resumo && <p className="m-body" style={{ margin: 0, whiteSpace: "pre-line" }}>{reuniao.resumo}</p>}
      <h3 className="m-lead" style={{ margin: 0 }}>encaminhamentos</h3>
      {itens === null ? <p className="aviso">carregando…</p> : porProjeto.length ? porProjeto.map(([nome, lista]) => (
        <div key={nome}>
          <span className="m-small">{nome}</span>
          {lista.map((i) => <LinhaClicavel key={i.id} id={i.id}><span>{i.titulo}</span><span className="m-meta">{TIPO[i.tipo] ?? i.tipo}</span></LinhaClicavel>)}
        </div>
      )) : <p className="aviso">nenhum encaminhamento guardado nesta reunião.</p>}
      <Link href={`/reuniao/${reuniao.id}`} className="btn sutil" style={{ justifySelf: "start" }}>abrir a reunião completa</Link>
    </Gaveta>
  );
}
