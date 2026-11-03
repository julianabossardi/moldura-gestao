import type { PainelProjeto } from "@/lib/reuniao/tipos";

// o que mudou em um projeto desde a reunião anterior (usado ao vivo e no histórico)
export function PainelProjetoView({ bloco }: { bloco: PainelProjeto }) {
  const vazio = !bloco.pessoas.length && !bloco.novas.length && !bloco.ideias.length && !bloco.altaSemResponsavel.length;
  return (
    <div className="painel-reuniao">
      {vazio && <p className="aviso">nada se mexeu aqui desde a última reunião.</p>}

      {bloco.pessoas.map((p) => (
        <section className="bloco" key={p.id}>
          <h3 className="m-lead" style={{ margin: 0 }}>{p.nome.toLowerCase()}</h3>
          {p.concluidos.length > 0 && <Lista rotulo="concluiu" itens={p.concluidos} />}
          {p.andamento.length > 0 && <Lista rotulo="em andamento" itens={p.andamento} />}
          {p.entregas.length > 0 && <Lista rotulo="mostrou" itens={p.entregas} />}
        </section>
      ))}

      {bloco.novas.length > 0 && <section className="bloco"><Lista rotulo="tarefas novas que entraram por captura" itens={bloco.novas} /></section>}

      {bloco.ideias.length > 0 && (
        <section className="bloco">
          <span className="m-meta">ideias abertas</span>
          {bloco.ideias.map((i, k) => (
            <div className="item" key={k}>
              <span>{i.titulo}</span>
              {i.dias !== null && <span className={i.dias <= 7 ? "selo" : "m-mono"}>{i.dias <= 7 ? `expira em ${Math.max(i.dias, 0)} dias` : `${i.dias} dias`}</span>}
            </div>
          ))}
        </section>
      )}

      {bloco.altaSemResponsavel.length > 0 && <section className="bloco"><Lista rotulo="prioridade alta sem responsável" itens={bloco.altaSemResponsavel} /></section>}
    </div>
  );
}

function Lista({ rotulo, itens }: { rotulo: string; itens: string[] }) {
  return (
    <div>
      <span className="m-meta">{rotulo}</span>
      {itens.map((t, i) => <div className="item" key={i}><span>{t}</span></div>)}
    </div>
  );
}
