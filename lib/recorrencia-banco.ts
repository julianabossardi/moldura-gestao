import type { SupabaseClient } from "@supabase/supabase-js";
import { gerarEmbedding, textoParaEmbedding } from "./embedding";
import type { Banco, ItemRecorrente, Recorrencia } from "./recorrencia";

// o adaptador do Supabase para a rodada diária (usar com o cliente de serviço)
export function bancoSupabase(admin: SupabaseClient): Banco {
  return {
    async recorrencias() {
      const { data, error } = await admin.from("recorrencias").select("*");
      if (error) throw error;
      return (data ?? []) as Recorrencia[];
    },
    async itens(desde) {
      const { data, error } = await admin.from("itens").select("id, recorrencia_id, periodo, vez, status").not("recorrencia_id", "is", null).gte("periodo", desde);
      if (error) throw error;
      return (data ?? []) as ItemRecorrente[];
    },
    async inserir(rascunhos) {
      const saida: ItemRecorrente[] = [];
      for (const r of rascunhos) {
        const emb = await gerarEmbedding(textoParaEmbedding({ titulo: r.titulo, corpo: r.objetivo }));
        // a regra única (recorrência, período, vez) segura quem tentar criar de novo ao mesmo tempo
        const { data, error } = await admin.from("itens").upsert({
          tipo: "tarefa", origem: "recorrencia", status: "aberta",
          recorrencia_id: r.recorrencia_id, periodo: r.periodo, vez: r.vez, projeto_id: r.projeto_id,
          titulo: r.titulo, objetivo: r.objetivo, definicao_pronto: r.definicao_pronto, prioridade: r.prioridade,
          responsavel_id: r.responsavel_id, autor_id: r.autor_id, prazo: r.prazo, espera_item_id: r.espera_item_id,
          ...(emb && { embedding: JSON.stringify(emb) }),
        }, { onConflict: "recorrencia_id,periodo,vez", ignoreDuplicates: true }).select("id, recorrencia_id, periodo, vez, status");
        if (error) throw error;
        saida.push(...((data ?? []) as ItemRecorrente[]));
      }
      return saida;
    },
    async expirar(ids) {
      const { error } = await admin.from("itens").update({ status: "expirada" }).in("id", ids);
      if (error) throw error;
    },
  };
}
