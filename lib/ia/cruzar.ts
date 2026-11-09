import { chamarJson, MODELO_FORTE, VOZ } from "./cliente";
import { propostaReuniaoSchema, type PropostaReuniao } from "../reuniao/tipos";
import { recorteDoContexto, type Contexto } from "../reuniao/contexto";

// passo 2: pega o que a leitura da transcrição propôs e cruza com o contexto (papéis, projetos, estado)
export const REGRAS_CRUZAMENTO = `1. Tarefa só quando há ação concreta e alguém que vai fazer. Conversa, relato e observação sobre um lugar, pessoa ou concorrente vão para "ideias".
2. Desejo sem caminho ("seria ótimo", "a gente pode", "se a gente conseguir", "de repente") vai para "ideias".
3. Quando o mesmo assunto aparece mais de uma vez, vale a última fala. Quem assumiu depois fica com a tarefa.
4. Mesmo assunto é um item só, com o título na ação que foi dita (ex.: "ligar o chip e trocar o telefone", não "decidir se mantém o chip").
5. Dono é quem faz a ação, não de quem é o assunto. Se a fala não diz, sugira pelo papel e marque dono_origem "papel". Se a fala diz, dono_origem "fala". Responsável marcado como "provável" na proposta veio de dedução de voz e não vale como dito. Nunca atribua o "eu" da transcrição a uma pessoa só.
6. Se o projeto não dá para saber, deixe projeto_slug null e diga em "notas".
7. O que o estado (o arquivo e o banco, em "Itens concluídos recentemente") mostra como feito vai para "ja_feitas", não para "novas". Se mudou de natureza (ex.: a landing foi feita e agora precisa de revisão), crie a tarefa nova da revisão.
8. Decisão ou marco não gera tarefa. Coloque em "desdobramentos" da decisão, como texto solto, o que costuma sair dela. As tarefas que o contexto já nomeia (ex.: pegar o número DUNS) entram em "novas" com dono e o trecho em que o prazo foi dito.
9. Prioridade segue o contexto: o que ele define como prioridade agora é "alta" e o resto é "media" ou "baixa". Nunca marque "alta" fora do que o contexto manda.
10. Todo item leva "trecho": de 8 a 30 palavras copiadas letra por letra da transcrição fornecida, sem corrigir nem resumir. Sem trecho dito, deixe null (é um item vindo do contexto). Um trecho que não existe na transcrição é descartado.
11. Nunca invente prazo, número ou nome. Termos do glossário já foram trocados no texto.
12. Cada mudança que você fizer na proposta (juntou, moveu, tirou, trocou dono) entra em "notas", uma frase curta cada.
13. Tarefa que se repete (lista "Tarefas que se repetem", se vier) nunca vira tarefa nova: a fala "tem que fazer o post" casa com a tarefa do período atual, que já existe. Tire de "novas" e diga em "notas" com qual casou. Se a fala diz que foi feita neste período, use "atualizacoes" com o item_id da tarefa do período, campo "status" e valor "concluida"; nunca "ja_feitas" para tarefa que se repete. Se a fala muda quando ou quem faz, atualize a tarefa do período do mesmo jeito. Só proponha nova recorrência como "ideias".`;

// o que o banco sabe: itens abertos e o que foi concluído há pouco (substitui o que antes ia à mão no estado.md)
export type ItemDoBanco = { id?: string; titulo: string; projeto_slug: string | null; responsavel: string | null; status: string; concluido_em?: string | null };
// tarefas que se repetem e o que cada uma já criou no período atual
export type RecorrenciaParaCruzar = {
  titulo: string; projeto_slug: string | null; frequencia: string; quantidade: number; responsavel: string | null;
  do_periodo: { id: string; titulo: string; status: string }[];
};
export type BancoParaCruzar = { abertos: ItemDoBanco[]; concluidos: ItemDoBanco[]; recorrencias?: RecorrenciaParaCruzar[] };

export async function cruzarComContexto(e: {
  proposta: PropostaReuniao;
  transcricao?: string; // já com o glossário aplicado
  contexto: Contexto;
  banco?: BancoParaCruzar;
}): Promise<PropostaReuniao> {
  const slugs = e.proposta.projetos.map((p) => p.projeto_slug).filter((s): s is string => !!s);
  const sistema = `Você revisa a proposta de organização da reunião semanal das sócias da moldura (juliana, larissa, viviane), cruzando-a com o contexto. ${VOZ}
Mantenha o formato da proposta. Cada item de "ja_feitas" é um objeto {"titulo":"","corpo":"","trecho":""}, nunca texto solto. Acrescente: "notas" (lista de frases), "trecho" e "dono_origem" nas tarefas, "trecho" nas ideias e decisões, "desdobramentos" nas decisões e "ja_feitas" em cada projeto.
Regras:
${REGRAS_CRUZAMENTO}`;
  const usuario = `Contexto:
${recorteDoContexto(e.contexto, slugs)}

${e.banco ? `Itens abertos no banco:
${JSON.stringify(e.banco.abertos)}

Itens concluídos recentemente no banco:
${JSON.stringify(e.banco.concluidos)}

${e.banco.recorrencias?.length ? `Tarefas que se repetem (ativas), com o que já existe no período atual:
${JSON.stringify(e.banco.recorrencias)}

` : ""}` : ""}Proposta da leitura da transcrição:
${JSON.stringify(e.proposta)}
${e.transcricao ? `\nTranscrição (sem separação de vozes):\n${e.transcricao}` : ""}`;
  return chamarJson({ modelo: MODELO_FORTE, sistema, usuario, schema: propostaReuniaoSchema, maxTokens: 10000, semPensar: true });
}
