import { NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hojeISO } from "@/lib/datas";
import { rodarRecorrencias } from "@/lib/recorrencia";
import { bancoSupabase } from "@/lib/recorrencia-banco";

// a sócia criou ou mexeu numa recorrência: cria já as tarefas do período atual, sem esperar o job das 9h.
// é a mesma rodada do cron, então repetir não duplica nada
export async function POST() {
  const supabase = await supabaseServidor();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });
  const { data: eu } = await supabase.from("pessoas").select("papel").eq("id", auth.user.id).single();
  if (eu?.papel !== "socia") return NextResponse.json({ erro: "só sócias" }, { status: 403 });
  const r = await rodarRecorrencias(bancoSupabase(supabaseAdmin()), hojeISO());
  return NextResponse.json({ ok: true, ...r });
}
