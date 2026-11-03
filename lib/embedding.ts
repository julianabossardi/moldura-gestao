// modelo multilíngue com bom português, 1024 dimensões (voyage-multilingual-2).
// sem VOYAGE_API_KEY a plataforma segue funcionando: a busca cai para texto e "isso pode ajudar" fica quieto.
export const DIMENSOES = 1024;
export const LIMIAR_AJUDA = Number(process.env.MEMORIA_LIMIAR ?? 0.78); // a calibrar com o uso

// só para desenvolvimento (EMBEDDING_FAKE=1): vetor de palavras, parecido só por vocabulário em comum
function embeddingFalso(texto: string): number[] {
  const v = new Array<number>(DIMENSOES).fill(0);
  const palavras = texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
  for (const p of palavras) {
    const raiz = p.slice(0, 5);
    let h = 5381;
    for (const c of raiz) h = (h * 33 + c.charCodeAt(0)) >>> 0;
    v[h % DIMENSOES] += 1;
  }
  const norma = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norma);
}

export async function gerarEmbedding(texto: string, tipo: "document" | "query" = "document"): Promise<number[] | null> {
  if (process.env.EMBEDDING_FAKE === "1" && process.env.NODE_ENV !== "production") return embeddingFalso(texto);
  const chave = process.env.VOYAGE_API_KEY;
  if (!chave || !texto.trim()) return null;
  const r = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "voyage-multilingual-2", input: [texto], input_type: tipo }),
  });
  if (!r.ok) return null;
  return ((await r.json()) as { data: { embedding: number[] }[] }).data[0].embedding;
}

export const textoParaEmbedding = (i: { titulo: string; corpo?: string | null; url?: string | null }) =>
  [i.titulo, i.corpo, i.url].filter(Boolean).join("\n");
