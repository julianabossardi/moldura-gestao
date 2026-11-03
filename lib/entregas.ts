import type { SupabaseClient } from "@supabase/supabase-js";
import type { Entrega, Reacao } from "@/components/EntregaCard";
import { diasAtras } from "./datas";

type Bruta = {
  id: string; titulo: string; corpo: string | null; criado_em: string; midia: string[] | null;
  autor: { nome: string } | null; projeto: { nome: string } | null;
  reacoes: (Omit<Reacao, "audio_url"> & { audio_path: string | null })[];
};

// entregas dos últimos 14 dias, mais novas primeiro. mídia e áudios ficam num bucket privado: links de 1 hora
export async function carregarEntregas(supabase: SupabaseClient, projetoId?: string): Promise<Entrega[]> {
  let q = supabase
    .from("itens")
    .select("id, titulo, corpo, criado_em, midia, autor:pessoas!autor_id(nome), projeto:projetos(nome), reacoes(id, pessoa_id, tipo, audio_path, pessoa:pessoas(nome))")
    .eq("tipo", "entrega")
    .gte("criado_em", diasAtras(14))
    .order("criado_em", { ascending: false });
  if (projetoId) q = q.eq("projeto_id", projetoId);
  const brutas = ((await q).data ?? []) as unknown as Bruta[];

  const caminhos = brutas.flatMap((e) => [...(e.midia ?? []), ...e.reacoes.map((r) => r.audio_path).filter(Boolean)]) as string[];
  const { data: assinadas } = caminhos.length ? await supabase.storage.from("midia").createSignedUrls(caminhos, 3600) : { data: [] };
  const url = (c: string) => assinadas?.find((a) => a.path === c)?.signedUrl ?? null;

  return brutas.map((e) => ({
    id: e.id, titulo: e.titulo, corpo: e.corpo, criado_em: e.criado_em,
    midia_urls: (e.midia ?? []).map(url).filter(Boolean) as string[],
    autor: e.autor?.nome ?? "", projeto: e.projeto?.nome ?? null,
    reacoes: e.reacoes.map((r) => ({ id: r.id, pessoa_id: r.pessoa_id, tipo: r.tipo, pessoa: r.pessoa, audio_url: r.audio_path ? url(r.audio_path) : null })),
  }));
}
