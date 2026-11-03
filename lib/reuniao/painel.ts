import type { SupabaseClient } from "@supabase/supabase-js";
import type { ItemPainel, Painel, PainelProjeto } from "./tipos";
import { diasAte } from "../datas";

type Item = {
  id: string; tipo: string; titulo: string; status: string; prioridade: string | null; origem: string; prazo: string | null;
  projeto_id: string | null; responsavel_id: string | null; autor_id: string; validade: string | null;
  criado_em: string; ultima_movimentacao: string; pai_id: string | null;
};

const PESO: Record<string, number> = { alta: 0, media: 1, baixa: 2 };

// o que mudou desde a reunião anterior, projeto por projeto, na ordem de prioridade.
// ninguém prepara nada: o painel se monta sozinho ao abrir a reunião.
export async function montarPainel(supabase: SupabaseClient, desdeISO: string): Promise<Painel> {
  const [{ data: projetos }, { data: pessoas }, { data: mexidos }, { data: abertos }] = await Promise.all([
    supabase.from("projetos").select("id, slug, nome").eq("status", "ativo").order("ordem_prioridade"),
    supabase.from("pessoas").select("id, nome"),
    supabase.from("itens").select("*").gte("ultima_movimentacao", desdeISO).is("pai_id", null),
    supabase.from("itens").select("*").in("status", ["aberta", "fazendo"]).is("pai_id", null),
  ]);

  const nome = (id: string | null) => (id ? pessoas?.find((p) => p.id === id)?.nome ?? null : null);
  const paraPainel = (i: Item): ItemPainel => ({
    id: i.id, tipo: i.tipo, titulo: i.titulo, status: i.status, prioridade: i.prioridade, prazo: i.prazo,
    responsavel: nome(i.tipo === "tarefa" ? i.responsavel_id : i.autor_id),
    dias: i.validade ? diasAte(i.validade) : null,
  });
  const itensMexidos = (mexidos ?? []) as Item[];
  const itensAbertos = (abertos ?? []) as Item[];

  const bloco = (projeto: PainelProjeto["projeto"]): PainelProjeto => {
    const pid = projeto?.id ?? null;
    const mexidosAqui = itensMexidos.filter((i) => i.projeto_id === pid);
    const abertosAqui = itensAbertos.filter((i) => i.projeto_id === pid);
    return {
      projeto,
      emAndamento: abertosAqui.filter((i) => i.tipo === "tarefa" && i.status === "fazendo").map(paraPainel),
      feito: mexidosAqui.filter((i) => i.tipo === "tarefa" && i.status === "concluida").map(paraPainel),
      falta: abertosAqui
        .filter((i) => i.tipo === "tarefa" && i.status === "aberta")
        .sort((a, b) => (PESO[a.prioridade ?? "media"] ?? 1) - (PESO[b.prioridade ?? "media"] ?? 1) || (a.prazo ?? "9999").localeCompare(b.prazo ?? "9999"))
        .slice(0, 8)
        .map(paraPainel),
      entregas: mexidosAqui.filter((i) => i.tipo === "entrega").map(paraPainel),
      novas: mexidosAqui.filter((i) => i.tipo === "tarefa" && i.origem === "captura" && i.criado_em >= desdeISO).map(paraPainel),
      ideias: abertosAqui.filter((i) => ["ideia", "reflexao"].includes(i.tipo)).map(paraPainel),
    };
  };

  const lista = [...(projetos ?? []).map((p) => bloco(p)), bloco(null)];
  // itens soltos só entram se houver algo a mostrar
  const vazio = (b: PainelProjeto) => !b.emAndamento.length && !b.feito.length && !b.falta.length && !b.entregas.length && !b.ideias.length;
  return { desde: desdeISO, projetos: lista.filter((b, i) => i < (projetos ?? []).length || !vazio(b)) };
}
