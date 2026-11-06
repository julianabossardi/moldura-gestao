import { test } from "node:test";
import assert from "node:assert/strict";
import { aplicarGlossario, lerGlossario, lerProjetos, recorteDoContexto, carregarContexto } from "../lib/reuniao/contexto";

const g = lerGlossario("# x\nnews | new => newsletter\nnova ativa | inovativa => Inovativa\nbnds | brds => BNDES\n");

test("glossário: troca palavra inteira, sem diferenciar maiúscula", () => {
  assert.equal(aplicarGlossario("a revisão da News e a New", g), "a revisão da newsletter e a newsletter");
  assert.equal(aplicarGlossario("abrir o BNDS e o BRDS", g), "abrir o BNDES e o BNDES");
});

test("glossário: não mexe no meio de outra palavra", () => {
  assert.equal(aplicarGlossario("newsletter, renew e news", g), "newsletter, renew e newsletter");
});

test("glossário: termo maior vence ('nova ativa')", () => {
  assert.equal(aplicarGlossario("aquele nova ativa", g), "aquele Inovativa");
});

test("projetos: divide por seção", () => {
  const p = lerProjetos("# t\n## geral\n- a\n## folga\n- b\n- c\n");
  assert.deepEqual(Object.keys(p), ["geral", "folga"]);
  assert.equal(p.folga, "- b\n- c");
});

test("recorte: leva geral e só os projetos citados", () => {
  const c = { papeis: "PAPEIS", estado: "ESTADO", projetos: { geral: "G", folga: "F", moldura: "M" }, glossario: [] };
  const r = recorteDoContexto(c, ["folga"]);
  assert.match(r, /PAPEIS/);
  assert.match(r, /## geral/);
  assert.match(r, /## folga/);
  assert.doesNotMatch(r, /## moldura/);
  assert.match(r, /ESTADO/);
});

test("contexto real da pasta carrega", () => {
  const c = carregarContexto();
  assert.ok(c.papeis.includes("juliana"));
  assert.ok(c.projetos.folga.includes("11/12/2026"));
  assert.ok(c.glossario.length >= 4);
});

import { diferencas, conferirTrechos, altaForaDoFolga } from "../lib/reuniao/conferir";
import { propostaReuniaoSchema } from "../lib/reuniao/tipos";

const prop = (slug: string, novas: object[]) => propostaReuniaoSchema.parse({ projetos: [{ projeto_slug: slug, novas }] });

test("conferir: diferenças pelo título, ignorando acento e maiúscula", () => {
  const a = prop("folga", [{ titulo: "Subir os termos de uso" }, { titulo: "ajeitar o mapa" }]);
  const d = prop("folga", [{ titulo: "ajeitar o MAPA" }, { titulo: "pegar o número DUNS" }]);
  assert.deepEqual(diferencas(a, d), ["saiu (tarefa, folga): Subir os termos de uso", "entrou (tarefa, folga): pegar o número DUNS"]);
});

test("conferir: apaga trecho que não está na transcrição", () => {
  const p = prop("folga", [
    { titulo: "a", trecho: "eu vou postar hoje" },
    { titulo: "b", trecho: "frase inventada que ninguém disse" },
  ]);
  const ruins = conferirTrechos(p, "tem um post, já que Eu vou postar  hoje, né");
  assert.deepEqual(ruins, ["b"]);
  assert.equal(p.projetos[0].novas[1].trecho, null);
  assert.ok(p.projetos[0].novas[0].trecho);
});

test("conferir: acha alta fora do folga", () => {
  const p = propostaReuniaoSchema.parse({
    projetos: [
      { projeto_slug: "folga", novas: [{ titulo: "x", prioridade: "alta" }] },
      { projeto_slug: "moldura", novas: [{ titulo: "y", prioridade: "alta" }, { titulo: "z", prioridade: "media" }] },
    ],
  });
  assert.deepEqual(altaForaDoFolga(p, ["folga"]), ["y"]);
});
