import type { SupabaseClient } from "@supabase/supabase-js";
import { SELECT_CARTAO, paraCartoes, type ItemCartao } from "./cartao";
import { diasAtras } from "./datas";

// entregas dos últimos 14 dias, mais novas primeiro
export async function carregarEntregas(supabase: SupabaseClient, projetoId?: string): Promise<ItemCartao[]> {
  let q = supabase.from("itens").select(SELECT_CARTAO).eq("tipo", "entrega").gte("criado_em", diasAtras(14)).order("criado_em", { ascending: false });
  if (projetoId) q = q.eq("projeto_id", projetoId);
  return paraCartoes(supabase, (await q).data);
}
