import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServidor } from "@/lib/supabase/server";
import { primeiroPasso } from "@/lib/ia/primeiro-passo";

export const maxDuration = 60;

const corpo = z.object({ acao: z.enum(["arquivar", "priorizar"]), item_id: z.string().uuid() });

// resolve uma tarefa parada: arquivar (vai para a memória) ou priorizar (sobe para alta + primeiro passo)
export async function POST(req: Request) {
  const supabase = await supabaseServidor();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });
  const { acao, item_id } = corpo.parse(await req.json());

  const { data: tarefa } = await supabase.from("itens").select("id, titulo, corpo, projeto_id, parada_em, ultima_movimentacao").eq("id", item_id).single();
  if (!tarefa) return NextResponse.json({ erro: "tarefa não encontrada" }, { status: 404 });

  if (acao === "arquivar") {
    await supabase.from("itens").update({ status: "arquivada" }).eq("id", item_id);
    return NextResponse.json({ ok: true });
  }

  const { data: eu } = await supabase.from("pessoas").select("estados").eq("id", auth.user.id).single();
  // a tarefa sobe para alta e passa a ser dela, mesmo que estivesse sem responsável
  // ultima_movimentacao explícita: priorizar é movimento mesmo quando a tarefa já era alta
  await supabase.from("itens").update({ prioridade: "alta", responsavel_id: auth.user.id, ultima_movimentacao: new Date().toISOString() }).eq("id", item_id);
  const dias = Math.floor((Date.now() - new Date(tarefa.ultima_movimentacao).getTime()) / 86_400_000);

  try {
    const passo = await primeiroPasso({ tarefa: { id: tarefa.id, titulo: tarefa.titulo, corpo: tarefa.corpo }, estados: eu?.estados ?? [], diasParada: dias });
    const { data: filho } = await supabase
      .from("itens")
      .insert({
        tipo: "tarefa", titulo: passo.titulo, corpo: passo.mini_passos.map((p) => `- ${p}`).join("\n") || null,
        projeto_id: tarefa.projeto_id, autor_id: auth.user.id, responsavel_id: auth.user.id, pai_id: tarefa.id,
        origem: "faxina", estados: passo.estados, minutos_estimados: passo.minutos_estimados, status: "aberta",
      })
      .select("id")
      .single();
    return NextResponse.json({ ok: true, passo: { ...passo, filho_id: filho?.id } });
  } catch {
    return NextResponse.json({ ok: true, passo: null });
  }
}
