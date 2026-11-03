import { z } from "zod";

export const BLOCO_SEGUNDOS = 600; // áudio gravado em blocos de 10 minutos

export type Marcacao = { tipo: "projeto" | "decisao" | "tarefa"; projeto_id: string | null; em: number };
export type Segmento = { falante: string; inicio: number; fim: number; texto: string };
export type BlocoFila = { path: string; prediction: string | null; segmentos: Segmento[] | null; erro?: string | null };

export type PainelPessoa = { id: string; nome: string; concluidos: string[]; andamento: string[]; entregas: string[] };
export type PainelProjeto = {
  projeto: { id: string; slug: string; nome: string } | null; // null = itens soltos
  pessoas: PainelPessoa[];
  novas: string[];
  ideias: { titulo: string; dias: number | null }[];
  altaSemResponsavel: string[];
};
export type Painel = { desde: string; projetos: PainelProjeto[] };

export const propostaReuniaoSchema = z.object({
  resumo: z.string().default(""),
  projetos: z.array(
    z.object({
      projeto_slug: z.string().nullish(),
      novas: z.array(z.object({
        tipo: z.string().default("tarefa"),
        titulo: z.string(),
        corpo: z.string().nullish(),
        responsavel: z.string().nullish(),
        prioridade: z.string().nullish(),
        incluido: z.boolean().optional(),
      })).default([]),
      atualizacoes: z.array(z.object({
        item_id: z.string(),
        campo: z.enum(["status", "responsavel", "prazo", "prioridade"]),
        valor: z.string(),
        incluido: z.boolean().optional(),
      })).default([]),
      decisoes: z.array(z.object({ titulo: z.string(), corpo: z.string().nullish(), incluido: z.boolean().optional() })).default([]),
      ideias: z.array(z.object({ titulo: z.string(), corpo: z.string().nullish(), incluido: z.boolean().optional() })).default([]),
    }),
  ),
});
export type PropostaReuniao = z.infer<typeof propostaReuniaoSchema>;

export const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export const ROTULO_STATUS = { gravando: "sem gravação", processando: "processando", em_revisao: "em revisão", aprovada: "aprovada" } as const;
