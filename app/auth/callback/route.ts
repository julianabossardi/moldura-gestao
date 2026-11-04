import { NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/supabase/server";
import { destinoPosLogin } from "@/lib/destino-login";

// fluxo com código (PKCE), usado quando o próprio navegador pediu o link
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const supabase = await supabaseServidor();
  if (code) await supabase.auth.exchangeCodeForSession(code);
  return NextResponse.redirect(new URL(await destinoPosLogin(supabase), url.origin));
}
