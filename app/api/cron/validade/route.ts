import { NextResponse } from "next/server";
import { cronAutorizado } from "@/lib/cron";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { aplicarDestinos } from "@/lib/capturas";
import { diasAtras } from "@/lib/datas";
import type { Destino } from "@/lib/ia/schemas";

// job diário, 6h: ideias vencidas expiram (saem do backlog, ficam na memória), recortes esquecidos voltam
// e capturas esquecidas são confirmadas
export async function GET(req: Request) {
  if (!cronAutorizado(req)) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  const admin = supabaseAdmin();
  const [{ data: expiradas }, { data: abandonados }] = await Promise.all([admin.rpc("expirar_ideias"), admin.rpc("abandonar_recortes")]);

  // capturas sem confirmação há 3 dias são confirmadas como estão, para nada se perder.
  // as de clientes continuam esperando uma sócia.
  const { data: esperando } = await admin
    .from("capturas").select("id, autor_id, proposta, autor:pessoas!autor_id(papel)")
    .eq("status", "proposta").lt("criado_em", diasAtras(3));
  let confirmadas = 0;
  for (const c of esperando ?? []) {
    if ((c.autor as unknown as { papel: string } | null)?.papel !== "socia") continue;
    const destinos = ((c.proposta as { destinos?: Destino[] })?.destinos ?? []);
    const { pulados } = await aplicarDestinos(admin, { capturaId: c.id, destinos, autorId: c.autor_id, soCriar: true });
    await admin.from("capturas").update({ status: "confirmada", proposta: { ...(c.proposta as object), auto: true, auto_em: new Date().toISOString(), auto_pulados: pulados } }).eq("id", c.id);
    confirmadas++;
  }
  return NextResponse.json({ ok: true, ideias_expiradas: expiradas, recortes_abandonados: abandonados, capturas_confirmadas: confirmadas });
}
