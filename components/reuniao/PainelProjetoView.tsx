"use client";
import { painelNovo, type ItemPainel, type PainelProjeto, type PainelProjetoAntigo } from "@/lib/reuniao/tipos";
import { hojeISO } from "@/lib/datas";
import { useDetalhe } from "../ProvedorDetalhe";
import { Avatar } from "../Avatar";
import { Icone } from "../Icone";

// o que mudou em um projeto desde a reunião anterior, em caixinhas (usado ao vivo e no histórico)
export function PainelProjetoView({ bloco }: { bloco: PainelProjeto | PainelProjetoAntigo }) {
  if (!painelNovo(bloco)) return <PainelAntigo bloco={bloco} />;
  const vazio = !bloco.emAndamento.length && !bloco.feito.length && !bloco.falta.length && !bloco.entregas.length && !bloco.ideias.length;
  return (
    <div className="painel-reuniao">
      {vazio && <p className="aviso">nada se mexeu aqui desde a última reunião.</p>}
      <Grupo titulo="em andamento" itens={bloco.emAndamento} />
      <Grupo titulo="o que falta" ajuda="tarefas abertas, as importantes primeiro" itens={bloco.falta} />
      <Grupo titulo="feito desde a última reunião" itens={bloco.feito} />
      <Grupo titulo="mostrado para a equipe" itens={bloco.entregas} />
      <Grupo titulo="entrou por captura" itens={bloco.novas} />
      <Grupo titulo="ideias abertas" itens={bloco.ideias} />
    </div>
  );
}

function Grupo({ titulo, ajuda, itens }: { titulo: string; ajuda?: string; itens: ItemPainel[] }) {
  if (!itens.length) return null;
  return (
    <section className="bloco">
      <div><h3 className="m-lead" style={{ margin: 0 }}>{titulo}</h3>{ajuda && <span className="m-meta">{ajuda}</span>}</div>
      <div className="grade-cartoes">{itens.map((i) => <MiniCartao key={i.id} item={i} />)}</div>
    </section>
  );
}

function MiniCartao({ item }: { item: ItemPainel }) {
  const { abrir } = useDetalhe();
  const atrasada = item.tipo === "tarefa" && !!item.prazo && item.status !== "concluida" && item.prazo < hojeISO();
  return (
    <button type="button" className={`cartao ${item.status === "concluida" && item.tipo === "tarefa" ? "feito" : ""}`} onClick={() => abrir(item.id)}>
      <span className="cartao-corpo">
        <Avatar nome={item.responsavel} tam={26} />
        <span className="cartao-texto">
          <span className="cartao-titulo">{item.titulo}</span>
          {(item.prioridade === "alta" || atrasada || item.status === "fazendo" || (item.dias != null && item.dias <= 7)) && (
            <span className="cartao-meta">
              {item.prioridade === "alta" && <span title="importante" aria-label="importante"><Icone nome="importante" tam={14} /></span>}
              {atrasada && <span className="marca atrasada"><Icone nome="atrasada" tam={14} /> atrasada</span>}
              {item.status === "fazendo" && <span className="selo">em andamento</span>}
              {item.dias != null && item.dias <= 7 && <span className="selo">expira em {Math.max(item.dias, 0)} dias</span>}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

// reuniões antigas guardaram o painel só com títulos
function PainelAntigo({ bloco }: { bloco: PainelProjetoAntigo }) {
  const lista = (rotulo: string, itens: string[]) => itens.length > 0 && (
    <div><span className="m-meta">{rotulo}</span>{itens.map((t, i) => <div className="item" key={i}><span>{t}</span></div>)}</div>
  );
  return (
    <div className="painel-reuniao">
      {bloco.pessoas.map((p) => (
        <section className="bloco" key={p.id}>
          <h3 className="m-lead" style={{ margin: 0 }}>{p.nome.toLowerCase()}</h3>
          {lista("concluiu", p.concluidos)}{lista("em andamento", p.andamento)}{lista("mostrou", p.entregas)}
        </section>
      ))}
      {lista("tarefas novas que entraram por captura", bloco.novas)}
      {lista("prioridade alta sem responsável", bloco.altaSemResponsavel)}
    </div>
  );
}
