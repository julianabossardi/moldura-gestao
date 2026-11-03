import type { SupabaseClient } from "@supabase/supabase-js";
import type { Destino } from "./ia/schemas";
import { gerarEmbedding, textoParaEmbedding } from "./embedding";

// transforma os destinos confirmados de uma captura em itens (cria ou atualiza)
export async function aplicarDestinos(
  db: SupabaseClient,
  o: { capturaId: string; destinos: Destino[]; autorId: string; soCriar?: boolean },
): Promise<{ criados: number; pulados: number }> {
  const [{ data: projetos }, { data: pessoas }] = await Promise.all([
    db.from("projetos").select("id, slug"),
    db.from("pessoas").select("id, nome"),
  ]);
  const projetoId = (slug?: string | null) => projetos?.find((p) => p.slug === slug)?.id ?? null;
  const pessoaId = (nome?: string | null) =>
    nome ? pessoas?.find((p) => p.nome.toLowerCase().startsWith(nome.slice(0, 4)))?.id ?? null : null;

  let criados = 0;
  let pulados = 0;
  for (const d of o.destinos) {
    const atualizar = d.acao === "atualizar" && !!d.item_id;
    // na confirmação automática, só criar: uma atualização não teria como ser desfeita
    if (atualizar && o.soCriar) { pulados++; continue; }
    const campos = {
      tipo: d.tipo,
      titulo: d.titulo,
      corpo: d.corpo ?? null,
      tags: d.tags,
      projeto_id: projetoId(d.projeto_slug),
      prioridade: d.tipo === "tarefa" ? d.prioridade ?? "media" : null,
      responsavel_id: d.tipo === "tarefa" ? pessoaId(d.responsavel) ?? o.autorId : null,
    };
    const emb = await gerarEmbedding(textoParaEmbedding(d));
    const embedding = emb ? JSON.stringify(emb) : undefined;
    if (atualizar) {
      await db.from("itens").update({ ...campos, ...(embedding && { embedding }) }).eq("id", d.item_id!);
    } else {
      await db.from("itens").insert({ ...campos, autor_id: o.autorId, origem: "captura", captura_id: o.capturaId, ...(embedding && { embedding }) });
      criados++;
    }
  }
  return { criados, pulados };
}
