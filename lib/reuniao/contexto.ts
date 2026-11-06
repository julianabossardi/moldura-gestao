import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

// área de contexto: arquivos em contexto/ que o app cruza com o que foi dito na reunião

export type Troca = { de: string[]; para: string };
export type Contexto = { papeis: string; estado: string; projetos: Record<string, string>; glossario: Troca[] };

export function lerGlossario(texto: string): Troca[] {
  const trocas: Troca[] = [];
  for (const linha of texto.split("\n")) {
    if (linha.startsWith("#") || !linha.includes("=>")) continue;
    const [esq, dir] = linha.split("=>");
    const de = esq.split("|").map((t) => t.trim()).filter(Boolean);
    const para = dir.trim();
    if (de.length && para) trocas.push({ de, para });
  }
  return trocas;
}

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// troca palavra inteira, sem diferenciar maiúscula; termos maiores primeiro ("nova ativa" antes de "nova")
export function aplicarGlossario(texto: string, glossario: Troca[]): string {
  const pares = glossario.flatMap((t) => t.de.map((de) => ({ de, para: t.para }))).sort((a, b) => b.de.length - a.de.length);
  let saida = texto;
  for (const { de, para } of pares) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapar(de)}(?![\\p{L}\\p{N}])`, "giu");
    saida = saida.replace(re, para);
  }
  return saida;
}

export function lerProjetos(texto: string): Record<string, string> {
  const secoes: Record<string, string> = {};
  let atual: string | null = null;
  for (const linha of texto.split("\n")) {
    const m = linha.match(/^##\s+(.+?)\s*$/);
    if (m) {
      atual = m[1].toLowerCase();
      secoes[atual] = "";
    } else if (atual) secoes[atual] += `${linha}\n`;
  }
  for (const k of Object.keys(secoes)) secoes[k] = secoes[k].trim();
  return secoes;
}

export function carregarContexto(pasta = path.join(process.cwd(), "contexto")): Contexto {
  const ler = (nome: string) => (existsSync(path.join(pasta, nome)) ? readFileSync(path.join(pasta, nome), "utf8") : "");
  return {
    papeis: ler("papeis.md"),
    estado: ler("estado.md"),
    projetos: lerProjetos(ler("projetos.md")),
    glossario: lerGlossario(ler("glossario.md")),
  };
}

// só o que se relaciona com a reunião: papéis, estado, regras gerais e os projetos citados
export function recorteDoContexto(c: Contexto, slugs: string[]): string {
  const quais = ["geral", ...slugs.map((s) => s.toLowerCase())].filter((s, i, a) => a.indexOf(s) === i && c.projetos[s]);
  const projetos = quais.map((s) => `## ${s}\n${c.projetos[s]}`).join("\n\n");
  return [c.papeis.trim(), projetos, c.estado.trim()].filter(Boolean).join("\n\n");
}
