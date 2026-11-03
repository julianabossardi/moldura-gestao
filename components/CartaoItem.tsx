"use client";
/* eslint-disable @next/next/no-img-element */
import { atrasada, importante, type ItemCartao } from "@/lib/cartao";
import { useDetalhe } from "./ProvedorDetalhe";
import { Avatar } from "./Avatar";
import { Icone } from "./Icone";
import { BotoesReacao } from "./BotoesReacao";

type Props = {
  item: ItemCartao;
  euId: string;
  destaque?: boolean; // tarefas da sessão: maior e com mais respiro
  mostrarProjeto?: boolean;
  topo?: React.ReactNode; // linha acima do título (ex.: "por que agora")
  rodape?: React.ReactNode; // ações extras (começar, feita)
  onDragStart?: () => void;
};

// o cartão usado em todo lugar: nome, quem é responsável (bonequinho), marcas e reações.
// clicar abre os detalhes na gaveta lateral
export function CartaoItem({ item, euId, destaque, mostrarProjeto, topo, rodape, onDragStart }: Props) {
  const { abrir } = useDetalhe();
  const tarefa = item.tipo === "tarefa";
  const pessoa = tarefa ? item.responsavel : item.autor;
  return (
    <article
      className={`cartao ${destaque ? "destaque" : ""} ${item.status === "fazendo" ? "fazendo" : ""} ${item.status === "concluida" && tarefa ? "feito" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => abrir(item.id)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), abrir(item.id))}
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      aria-label={`abrir ${item.titulo}`}
    >
      {item.imagem && <img className="cartao-img" src={item.imagem} alt="" loading="lazy" />}
      <div className="cartao-marcas">
        {importante(item) && <span title="importante"><Icone nome="estrela" tam={16} /></span>}
        {atrasada(item) && <span title="atrasada" className="marca atrasada"><Icone nome="atrasada" tam={16} /> atrasada</span>}
        {item.status === "fazendo" && <span className="selo">em andamento</span>}
        {item.status === "concluida" && tarefa && <span className="m-mono">feita</span>}
        {mostrarProjeto && item.projeto && <span className="m-meta cartao-projeto">{item.projeto}</span>}
      </div>
      {topo}
      <h3 className={destaque ? "m-h4" : "cartao-titulo"}>{item.titulo}</h3>
      {rodape && <div className="cartao-acoes" onClick={(e) => e.stopPropagation()}>{rodape}</div>}
      <div className="cartao-base">
        <Avatar nome={pessoa} tam={destaque ? 32 : 26} />
        <BotoesReacao itemId={item.id} euId={euId} foguinho={item.reacoes.foguinho} estrela={item.reacoes.estrela} />
      </div>
    </article>
  );
}
