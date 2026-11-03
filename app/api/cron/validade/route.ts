import { NextResponse } from "next/server";
import { cronAutorizado } from "@/lib/cron";
import { supabaseAdmin } from "@/lib/supabase/admin";

// job diário, 6h: ideias vencidas expiram (saem do backlog, ficam na memória) e recortes esquecidos voltam
export async function GET(req: Request) {
  if (!cronAutorizado(req)) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  const admin = supabaseAdmin();
  const [{ data: expiradas }, { data: abandonados }] = await Promise.all([admin.rpc("expirar_ideias"), admin.rpc("abandonar_recortes")]);
  return NextResponse.json({ ok: true, ideias_expiradas: expiradas, recortes_abandonados: abandonados });
}
