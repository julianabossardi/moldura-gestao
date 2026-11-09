import type { SupabaseClient } from "@supabase/supabase-js";
import { hojeISO } from "./datas";

// o que um cartão precisa para aparecer em qualquer tela (início, projeto, reunião, memória)
export type ItemCartao = {
  id: string;
  tipo: string;
  titulo: string;
  corpo: string | null;
  objetivo: string | null;
  definicao_pronto: string | null;
  url: string | null;
  status: string;
  prioridade: string | null;
  prazo: string | null;
  projeto_id: string | null;
  projeto: string | null;
  responsavel_id: string | null;
  responsavel: string | null;
  autor: string | null;
  origem: string;
  minutos_estimados: number | null;
  comeca_em: string | null;
  espera: string | null; // título da tarefa de que esta espera, enquanto ela não estiver feita
  parte_de: string | null; // título da tarefa-mãe, quando esta é uma filha
  recorrente: boolean;
  imagem: string | null;
  reacoes: { foguinho: number; estrela: number; audio: number };
};

export const SELECT_CARTAO =
  "id, tipo, titulo, corpo, objetivo, definicao_pronto, url, status, prioridade, prazo, projeto_id, responsavel_id, origem, minutos_estimados, comeca_em, recorrencia_id, midia, criado_em, ultima_movimentacao, " +
  "espera:itens!espera_item_id(titulo, status), pai:itens!pai_id(titulo), projeto:projetos(nome), responsavel:pessoas!responsavel_id(nome), autor:pessoas!autor_id(nome), reacoes(tipo)";

type Linha = Omit<ItemCartao, "projeto" | "responsavel" | "autor" | "imagem" | "reacoes" | "espera" | "recorrente" | "parte_de"> & {
  midia: string[] | null;
  recorrencia_id: string | null;
  espera: { titulo: string; status: string } | null;
  pai: { titulo: string } | null;
  projeto: { nome: string } | null;
  responsavel: { nome: string } | null;
  autor: { nome: string } | null;
  reacoes: { tipo: string }[] | null;
};

// transforma linhas do banco em cartões; a primeira imagem vem de um bucket privado (link de 1 hora)
export async function paraCartoes(supabase: SupabaseClient, linhas: unknown[] | null): Promise<ItemCartao[]> {
  const rows = (linhas ?? []) as Linha[];
  const caminhos = rows.map((r) => r.midia?.[0]).filter(Boolean) as string[];
  const { data: assinadas } = caminhos.length ? await supabase.storage.from("midia").createSignedUrls(caminhos, 3600) : { data: [] };
  return rows.map((r) => {
    const conta = (t: string) => (r.reacoes ?? []).filter((x) => x.tipo === t).length;
    return {
      id: r.id, tipo: r.tipo, titulo: r.titulo, corpo: r.corpo, objetivo: r.objetivo, definicao_pronto: r.definicao_pronto,
      url: r.url, status: r.status, prioridade: r.prioridade, prazo: r.prazo, projeto_id: r.projeto_id,
      projeto: r.projeto?.nome ?? null, responsavel_id: r.responsavel_id, responsavel: r.responsavel?.nome ?? null,
      autor: r.autor?.nome ?? null, origem: r.origem, minutos_estimados: r.minutos_estimados,
      comeca_em: r.comeca_em ?? null, recorrente: !!r.recorrencia_id, parte_de: r.pai?.titulo ?? null,
      espera: r.espera && r.espera.status !== "concluida" ? r.espera.titulo : null,
      imagem: r.midia?.[0] ? assinadas?.find((a) => a.path === r.midia![0])?.signedUrl ?? null : null,
      reacoes: { foguinho: conta("foguinho"), estrela: conta("estrela"), audio: conta("audio") },
    };
  });
}

export const importante = (i: Pick<ItemCartao, "prioridade">) => i.prioridade === "alta";
export const atrasada = (i: Pick<ItemCartao, "prazo" | "status" | "tipo">) =>
  i.tipo === "tarefa" && !!i.prazo && ["aberta", "fazendo"].includes(i.status) && i.prazo < hojeISO();

// tarefa que ainda não pode ser feita: fica fora do painel da pessoa até a data (a página do projeto mostra sempre)
export const aindaNaoComeca = (i: Pick<ItemCartao, "comeca_em">, hoje: string = hojeISO()) => !!i.comeca_em && i.comeca_em > hoje;

// as listas mostram as tarefas de cima e também as filhas feitas à mão (quebra de uma tarefa grande em menores).
// as filhas dos recortes e da faxina são passos do dia e continuam escondidas
export const RAIZ_OU_FILHA_MANUAL = "pai_id.is.null,origem.eq.manual";
