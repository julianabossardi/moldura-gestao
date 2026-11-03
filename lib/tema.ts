import type { CSSProperties } from "react";

export type Tema = { cor_fundo: string; cor_texto: string; cor_destaque: string; fonte?: string; icone?: string };

// tema do projeto vira variáveis CSS; o esqueleto da tela continua o da moldura
export function temaParaCss(tema: Tema): CSSProperties {
  return {
    "--tema-fundo": tema.cor_fundo,
    "--tema-texto": tema.cor_texto,
    "--m-ink": tema.cor_texto,
    "--m-ink-soft": tema.cor_texto,
    "--m-crimson": tema.cor_destaque,
    "--m-crimson-deep": tema.cor_destaque,
    "--tema-fonte": tema.fonte ? `"${tema.fonte}"` : "var(--m-font-sans)",
  } as CSSProperties;
}
