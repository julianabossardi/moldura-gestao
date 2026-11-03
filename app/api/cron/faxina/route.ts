import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// job quinzenal: tarefas abertas sem movimento há 30 dias são marcadas como paradas
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  const { data } = await supabaseAdmin().rpc("marcar_paradas");
  return NextResponse.json({ ok: true, marcadas: data });
}
