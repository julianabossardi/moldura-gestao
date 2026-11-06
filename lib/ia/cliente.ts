import Anthropic from "@anthropic-ai/sdk";
import type { ZodType } from "zod";

export const MODELO_RAPIDO = "claude-haiku-5-5";
export const MODELO_FORTE = "claude-sonnet-5-5";

const anthropic = new Anthropic();

// saída em JSON validada por schema; tenta uma vez de novo se falhar
export async function chamarJson<T>(opts: {
  modelo: string;
  sistema: string;
  usuario: string;
  schema: ZodType<T>;
  maxTokens?: number;
  semPensar?: boolean; // respostas longas: o raciocínio não pode comer o limite de tokens
}): Promise<T> {
  let ultimoErro: unknown;
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    try {
      const r = await anthropic.messages.create({
        model: opts.modelo,
        max_tokens: opts.maxTokens ?? 2000,
        ...(opts.semPensar ? { thinking: { type: "between_tools" } as never } : {}),
        system: `${opts.sistema}\n\nResponda apenas com JSON válido, sem texto antes ou depois.`,
        messages: [{ role: "user", content: opts.usuario }],
      });
      const texto = r.content.map((b) => (b.type === "text" ? b.text : "")).join("");
      const json = texto.slice(texto.indexOf("{"), texto.lastIndexOf("}") + 1);
      return opts.schema.parse(JSON.parse(json));
    } catch (e) {
      ultimoErro = e;
    }
  }
  throw ultimoErro;
}

export const VOZ =
  "Escreva na voz da moldura: frases curtas, simples, sem jargão de gestão, sem travessão e sem emoji. Tudo em português do Brasil.";
