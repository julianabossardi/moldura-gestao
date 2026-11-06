import { z } from "zod";

export const BLOCO_SEGUNDOS = 600; // áudio gravado em blocos de 10 minutos

export type Marcacao = { tipo: "projeto" | "decisao" | "tarefa"; projeto_id: string | null; em: number };
export type Segmento = { falante: string; inicio: number; fim: number; texto: string };
export type BlocoFila = { path: string; prediction: string | null; segmentos: Segmento[] | null; erro?: string | null };

// item como aparece no painel da reunião (foto tirada ao abrir a reunião)
export type ItemPainel = {
  id: string; tipo: string; titulo: string; status: string; prioridade: string | null; prazo: string | null;
  responsavel: string | null; dias?: number | null;
};
export type PainelProjeto = {
  projeto: { id: string; slug: string; nome: string } | null; // null = itens soltos
  emAndamento: ItemPainel[];
  feito: ItemPainel[]; // concluído desde a reunião anterior
  falta: ItemPainel[]; // tarefas abertas, as importantes primeiro
  entregas: ItemPainel[];
  novas: ItemPainel[]; // entraram por captura
  ideias: ItemPainel[];
};
// formato antigo (até a rodada de layout 1), mantido para o histórico
export type PainelPessoa = { id: string; nome: string; concluidos: string[]; andamento: string[]; entregas: string[] };
export type PainelProjetoAntigo = {
  projeto: PainelProjeto["projeto"];
  pessoas: PainelPessoa[];
  novas: string[];
  ideias: { titulo: string; dias: number | null }[];
  altaSemResponsavel: string[];
};
export type Painel = { desde: string; projetos: (PainelProjeto | PainelProjetoAntigo)[] };
export const painelNovo = (b: PainelProjeto | PainelProjetoAntigo): b is PainelProjeto => "emAndamento" in b;

export const propostaReuniaoSchema = z.object({
  resumo: z.string().default(""),
  // explicações do cruzamento com o contexto (o que foi juntado, movido ou tirado, e por quê)
  notas: z.array(z.string()).default([]),
  projetos: z.array(
    z.object({
      projeto_slug: z.string().nullish(),
      novas: z.array(z.object({
        tipo: z.string().default("tarefa"),
        titulo: z.string(),
        corpo: z.string().nullish(),
        responsavel: z.string().nullish(),
        prioridade: z.string().nullish(),
        trecho: z.string().nullish(), // pedaço da transcrição que originou o item
        dono_origem: z.enum(["fala", "papel"]).nullish(), // "fala": foi dito; "papel": sugerido pelo papel
        incluido: z.boolean().optional(),
      })).default([]),
      atualizacoes: z.array(z.object({
        item_id: z.string(),
        campo: z.enum(["status", "responsavel", "prazo", "prioridade"]),
        valor: z.string(),
        incluido: z.boolean().optional(),
      })).default([]),
      decisoes: z.array(z.object({
        titulo: z.string(),
        corpo: z.string().nullish(),
        trecho: z.string().nullish(),
        desdobramentos: z.array(z.string()).default([]), // tarefas possíveis, só sugestão
        incluido: z.boolean().optional(),
      })).default([]),
      ideias: z.array(z.object({ titulo: z.string(), corpo: z.string().nullish(), trecho: z.string().nullish(), incluido: z.boolean().optional() })).default([]),
      ja_feitas: z.array(z.union([
        z.string().transform((titulo) => ({ titulo, corpo: null as string | null | undefined, trecho: null as string | null | undefined, incluido: undefined as boolean | undefined })),
        z.object({ titulo: z.string(), corpo: z.string().nullish(), trecho: z.string().nullish(), incluido: z.boolean().optional() }),
      ])).default([]),
    }),
  ),
});
export type PropostaReuniao = z.infer<typeof propostaReuniaoSchema>;

export const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export const ROTULO_STATUS = { gravando: "sem gravação", processando: "processando", em_revisao: "em revisão", aprovada: "aprovada" } as const;
