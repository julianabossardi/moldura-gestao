import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServidor } from "@/lib/supabase/server";

// captura confirmada sozinha: "desfazer" arquiva o que ela criou; "está certo" só tira o aviso
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServidor();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });
  const { manter } = z.object({ manter: z.boolean().optional() }).parse(await req.json().catch(() => ({})));

  const { data: c } = await supabase.from("capturas").select("proposta").eq("id", id).single();
  if (!c) return NextResponse.json({ erro: "captura não encontrada" }, { status: 404 });
  const proposta = { ...(c.proposta as object), auto_visto: true };

  if (manter) {
    await supabase.from("capturas").update({ proposta }).eq("id", id);
    return NextResponse.json({ ok: true });
  }
  await supabase.from("itens").update({ status: "arquivada" }).eq("captura_id", id).neq("status", "arquivada");
  await supabase.from("capturas").update({ status: "recusada", proposta: { ...proposta, auto_desfeita: true } }).eq("id", id);
  return NextResponse.json({ ok: true });
}
