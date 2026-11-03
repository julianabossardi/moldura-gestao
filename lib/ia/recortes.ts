import { chamarJson, MODELO_FORTE, VOZ } from "./cliente";
import { recortesSchema } from "./schemas";

export type Candidata = {
  id: string;
  titulo: string;
  corpo: string | null;
  prioridade: string | null;
  prazo: string | null;
  recortes_anteriores: string[];
};

const GUIA_ESTADOS = `Estados:
- leve: coisas objetivas e mecânicas, com pouca decisão. Nunca exija decisão de direção.
- criativa: explorar, abrir possibilidades, rascunhar.
- focada: resolver, decidir e fechar, mesmo que não seja criativo.
Combinações ampliam o tipo de recorte aceito, sem misturar tudo num só: criativa+focada = escolher uma direção entre opções e detalhar; leve+criativa = referências, moodboard, rascunho solto; leve+focada = revisar, corrigir, organizar algo já decidido; os três = qualquer recorte, só pela importância.`;

export async function gerarRecortes(e: {
  candidatas: Candidata[];
  minutos: number;
  estados: string[];
  quantidade: number | "auto";
  tamanho: "pequeno" | "medio";
}) {
  const sistema = `Você corta tarefas em recortes para as sócias da moldura. ${VOZ}
Recorte não é resumo da tarefa: é a próxima ação concreta que cabe no tempo e no estado, e começa com verbo. Título de até 70 caracteres.
${GUIA_ESTADOS}
Se nenhuma tarefa combina com o estado, proponha o lado leve da tarefa mais importante: preparar material, organizar referências, listar dúvidas.
Não repita recortes já feitos. A soma de minutos_estimados cabe no tempo. Tamanho preferido: ${
    e.tamanho === "pequeno" ? "recortes curtos e fecháveis" : "blocos de 1 a 3 horas com mini-passos"
  }.
Devolva {"recortes":[{pai_id,titulo,minutos_estimados,estados,mini_passos,por_que_agora}]} com ${
    e.quantidade === "auto" ? "1 a 3" : e.quantidade
  } recortes. mini_passos tem até 5 passos curtos. por_que_agora é uma frase.`;
  const usuario = `Tempo: ${e.minutos} minutos. Estados: ${e.estados.join(" + ")}.
Tarefas candidatas, em ordem de importância:
${JSON.stringify(e.candidatas, null, 1)}`;
  return chamarJson({ modelo: MODELO_FORTE, sistema, usuario, schema: recortesSchema, maxTokens: 2500 });
}
