// Whisper large-v3 atrás de uma função só, para trocar de provedor sem mexer no app.
// Provedor atual: Groq (mesmo modelo, hospedado).
export async function transcrever(audio: Blob, _opcoes: { falantes: boolean } = { falantes: false } // eslint-disable-line @typescript-eslint/no-unused-vars): Promise<string> {
  const chave = process.env.GROQ_API_KEY;
  if (!chave) throw new Error("GROQ_API_KEY não configurada");
  const form = new FormData();
  form.append("file", audio, "audio.webm");
  form.append("model", "whisper-large-v3");
  form.append("language", "pt");
  const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}` },
    body: form,
  });
  if (!r.ok) throw new Error(`transcrição falhou: ${r.status}`);
  return ((await r.json()) as { text: string }).text;
}
