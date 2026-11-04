import { chamarJson, MODELO_FORTE, VOZ } from "./cliente";
import { propostaReuniaoSchema, mmss, type Marcacao, type Segmento } from "../reuniao/tipos";

export async function processarReuniao(e: {
  segmentos: Segmento[];
  nomeDoFalante: (falante: string) => string;
  marcacoes: Marcacao[];
  projetos: { id: string; slug: string; nome: string }[];
  itensAbertos: { id: string; titulo: string; projeto_slug: string | null; responsavel: string | null; status: string }[];
}) {
  const slug = (id: string | null) => e.projetos.find((p) => p.id === id)?.slug ?? "solto";
  const linhaDoTempo = [
    ...e.segmentos.map((s) => ({ em: s.inicio, texto: `${e.nomeDoFalante(s.falante)}: ${s.texto}` })),
    ...e.marcacoes.map((m) => ({
      em: m.em,
      texto: m.tipo === "projeto" ? `[a tela passou para o projeto ${slug(m.projeto_id)}]` : `[marcação manual: isso é ${m.tipo === "decisao" ? "decisão" : "tarefa"}]`,
    })),
  ].sort((a, b) => a.em - b.em);

  const sistema = `Você organiza a reunião semanal das sócias da moldura (juliana, larissa, viviane). ${VOZ}
A conversa segue projeto por projeto, e a tela registrou quando cada projeto entrou. Use essas trocas para separar a fala por projeto.
Devolva {"resumo":"até 10 linhas, por projeto","projetos":[{"projeto_slug":"folga"|null,"novas":[{"tipo":"tarefa","titulo":"","corpo":"","responsavel":"juliana|larissa|viviane|null","prioridade":"alta|media|baixa|null"}],"atualizacoes":[{"item_id":"","campo":"status|responsavel|prazo|prioridade","valor":""}],"decisoes":[{"titulo":"","corpo":""}],"ideias":[{"titulo":"","corpo":""}]}]}.
Regras:
- Ideia de reunião entra em "ideias", não em "novas", a menos que alguém tenha assumido na hora ("eu faço isso").
- Para mudar algo que já existe, use "atualizacoes" com o item_id da lista de itens abertos; não crie duplicado.
- Valores: status é aberta, fazendo, concluida ou arquivada; prazo é AAAA-MM-DD e só se a fala citar data; nunca invente prazo.
- Título de tarefa começa com verbo e tem até 80 caracteres.
- Marcações manuais são certeza: "decisão" vai em "decisoes", "tarefa" em "novas".
- Inclua só projetos sobre os quais se falou. Fala sem projeto vai com projeto_slug null.`;
  const usuario = `Projetos ativos: ${e.projetos.map((p) => p.slug).join(", ")}
Itens abertos: ${JSON.stringify(e.itensAbertos)}
Conversa:
${linhaDoTempo.map((l) => `[${mmss(l.em)}] ${l.texto}`).join("\n")}`;
  return chamarJson({ modelo: MODELO_FORTE, sistema, usuario, schema: propostaReuniaoSchema, maxTokens: 6000 });
}
