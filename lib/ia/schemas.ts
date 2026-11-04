import { z } from "zod";

export const TIPOS = ["tarefa", "ideia", "reflexao", "referencia", "decisao", "entrega"] as const;
export const ESTADOS = ["leve", "criativa", "focada"] as const;

export const destinoSchema = z.object({
  acao: z.enum(["criar", "atualizar"]),
  item_id: z.string().uuid().nullish(),
  tipo: z.enum(TIPOS),
  titulo: z.string().min(1).max(120),
  corpo: z.string().nullish(),
  projeto_slug: z.string().nullish(),
  responsavel: z.enum(["juliana", "larissa", "viviane"]).nullish(),
  prioridade: z.enum(["alta", "media", "baixa"]).nullish(),
  tags: z.array(z.string()).default([]),
  motivo: z.string().default(""),
});
export const propostaSchema = z.object({ destinos: z.array(destinoSchema).min(1) });
export type Destino = z.infer<typeof destinoSchema>;

export const recorteSchema = z.object({
  pai_id: z.string().uuid(),
  titulo: z.string().min(1).max(100),
  minutos_estimados: z.number().int().positive(),
  estados: z.array(z.enum(ESTADOS)).min(1),
  mini_passos: z.array(z.string()).max(5).default([]),
  por_que_agora: z.string().default(""),
});
export const recortesSchema = z.object({ recortes: z.array(recorteSchema).min(1).max(3) });
export type Recorte = z.infer<typeof recorteSchema>;
