import { test } from "node:test";
import assert from "node:assert/strict";
import { aplicarPasso2 } from "../lib/reuniao/passo2";
import { propostaReuniaoSchema } from "../lib/reuniao/tipos";

const contexto = { papeis: "", estado: "", projetos: {}, glossario: [{ de: ["fogga"], para: "folga" }] };
const segmentos = [{ falante: "A", inicio: 0, fim: 5, texto: "a gente vai subir o fogga amanhã de manhã" }];
const base = propostaReuniaoSchema.parse({
  resumo: "r",
  projetos: [{ projeto_slug: "moldura", novas: [{ tipo: "tarefa", titulo: "subir o site", prioridade: "alta" }] }],
});

test("cruza, confere o trecho no código e junta as notas", async () => {
  const cruzar = async ({ transcricao }: { transcricao?: string }) => {
    assert.match(transcricao ?? "", /subir o folga/); // glossário aplicado antes
    return propostaReuniaoSchema.parse({
      ...base,
      notas: ["do modelo"],
      projetos: [{ projeto_slug: "moldura", novas: [
        { tipo: "tarefa", titulo: "subir o folga", prioridade: "alta", trecho: "subir o folga amanhã" },
        { tipo: "tarefa", titulo: "inventada", trecho: "texto que ninguém falou" },
      ] }],
    });
  };
  const { proposta: r, conferencia, erro } = await aplicarPasso2({ proposta: base, segmentos, contexto }, cruzar);
  assert.equal(erro, null);
  const novas = r.projetos[0].novas;
  assert.equal(novas[0].trecho, "subir o folga amanhã");
  assert.equal(novas[1].trecho, null); // não existe na transcrição
  assert.ok(conferencia.trechos_apagados.includes("inventada"));
  assert.deepEqual(conferencia.altas_fora, ["subir o folga"]); // alta fora do folga (o projeto é "moldura")
  assert.ok(conferencia.mudou.some((l) => l.includes("inventada")));
  assert.deepEqual(r.notas, ["do modelo"]); // as notas do modelo ficam separadas da conferência
});

test("se o cruzamento falha, a leitura direta segue, o erro volta e a conferência roda mesmo assim", async () => {
  const r = await aplicarPasso2({ proposta: base, segmentos, contexto }, async () => { throw new Error("fora do ar"); });
  assert.equal(r.proposta.projetos[0].novas[0].titulo, "subir o site");
  assert.equal(r.erro, "fora do ar");
  assert.deepEqual(r.conferencia.altas_fora, ["subir o site"]);
});

test("a mesma tarefa para donos diferentes aparece na conferência", async () => {
  const dupla = propostaReuniaoSchema.parse({
    projetos: [{ projeto_slug: "folga", novas: [
      { tipo: "tarefa", titulo: "Revisar o site", responsavel: "juliana" },
      { tipo: "tarefa", titulo: "revisar o site", responsavel: "viviane" },
    ] }],
  });
  const r = await aplicarPasso2({ proposta: dupla, segmentos, contexto }, async ({ proposta }) => proposta);
  assert.equal(r.conferencia.mesmo_titulo.length, 1);
  assert.match(r.conferencia.mesmo_titulo[0], /juliana, viviane/);
  assert.deepEqual(r.proposta.projetos[0].novas.map((t) => t.titulo), ["Revisar o site (juliana)", "revisar o site (viviane)"]);
});
