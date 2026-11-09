import { NextResponse } from "next/server";
import { cronAutorizado } from "@/lib/cron";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hojeISO } from "@/lib/datas";
import { rodarRecorrencias } from "@/lib/recorrencia";
import { bancoSupabase } from "@/lib/recorrencia-banco";

// job diário: o que ficou aberto de um período que acabou vira expirada, e o período de hoje ganha as tarefas que faltam.
// rodar duas vezes no mesmo dia não duplica nada
export async function GET(req: Request) {
  if (!cronAutorizado(req)) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  const r = await rodarRecorrencias(bancoSupabase(supabaseAdmin()), hojeISO());
  return NextResponse.json({ ok: true, ...r });
}
