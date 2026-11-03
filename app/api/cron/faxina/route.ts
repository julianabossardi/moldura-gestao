import { NextResponse } from "next/server";
import { cronAutorizado } from "@/lib/cron";
import { supabaseAdmin } from "@/lib/supabase/admin";

// job quinzenal: tarefas abertas sem movimento há 30 dias são marcadas como paradas
export async function GET(req: Request) {
  if (!cronAutorizado(req)) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  const { data } = await supabaseAdmin().rpc("marcar_paradas");
  return NextResponse.json({ ok: true, marcadas: data });
}
