import { test } from "node:test";
import assert from "node:assert/strict";
import { variacaoSemana, type Metrica } from "../lib/metricas";
import { camposDoProximo, ordenarMarcos, proximoMarco, type Marco } from "../lib/marcos";
import { ehRapido, normalizarUrl } from "../lib/links";

const HOJE = new Date("2026-11-10T12:00:00Z");
const metrica = (o: Partial<Metrica>): Metrica => ({ rotulo: "visitas", fonte: "manual", ...o });

test("variacaoSemana: sem valor atual não há variação", () => {
  assert.equal(variacaoSemana(metrica({ valor: null }), HOJE), null);
  assert.equal(variacaoSemana(metrica({}), HOJE), null);
});

test("variacaoSemana: sem histórico antigo não há variação", () => {
  assert.equal(variacaoSemana(metrica({ valor: 10 }), HOJE), null);
  assert.equal(variacaoSemana(metrica({ valor: 10, historico: [{ data: "2026-11-08", valor: 5 }] }), HOJE), null);
});

test("variacaoSemana: compara com o valor mais recente de 7 dias ou mais atrás", () => {
  const m = metrica({
    valor: 120,
    historico: [
      { data: "2026-10-20", valor: 50 },
      { data: "2026-11-03", valor: 100 }, // exatamente 7 dias: conta
      { data: "2026-11-09", valor: 115 }, // recente demais
    ],
  });
  assert.equal(variacaoSemana(m, HOJE), 20);
});

test("variacaoSemana: pode ser negativa e não depende da ordem do histórico", () => {
  const m = metrica({ valor: 80, historico: [{ data: "2026-11-01", valor: 90 }, { data: "2026-10-01", valor: 10 }] });
  assert.equal(variacaoSemana(m, HOJE), -10);
});

const marcos: Marco[] = [
  { titulo: "lançamento", data: "2026-12-01", feito: false },
  { titulo: "sem data", data: null, feito: false },
  { titulo: "briefing", data: "2026-10-01", feito: true },
  { titulo: "protótipo", data: "2026-11-15", feito: false },
];

test("ordenarMarcos: por data, sem data no fim, sem alterar o original", () => {
  const copia = [...marcos];
  assert.deepEqual(ordenarMarcos(marcos).map((m) => m.titulo), ["briefing", "protótipo", "lançamento", "sem data"]);
  assert.deepEqual(marcos, copia);
});

test("proximoMarco: primeiro não feito; nulo quando tudo foi feito", () => {
  assert.equal(proximoMarco(marcos)?.titulo, "protótipo");
  assert.equal(proximoMarco(marcos.map((m) => ({ ...m, feito: true }))), null);
  assert.equal(proximoMarco([]), null);
});

test("camposDoProximo alimenta o portal do cliente", () => {
  assert.deepEqual(camposDoProximo(marcos), { proximo_marco: "protótipo", proximo_marco_em: "2026-11-15" });
  assert.deepEqual(camposDoProximo([]), { proximo_marco: null, proximo_marco_em: null });
});

test("links: rápido é qualquer tipo menos documento e sem tipo", () => {
  assert.equal(ehRapido({ titulo: "a", url: "x", tipo: "site" }), true);
  assert.equal(ehRapido({ titulo: "a", url: "x", tipo: "documento" }), false);
  assert.equal(ehRapido({ titulo: "a", url: "x" }), false);
});

test("normalizarUrl: acrescenta https e apara espaços", () => {
  assert.equal(normalizarUrl("  exemplo.com/a "), "https://exemplo.com/a");
  assert.equal(normalizarUrl("http://exemplo.com"), "http://exemplo.com");
  assert.equal(normalizarUrl("https://exemplo.com"), "https://exemplo.com");
});
