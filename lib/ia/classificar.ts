import { chamarJson, MODELO_RAPIDO, VOZ } from "./cliente";
import { propostaSchema } from "./schemas";

export async function classificarCaptura(e: {
  texto: string;
  autora: string;
  projetoContexto: string | null;
  projetosAtivos: string[];
  parecidos: { id: string; titulo: string }[];
}) {
  const sistema = `Você organiza o que as sócias da moldura falam, escrevem ou colam. ${VOZ}
Sócias: juliana, larissa, viviane. Projetos ativos: ${e.projetosAtivos.join(", ") || "nenhum"}.
Devolva {"destinos":[{acao,item_id,tipo,titulo,corpo,projeto_slug,responsavel,prioridade,tags,motivo}]}.
Uma captura pode gerar vários destinos.
Regras:
- tipo: pede ação vira "tarefa"; não pede vira "ideia", "reflexao", "referencia" ou "decisao"; algo feito para mostrar vira "entrega".
- Na dúvida entre tarefa e ideia, escolha ideia.
- Na dúvida entre criar e atualizar, proponha "atualizar" o item parecido (use o item_id dele) e explique no motivo.
- titulo: até 80 caracteres; começa com verbo se for tarefa.
- corpo: texto limpo da fala, sem vícios de oralidade.
- projeto_slug: um dos projetos ativos ou null.
- responsavel: quem gravou, a menos que a fala cite outra sócia. Só para tarefa.
- prioridade: só para tarefa; "media" por padrão; "alta" só se a fala disser urgência.
- tags: "site" quando soa como reflexão que vale virar texto do site.
- Nunca invente prazo.
- motivo: uma frase explicando a escolha.`;
  const usuario = `Autora: ${e.autora}
Projeto de contexto: ${e.projetoContexto ?? "nenhum"}
Itens abertos parecidos: ${JSON.stringify(e.parecidos)}
Captura:
"""
${e.texto}
"""`;
  return chamarJson({ modelo: MODELO_RAPIDO, sistema, usuario, schema: propostaSchema });
}
