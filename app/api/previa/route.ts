import { NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/supabase/server";

// prévia de link para os cartões de referência: título, descrição e imagem da própria página
const PRIVADO = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[?::1)/i;

export async function GET(req: Request) {
  const supabase = await supabaseServidor();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({}, { status: 401 });

  const alvo = new URL(req.url).searchParams.get("url") ?? "";
  let url: URL;
  try { url = new URL(alvo); } catch { return NextResponse.json({}); }
  if (!/^https?:$/.test(url.protocol) || PRIVADO.test(url.hostname)) return NextResponse.json({});

  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(4000), headers: { "User-Agent": "moldura-gestao/previa" }, redirect: "follow" });
    const html = (await r.text()).slice(0, 200_000);
    const meta = (nome: string) =>
      html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${nome}["'][^>]*content=["']([^"']*)["']`, "i"))?.[1] ??
      html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${nome}["']`, "i"))?.[1];
    const titulo = meta("og:title") ?? html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
    const imagem = meta("og:image");
    return NextResponse.json(
      { titulo: titulo?.trim(), descricao: (meta("og:description") ?? meta("description"))?.trim(), imagem: imagem ? new URL(imagem, url).href : undefined, dominio: url.hostname.replace(/^www\./, "") },
      { headers: { "Cache-Control": "private, max-age=86400" } },
    );
  } catch {
    return NextResponse.json({ dominio: url.hostname.replace(/^www\./, "") });
  }
}
