import type { Segmento } from "./reuniao/tipos";

// WhisperX (Whisper large-v3 + separação de falantes) em GPU sob demanda, via Replicate.
// o modelo é o mesmo em qualquer provedor: trocar de provedor é trocar só este arquivo.
const MODELO = "victor-upmeet/whisperx";
let versaoEmCache: string | null = null;

const cabecalho = () => ({ Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`, "Content-Type": "application/json" });

async function versao(): Promise<string> {
  if (versaoEmCache) return versaoEmCache;
  const r = await fetch(`https://api.replicate.com/v1/models/${MODELO}`, { headers: cabecalho() });
  if (!r.ok) throw new Error(`replicate: ${r.status}`);
  versaoEmCache = ((await r.json()) as { latest_version: { id: string } }).latest_version.id;
  return versaoEmCache;
}

export async function iniciarWhisperx(urlAudio: string): Promise<string> {
  if (!process.env.REPLICATE_API_TOKEN) throw new Error("REPLICATE_API_TOKEN não configurada");
  const r = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: cabecalho(),
    body: JSON.stringify({
      version: await versao(),
      input: {
        audio_file: urlAudio,
        language: "pt",
        diarization: true,
        huggingface_access_token: process.env.HUGGINGFACE_TOKEN,
        min_speakers: 2,
        max_speakers: 4,
      },
    }),
  });
  if (!r.ok) throw new Error(`replicate: ${r.status}`);
  return ((await r.json()) as { id: string }).id;
}

export async function consultarWhisperx(id: string): Promise<{ status: "andando" | "pronto" | "erro"; segmentos?: Segmento[]; erro?: string }> {
  const r = await fetch(`https://api.replicate.com/v1/predictions/${id}`, { headers: cabecalho() });
  if (!r.ok) throw new Error(`replicate: ${r.status}`);
  const j = (await r.json()) as { status: string; error?: string; output?: { segments: { start: number; end: number; text: string; speaker?: string }[] } };
  if (j.status === "succeeded") {
    return {
      status: "pronto",
      segmentos: (j.output?.segments ?? []).map((s) => ({ falante: s.speaker ?? "SPEAKER_00", inicio: s.start, fim: s.end, texto: s.text.trim() })),
    };
  }
  if (j.status === "failed" || j.status === "canceled") return { status: "erro", erro: j.error ?? j.status };
  return { status: "andando" };
}

// só para desenvolvimento sem GPU: TRANSCRICAO_FAKE=1 devolve uma conversa de exemplo
export function segmentosDeExemplo(bloco: number): Segmento[] {
  if (bloco > 0) return [];
  return [
    { falante: "SPEAKER_00", inicio: 2, fim: 9, texto: "bora começar pelo folga. o mapa está quase pronto, falta fechar os filtros." },
    { falante: "SPEAKER_01", inicio: 10, fim: 18, texto: "eu pego os filtros de categoria essa semana. e a gente decide que o mapa só mostra hoje e amanhã." },
    { falante: "SPEAKER_00", inicio: 19, fim: 24, texto: "fechado. e uma ideia: um roteiro de domingo na zona sul." },
    { falante: "SPEAKER_02", inicio: 40, fim: 47, texto: "no site da moldura, preciso do texto da página como fazemos até sexta." },
  ];
}
