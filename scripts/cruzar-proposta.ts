/**
 * passo 2 da reunião: cruza uma proposta com a pasta contexto/.
 *
 * npm run reuniao:cruzar -- --proposta docs/reunioes/2026-11-03-proposta.json \
 *   --transcricao docs/reunioes/2026-11-03-transcricao.txt --saida docs/reunioes/2026-11-03-proposta-v3.json
 *
 * --transcricao é opcional; com ela, os itens ganham o trecho de origem.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { propostaReuniaoSchema } from "../lib/reuniao/tipos";
import { carregarContexto } from "../lib/reuniao/contexto";
import { aplicarPasso2 } from "../lib/reuniao/passo2";

const args = process.argv.slice(2);
const pega = (c: string) => {
  const i = args.indexOf(`--${c}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const arqProposta = pega("proposta");
const arqSaida = pega("saida");
if (!arqProposta || !arqSaida) {
  console.error("falta --proposta e/ou --saida. exemplo: npm run reuniao:cruzar -- --proposta a.json --saida b.json");
  process.exit(1);
}

async function main() {
  const contexto = carregarContexto();
  const proposta = propostaReuniaoSchema.parse(JSON.parse(readFileSync(arqProposta!, "utf8")));
  const arqTranscricao = pega("transcricao");
  const texto = arqTranscricao ? readFileSync(arqTranscricao, "utf8") : "";
  // o mesmo caminho do app: glossário, cruzamento e conferência do código (o app ainda passa os itens do banco; aqui não há banco)
  const { proposta: nova, conferencia, erro } = await aplicarPasso2({
    proposta,
    segmentos: texto ? [{ falante: "0", inicio: 0, fim: 0, texto }] : [],
    contexto,
  });
  if (erro) console.error(`o cruzamento falhou: ${erro}`);
  writeFileSync(arqSaida!, JSON.stringify(nova, null, 2));

  // conferência feita pelo código, ao lado da proposta
  const lista = (l: string[], vazio: string) => (l.length ? l.map((x) => `- ${x}`) : [`- ${vazio}`]);
  const linhas = [
    "# conferência do cruzamento",
    ...(erro ? ["", `**o cruzamento falhou, esta é a leitura direta:** ${erro}`] : []),
    "",
    "## o que mudou (calculado pelo código, pelo título)",
    ...lista(conferencia.mudou, "nada"),
    "",
    "## trechos que não existem na transcrição (foram apagados)",
    ...lista(conferencia.trechos_apagados, "nenhum"),
    "",
    "## tarefas em prioridade alta fora do folga",
    ...lista(conferencia.altas_fora, "nenhuma"),
    "",
    "## mesma tarefa para donos diferentes",
    ...lista(conferencia.mesmo_titulo, "nenhuma"),
    "",
    "## notas do modelo (podem não bater com a lista; vale a seção de cima)",
    ...nova.notas.map((n) => `- ${n}`),
  ];
  writeFileSync(arqSaida!.replace(/\.json$/, ".conferencia.md"), linhas.join("\n"));
  console.log(`salvo em ${arqSaida}`);
  console.log(linhas.slice(0, linhas.indexOf("## notas do modelo (podem não bater com a lista; vale a seção de cima)")).join("\n"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
