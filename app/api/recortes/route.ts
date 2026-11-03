import { NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/supabase/server";
import { gerarRecortes, type Candidata } from "@/lib/ia/recortes";

export const maxDuration = 60;
const PESO = { alta: 0, media: 1, baixa: 2 } as const;

export async function POST(req: Request) {
  const supabase = await supabaseServidor();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });
  const { projeto_id, minutos, estados, quantidade } = await req.json();

  const { data: eu } = await supabase.from("pessoas").select("preferencias").eq("id", auth.user.id).single();
  // candidatas: tarefas abertas do projeto do dia, minhas ou sem responsável
  const { data: tarefas } = await supabase
    .from("itens")
    .select("id, titulo, corpo, prioridade, prazo, ultima_movimentacao")
    .eq("tipo", "tarefa")
    .eq("status", "aberta")
    .eq("projeto_id", projeto_id)
    .or(`responsavel_id.eq.${auth.user.id},responsavel_id.is.null`);

  const ordenadas = (tarefas ?? [])
    .sort(
      (a, b) =>
        PESO[(a.prioridade ?? "media") as keyof typeof PESO] - PESO[(b.prioridade ?? "media") as keyof typeof PESO] ||
        (a.prazo ?? "9999").localeCompare(b.prazo ?? "9999") ||
        a.ultima_movimentacao.localeCompare(b.ultima_movimentacao),
    )
    .slice(0, 5);
  if (!ordenadas.length) return NextResponse.json({ recortes: [], titulos: {} });

  const { data: filhos } = await supabase
    .from("itens")
    .select("pai_id, titulo")
    .in("pai_id", ordenadas.map((t) => t.id));
  const candidatas: Candidata[] = ordenadas.map((t) => ({
    id: t.id,
    titulo: t.titulo,
    corpo: t.corpo,
    prioridade: t.prioridade,
    prazo: t.prazo,
    recortes_anteriores: (filhos ?? []).filter((f) => f.pai_id === t.id).map((f) => f.titulo),
  }));

  try {
    const { recortes } = await gerarRecortes({
      candidatas,
      minutos,
      estados,
      quantidade,
      tamanho: ((eu?.preferencias as { tamanho_recorte?: string })?.tamanho_recorte as "pequeno" | "medio") ?? "medio",
    });
    const validos = recortes.filter((r) => ordenadas.some((t) => t.id === r.pai_id));
    return NextResponse.json({ recortes: validos, titulos: Object.fromEntries(ordenadas.map((t) => [t.id, t.titulo])) });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 502 });
  }
}
