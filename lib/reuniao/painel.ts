import type { SupabaseClient } from "@supabase/supabase-js";
import type { Painel, PainelProjeto } from "./tipos";
import { diasAte } from "../datas";

type Item = {
  id: string; tipo: string; titulo: string; status: string; prioridade: string | null; origem: string;
  projeto_id: string | null; responsavel_id: string | null; autor_id: string; validade: string | null;
  criado_em: string; ultima_movimentacao: string; pai_id: string | null;
};

// o que mudou desde a reunião anterior, projeto por projeto, na ordem de prioridade.
// ninguém prepara nada: o painel se monta sozinho ao abrir a reunião.
export async function montarPainel(supabase: SupabaseClient, desdeISO: string): Promise<Painel> {
  const [{ data: projetos }, { data: pessoas }, { data: mexidos }, { data: abertos }] = await Promise.all([
    supabase.from("projetos").select("id, slug, nome").eq("status", "ativo").order("ordem_prioridade"),
    supabase.from("pessoas").select("id, nome").eq("papel", "socia").eq("ativa", true).order("nome"),
    supabase.from("itens").select("*").gte("ultima_movimentacao", desdeISO).is("pai_id", null),
    supabase.from("itens").select("*").in("status", ["aberta", "fazendo"]).is("pai_id", null),
  ]);

  const itensMexidos = (mexidos ?? []) as Item[];
  const itensAbertos = (abertos ?? []) as Item[];

  const bloco = (projeto: PainelProjeto["projeto"]): PainelProjeto => {
    const pid = projeto?.id ?? null;
    const mexidosAqui = itensMexidos.filter((i) => i.projeto_id === pid);
    const abertosAqui = itensAbertos.filter((i) => i.projeto_id === pid);
    const dono = (i: Item) => i.responsavel_id ?? i.autor_id;
    return {
      projeto,
      pessoas: (pessoas ?? [])
        .map((p) => ({
          id: p.id,
          nome: p.nome,
          concluidos: mexidosAqui.filter((i) => i.status === "concluida" && i.tipo !== "entrega" && dono(i) === p.id).map((i) => i.titulo),
          andamento: abertosAqui.filter((i) => i.tipo === "tarefa" && i.status === "fazendo" && dono(i) === p.id).map((i) => i.titulo),
          entregas: mexidosAqui.filter((i) => i.tipo === "entrega" && i.autor_id === p.id).map((i) => i.titulo),
        }))
        .filter((p) => p.concluidos.length || p.andamento.length || p.entregas.length),
      novas: mexidosAqui.filter((i) => i.tipo === "tarefa" && i.origem === "captura" && i.criado_em >= desdeISO).map((i) => i.titulo),
      ideias: abertosAqui
        .filter((i) => ["ideia", "reflexao"].includes(i.tipo))
        .map((i) => ({ titulo: i.titulo, dias: i.validade ? diasAte(i.validade) : null })),
      altaSemResponsavel: abertosAqui.filter((i) => i.tipo === "tarefa" && i.prioridade === "alta" && !i.responsavel_id).map((i) => i.titulo),
    };
  };

  const lista = [...(projetos ?? []).map((p) => bloco(p)), bloco(null)];
  // itens soltos só entram se houver algo a mostrar
  const vazio = (b: PainelProjeto) => !b.pessoas.length && !b.novas.length && !b.ideias.length && !b.altaSemResponsavel.length;
  return { desde: desdeISO, projetos: lista.filter((b, i) => i < (projetos ?? []).length || !vazio(b)) };
}
