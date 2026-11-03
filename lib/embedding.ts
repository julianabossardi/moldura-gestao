// modelo multilíngue com bom português, 1024 dimensões (voyage-multilingual-2).
// sem VOYAGE_API_KEY a plataforma segue funcionando, só sem busca por sentido.
export async function gerarEmbedding(texto: string): Promise<number[] | null> {
  const chave = process.env.VOYAGE_API_KEY;
  if (!chave) return null;
  const r = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "voyage-multilingual-2", input: [texto], input_type: "document" }),
  });
  if (!r.ok) return null;
  return ((await r.json()) as { data: { embedding: number[] }[] }).data[0].embedding;
}

export const textoParaEmbedding = (i: { titulo: string; corpo?: string | null; url?: string | null }) =>
  [i.titulo, i.corpo, i.url].filter(Boolean).join("\n");
