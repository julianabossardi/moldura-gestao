import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServidor } from "@/lib/supabase/server";
import { destinoSchema } from "@/lib/ia/schemas";
import { aplicarDestinos } from "@/lib/capturas";

const corpoSchema = z.object({ destinos: z.array(destinoSchema), recusar: z.boolean().optional() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServidor();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  const { destinos, recusar } = corpoSchema.parse(await req.json());
  if (recusar) {
    await supabase.from("capturas").update({ status: "recusada" }).eq("id", id);
    return NextResponse.json({ ok: true });
  }
  await aplicarDestinos(supabase, { capturaId: id, destinos, autorId: auth.user.id });
  await supabase.from("capturas").update({ status: "confirmada" }).eq("id", id);
  return NextResponse.json({ ok: true });
}
