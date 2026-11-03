import { z } from "zod";
import { chamarJson, MODELO_FORTE, VOZ } from "./cliente";
import { recorteSchema } from "./schemas";

// o menor primeiro passo possível para uma tarefa parada, no estado de hoje da pessoa
export async function primeiroPasso(e: { tarefa: { id: string; titulo: string; corpo: string | null }; estados: string[]; diasParada: number }) {
  const sistema = `Uma tarefa ficou parada na lista de uma sócia da moldura. Proponha o menor primeiro passo possível, que dê vontade de começar. ${VOZ}
O passo é um recorte de até 30 minutos, começa com verbo e tem título de até 70 caracteres.
Estados: leve (objetivo e mecânico, sem decisão), criativa (explorar e rascunhar), focada (resolver e fechar). Adapte ao estado atual.
Exemplo: um currículo parado há semanas vira "abrir a vaga e anotar três pontos que ela pede".
Devolva {"recorte":{"pai_id":"id da tarefa","titulo":"","minutos_estimados":15,"estados":["leve"],"mini_passos":["até 3 passos curtos"],"por_que_agora":"uma frase gentil, sem culpa"}}.`;
  const usuario = `Tarefa: ${JSON.stringify(e.tarefa)}
Parada há ${e.diasParada} dias.
Estado atual: ${e.estados.length ? e.estados.join(" + ") : "focada"}.`;
  const r = await chamarJson({ modelo: MODELO_FORTE, sistema, usuario, schema: z.object({ recorte: recorteSchema }), maxTokens: 1000 });
  return { ...r.recorte, pai_id: e.tarefa.id, minutos_estimados: Math.min(r.recorte.minutos_estimados, 30) };
}
