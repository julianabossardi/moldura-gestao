import { NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/supabase/server";
import { consultarWhisperx, iniciarWhisperx, segmentosDeExemplo } from "@/lib/whisperx";
import { BLOCO_SEGUNDOS, type BlocoFila, type Segmento } from "@/lib/reuniao/tipos";

export const maxDuration = 60;

// avança a transcrição um passo: a tela chama de tempos em tempos enquanto a reunião está "processando".
// cada bloco de 10 minutos vira uma tarefa na GPU; quando todos voltam, junta tudo numa transcrição só.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServidor();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  const { data: r } = await supabase.from("reunioes").select("*").eq("id", id).single();
  if (!r) return NextResponse.json({ erro: "reunião não encontrada" }, { status: 404 });
  if (r.status !== "processando" || r.transcricao) return NextResponse.json({ pronta: !!r.transcricao });

  const fila: BlocoFila[] = r.fila ?? (r.audio_paths as string[]).map((path) => ({ path, prediction: null, segmentos: null }));
  try {
    for (const [i, b] of fila.entries()) {
      if (b.segmentos || b.erro) continue;
      if (process.env.TRANSCRICAO_FAKE === "1") {
        b.segmentos = segmentosDeExemplo(i);
      } else if (!b.prediction) {
        const { data } = await supabase.storage.from("midia").createSignedUrl(b.path, 7200);
        if (!data) throw new Error("não achei o áudio do bloco");
        b.prediction = await iniciarWhisperx(data.signedUrl);
      } else {
        const s = await consultarWhisperx(b.prediction);
        if (s.status === "pronto") b.segmentos = s.segmentos ?? [];
        if (s.status === "erro") b.erro = s.erro ?? "falhou";
      }
    }
  } catch (e) {
    await supabase.from("reunioes").update({ fila }).eq("id", id);
    return NextResponse.json({ erro: (e as Error).message }, { status: 502 });
  }

  const prontos = fila.every((b) => b.segmentos || b.erro);
  if (!prontos) {
    await supabase.from("reunioes").update({ fila }).eq("id", id);
    return NextResponse.json({ pronta: false, blocos: fila.length, feitos: fila.filter((b) => b.segmentos).length });
  }

  const transcricao: Segmento[] = fila.flatMap((b, i) =>
    (b.segmentos ?? []).map((s) => ({ ...s, inicio: s.inicio + i * BLOCO_SEGUNDOS, fim: s.fim + i * BLOCO_SEGUNDOS })),
  );
  // pré-seleciona a associação da última reunião aprovada; a pessoa confirma de novo
  const { data: anterior } = await supabase.from("reunioes").select("falantes").eq("status", "aprovada").order("criado_em", { ascending: false }).limit(1);
  const antes = (anterior?.[0]?.falantes ?? {}) as Record<string, string | null>;
  const falantes = Object.fromEntries([...new Set(transcricao.map((s) => s.falante))].sort().map((f) => [f, antes[f] ?? null]));

  await supabase.from("reunioes").update({ fila, transcricao, falantes }).eq("id", id);
  return NextResponse.json({ pronta: true });
}
