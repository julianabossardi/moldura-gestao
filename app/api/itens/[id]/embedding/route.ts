import { NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/supabase/server";
import { gerarEmbedding, textoParaEmbedding } from "@/lib/embedding";

// gera o embedding de um item ao criar ou editar (título + texto + link)
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServidor();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });
  const { data: item } = await supabase.from("itens").select("titulo, corpo, url").eq("id", id).single();
  if (!item) return NextResponse.json({ erro: "item não encontrado" }, { status: 404 });
  const emb = await gerarEmbedding(textoParaEmbedding(item));
  if (!emb) return NextResponse.json({ ok: false, motivo: "sem provedor de embeddings" });
  await supabase.from("itens").update({ embedding: JSON.stringify(emb) }).eq("id", id);
  return NextResponse.json({ ok: true });
}
