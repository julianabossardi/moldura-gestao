// cada navegador grava num formato: Chrome e Firefox em webm, Safari (iPhone) em mp4.
// o nome do arquivo precisa acompanhar o formato, senão a transcrição recusa.
const CANDIDATOS = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac", "audio/ogg"];

export function formatoDeGravacao(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return CANDIDATOS.find((t) => MediaRecorder.isTypeSupported(t));
}

export function extensaoDe(tipo: string): string {
  if (tipo.includes("mp4") || tipo.includes("aac") || tipo.includes("m4a")) return "m4a";
  if (tipo.includes("ogg")) return "ogg";
  if (tipo.includes("mpeg")) return "mp3";
  if (tipo.includes("wav")) return "wav";
  return "webm";
}

// abre o microfone e explica o motivo quando não dá
export async function abrirMicrofone(): Promise<{ stream?: MediaStream; erro?: string }> {
  if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return { erro: "este navegador não deixa gravar aqui. a gravação precisa de uma conexão segura (https)." };
  }
  try {
    return { stream: await navigator.mediaDevices.getUserMedia({ audio: true }) };
  } catch (e) {
    const nome = (e as DOMException).name;
    if (nome === "NotAllowedError") return { erro: "o microfone está bloqueado. libere nas permissões do navegador e tente de novo." };
    if (nome === "NotFoundError") return { erro: "não encontrei um microfone neste aparelho." };
    return { erro: "não consegui abrir o microfone agora." };
  }
}
