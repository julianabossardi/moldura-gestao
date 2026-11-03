"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Destino } from "@/lib/ia/schemas";

type Props = { id: string; destinos: Destino[]; titulosExistentes: Record<string, string>; de?: string };

export function CartaoConfirmacao({ id, destinos: inicial, titulosExistentes, de }: Props) {
  const router = useRouter();
  const [destinos, setDestinos] = useState(inicial);
  const [editando, setEditando] = useState<number | null>(null);
  const [ocupada, setOcupada] = useState(false);

  async function enviar(corpo: { destinos: Destino[]; recusar?: boolean }) {
    setOcupada(true);
    await fetch(`/api/capturas/${id}/confirmar`, { method: "POST", body: JSON.stringify(corpo) });
    router.refresh();
  }
  const editar = (i: number, campo: Partial<Destino>) =>
    setDestinos((d) => d.map((x, j) => (j === i ? { ...x, ...campo } : x)));

  const descricao = (d: Destino) => {
    const onde = d.projeto_slug ? ` no ${d.projeto_slug}` : "";
    if (d.acao === "atualizar") return `atualiza: ${titulosExistentes[d.item_id ?? ""] ?? d.titulo}`;
    const nome = { tarefa: "nova tarefa", ideia: "ideia", reflexao: "reflexão", referencia: "referência", decisao: "decisão", entrega: "entrega" }[d.tipo];
    return `${nome}${onde}: ${d.titulo}`;
  };

  return (
    <div className="vidro quieto">
      <div className="linha" style={{ justifyContent: "space-between" }}>
        <span className="m-small">{de ? `${de} (cliente) mandou algo. a moldura entendeu assim` : "a moldura entendeu assim"}</span>
        <button className="btn" disabled={ocupada || !destinos.length} onClick={() => enviar({ destinos })}>confirmar tudo</button>
      </div>
      {destinos.map((d, i) => (
        <div className="destino" key={i}>
          <div className="linha" style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
            <div>
              <div className="m-body">{descricao(d)}</div>
              {d.motivo && <div className="m-meta">{d.motivo}</div>}
            </div>
            <div className="linha" style={{ flexWrap: "nowrap" }}>
              <button className="btn sutil" onClick={() => setEditando(editando === i ? null : i)}>editar</button>
              <button className="btn sutil" onClick={() => setDestinos((x) => x.filter((_, j) => j !== i))}>descartar</button>
            </div>
          </div>
          {editando === i && (
            <>
              <input type="text" value={d.titulo} onChange={(e) => editar(i, { titulo: e.target.value })} />
              <textarea rows={3} value={d.corpo ?? ""} onChange={(e) => editar(i, { corpo: e.target.value })} />
              <select className="campo" value={d.tipo} onChange={(e) => editar(i, { tipo: e.target.value as Destino["tipo"] })}>
                {["tarefa", "ideia", "reflexao", "referencia", "decisao", "entrega"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </>
          )}
        </div>
      ))}
      {!destinos.length && <p className="aviso">nada para guardar. <button className="btn sutil" onClick={() => enviar({ destinos: [], recusar: true })}>fechar</button></p>}
    </div>
  );
}
