import { NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/supabase/server";
import { gerarEmbedding, LIMIAR_AJUDA } from "@/lib/embedding";

// "isso pode ajudar": os 3 itens de memória mais parecidos com uma tarefa (existente ou ainda sendo escrita)
export async function POST(req: Request) {
  const supabase = await supabaseServidor();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });
  const { item_id, texto } = (await req.json()) as { item_id?: string; texto?: string };

  if (item_id) {
    const { data } = await supabase.rpc("ajudas_para", { p_item: item_id, qtd: 3, limiar: LIMIAR_AJUDA });
    if (data?.length) return NextResponse.json({ ajudas: data });
  }
  if (texto && texto.trim().length >= 8) {
    const emb = await gerarEmbedding(texto, "query");
    if (emb) {
      const { data } = await supabase.rpc("ajudas_para_vetor", { consulta: JSON.stringify(emb), qtd: 3, limiar: LIMIAR_AJUDA, excluir: item_id ?? null });
      return NextResponse.json({ ajudas: data ?? [] });
    }
  }
  return NextResponse.json({ ajudas: [] });
}
