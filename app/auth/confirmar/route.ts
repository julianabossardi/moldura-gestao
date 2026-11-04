import { NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/supabase/server";
import { destinoPosLogin } from "@/lib/destino-login";

// link mágico com token_hash: funciona em qualquer aparelho, inclusive para convites enviados pelo servidor
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token_hash = url.searchParams.get("token_hash");
  const supabase = await supabaseServidor();
  if (token_hash) {
    const { error } = await supabase.auth.verifyOtp({ type: "email", token_hash });
    if (error) return NextResponse.redirect(new URL("/login?erro=link", url.origin));
  }
  return NextResponse.redirect(new URL(await destinoPosLogin(supabase), url.origin));
}
