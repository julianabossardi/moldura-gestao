import type { PropostaReuniao, Segmento } from "./tipos";
import { aplicarGlossario, carregarContexto, type Contexto } from "./contexto";
import { altaForaDoFolga, conferirTrechos, diferencas, mesmoTituloDonosDiferentes } from "./conferir";
import { cruzarComContexto, type ItemDoBanco } from "../ia/cruzar";

// projetos em que o contexto manda prioridade alta (hoje só o folga)
export const PROJETOS_ALTOS = ["folga"];

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// o app guarda um responsável por item: a mesma tarefa para duas pessoas fica como duas tarefas,
// cada uma com o nome de quem faz no título ("revisar o site (viviane)")
export function separarDonos(p: PropostaReuniao): PropostaReuniao {
  return {
    ...p,
    projetos: p.projetos.map((pr) => {
      const donos = new Map<string, Set<string>>();
      for (const t of pr.novas) donos.set(norm(t.titulo), (donos.get(norm(t.titulo)) ?? new Set()).add(t.responsavel ?? ""));
      return {
        ...pr,
        novas: pr.novas.map((t) => ((donos.get(norm(t.titulo))?.size ?? 0) > 1 && t.responsavel ? { ...t, titulo: `${t.titulo} (${t.responsavel.toLowerCase()})` } : t)),
      };
    }),
  };
}

// o que o código achou, guardado em reunioes.conferencia e mostrado na revisão
export type Conferencia = { mudou: string[]; trechos_apagados: string[]; altas_fora: string[]; mesmo_titulo: string[] };
export type ResultadoPasso2 = { proposta: PropostaReuniao; conferencia: Conferencia; erro: string | null };

type Cruzar = (e: { proposta: PropostaReuniao; transcricao?: string; contexto: Contexto; banco?: { abertos: ItemDoBanco[]; concluidos: ItemDoBanco[] } }) => Promise<PropostaReuniao>;

// passo 2 da reunião: cruza a proposta da leitura com a pasta contexto/ e com o que o banco sabe, e confere o resultado no código.
// a conferência roda sempre, mesmo se o cruzamento falhar. se ele falhar, a proposta do passo 1 segue em frente
// e o erro volta no resultado para ser guardado, sem travar a reunião.
export async function aplicarPasso2(
  e: { proposta: PropostaReuniao; segmentos: Segmento[]; contexto?: Contexto; banco?: { abertos: ItemDoBanco[]; concluidos: ItemDoBanco[] } },
  cruzar: Cruzar = cruzarComContexto,
): Promise<ResultadoPasso2> {
  let contexto: Contexto | undefined = e.contexto;
  let transcricao = "";
  try {
    contexto ??= carregarContexto();
    transcricao = aplicarGlossario(e.segmentos.map((s) => s.texto).join(" "), contexto.glossario);
    const nova = await cruzar({ proposta: e.proposta, transcricao, contexto, banco: e.banco });
    const trechos_apagados = conferirTrechos(nova, transcricao);
    const mesmo_titulo = mesmoTituloDonosDiferentes(nova); // antes de separar, para o aviso mostrar o que foi feito
    return {
      proposta: separarDonos(nova),
      erro: null,
      conferencia: {
        mudou: diferencas(e.proposta, nova),
        trechos_apagados,
        altas_fora: altaForaDoFolga(nova, PROJETOS_ALTOS),
        mesmo_titulo,
      },
    };
  } catch (err) {
    console.error("passo 2 da reunião falhou", err);
    return {
      proposta: separarDonos(e.proposta),
      erro: (err as Error).message || "erro desconhecido",
      conferencia: { mudou: [], trechos_apagados: [], altas_fora: altaForaDoFolga(e.proposta, PROJETOS_ALTOS), mesmo_titulo: mesmoTituloDonosDiferentes(e.proposta) },
    };
  }
}
