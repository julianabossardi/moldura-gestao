import type { SupabaseClient } from "@supabase/supabase-js";
import { diasAtras } from "./datas";

// o que aconteceu na moldura, em frases: "larissa entregou o moodboard do site", "viviane compartilhou uma referência".
// substitui a lista de "entregas recentes" (início e projeto) e alimenta as notificações.
export type Novidade = {
  id: string; // id do evento (item + verbo)
  item_id: string;
  categoria: "entrega" | "feita" | "referencia" | "ideia" | "decisao" | "tarefa";
  quem: string | null;
  quem_id: string | null;
  verbo: string;
  titulo: string;
  projeto: string | null;
  em: string;
};

type Linha = {
  id: string; tipo: string; titulo: string; status: string; criado_em: string; concluido_em: string | null;
  autor_id: string; responsavel_id: string | null;
  projeto: { nome: string } | null; autor: { nome: string } | null; responsavel: { nome: string } | null;
};

const CRIOU: Record<string, { categoria: Novidade["categoria"]; verbo: string }> = {
  entrega: { categoria: "entrega", verbo: "entregou" },
  referencia: { categoria: "referencia", verbo: "compartilhou uma referência:" },
  ideia: { categoria: "ideia", verbo: "teve uma ideia:" },
  reflexao: { categoria: "ideia", verbo: "deixou uma reflexão:" },
  decisao: { categoria: "decisao", verbo: "registrou uma decisão:" },
};

export async function carregarNovidades(
  supabase: SupabaseClient,
  o: { projetoId?: string; dias?: number; limite?: number; excetoPessoa?: string } = {},
): Promise<Novidade[]> {
  const desde = diasAtras(o.dias ?? 14);
  let q = supabase
    .from("itens")
    .select("id, tipo, titulo, status, criado_em, concluido_em, autor_id, responsavel_id, projeto:projetos(nome), autor:pessoas!autor_id(nome), responsavel:pessoas!responsavel_id(nome)")
    .is("pai_id", null)
    .or(`criado_em.gte.${desde},concluido_em.gte.${desde}`)
    .order("ultima_movimentacao", { ascending: false })
    .limit(60);
  if (o.projetoId) q = q.eq("projeto_id", o.projetoId);
  const { data } = await q;

  const eventos: Novidade[] = [];
  for (const i of (data ?? []) as unknown as Linha[]) {
    const projeto = i.projeto?.nome ?? null;
    const criou = CRIOU[i.tipo];
    if (criou && i.criado_em >= desde) {
      eventos.push({ id: `${i.id}-criou`, item_id: i.id, categoria: criou.categoria, quem: i.autor?.nome ?? null, quem_id: i.autor_id, verbo: criou.verbo, titulo: i.titulo, projeto, em: i.criado_em });
    }
    if (i.tipo === "tarefa" && i.status === "concluida" && i.concluido_em && i.concluido_em >= desde) {
      const quem = i.responsavel ?? i.autor;
      eventos.push({ id: `${i.id}-feita`, item_id: i.id, categoria: "feita", quem: quem?.nome ?? null, quem_id: i.responsavel_id ?? i.autor_id, verbo: "concluiu", titulo: i.titulo, projeto, em: i.concluido_em });
    }
  }
  return eventos
    .filter((e) => !o.excetoPessoa || e.quem_id !== o.excetoPessoa)
    .sort((a, b) => b.em.localeCompare(a.em))
    .slice(0, o.limite ?? 12);
}
