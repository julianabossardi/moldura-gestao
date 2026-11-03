/**
 * gera o embedding dos itens que ainda não têm (incluindo os antigos).
 * npm run embeddings:preencher
 * preencher o embedding não conta como movimentação: validade e "última movimentação" ficam como estavam.
 */
import { supabaseAdmin } from "../lib/supabase/admin";
import { gerarEmbedding, textoParaEmbedding } from "../lib/embedding";

async function main() {
  const admin = supabaseAdmin();
  const { data: itens, error } = await admin.from("itens").select("id, titulo, corpo, url").is("embedding", null);
  if (error) throw error;
  let feitos = 0;
  for (const item of itens ?? []) {
    const emb = await gerarEmbedding(textoParaEmbedding(item));
    if (!emb) {
      console.error("sem provedor de embeddings (VOYAGE_API_KEY). nada preenchido.");
      process.exit(1);
    }
    await admin.from("itens").update({ embedding: JSON.stringify(emb) }).eq("id", item.id);
    feitos++;
  }
  console.log(`${feitos} de ${itens?.length ?? 0} itens com embedding`);
}

main();
