"use client";
import type { Novidade } from "@/lib/novidades";
import { haQuanto } from "@/lib/datas";
import { useDetalhe } from "./ProvedorDetalhe";
import { Avatar } from "./Avatar";

const ROTULO: Record<Novidade["categoria"], string> = {
  entrega: "entrega", feita: "feita", referencia: "referência", ideia: "ideia", decisao: "decisão", tarefa: "tarefa",
};

// feed de novidades: quem fez o quê, com a categoria em mono. clicar abre o item na gaveta
export function Novidades({ itens, mostrarProjeto = true, vazio }: { itens: Novidade[]; mostrarProjeto?: boolean; vazio: string }) {
  const { abrir } = useDetalhe();
  if (!itens.length) return <p className="aviso">{vazio}</p>;
  return (
    <ul className="novidades">
      {itens.map((n) => (
        <li key={n.id}>
          <button type="button" className="novidade" onClick={() => abrir(n.item_id)}>
            <Avatar nome={n.quem} tam={48} />
            <span className="novidade-frase">
              <strong>{(n.quem ?? "alguém").split(" ")[0].toLowerCase()}</strong> {n.verbo} <span className="novidade-titulo">{n.titulo}</span>
              {mostrarProjeto && n.projeto && <span className="novidade-projeto"> · {n.projeto.toLowerCase()}</span>}
            </span>
            <span className="novidade-dado">
              <span className={`categoria categoria-${n.categoria}`}>{ROTULO[n.categoria]}</span>
              <span className="m-mono">{haQuanto(n.em)}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
