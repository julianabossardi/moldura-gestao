import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { cronAutorizado } from "../lib/cron";
import { extensaoDe } from "../lib/audio";
import { atrasada, importante } from "../lib/cartao";
import { hojeISO, diasAtras } from "../lib/datas";
import { propostaSchema, recortesSchema } from "../lib/ia/schemas";
import { mmss } from "../lib/reuniao/tipos";
import { textoParaEmbedding } from "../lib/embedding";

const segredoOriginal = process.env.CRON_SECRET;
afterEach(() => {
  if (segredoOriginal === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = segredoOriginal;
});
const req = (auth?: string) => new Request("http://x/api/cron/y", { headers: auth ? { authorization: auth } : {} });

test("cron: sem segredo configurado ninguém passa, nem 'Bearer undefined'", () => {
  delete process.env.CRON_SECRET;
  assert.equal(cronAutorizado(req("Bearer undefined")), false);
  assert.equal(cronAutorizado(req()), false);
  process.env.CRON_SECRET = "";
  assert.equal(cronAutorizado(req("Bearer ")), false);
});

test("cron: só passa com o segredo certo", () => {
  process.env.CRON_SECRET = "abc123";
  assert.equal(cronAutorizado(req("Bearer abc123")), true);
  assert.equal(cronAutorizado(req("Bearer errado")), false);
  assert.equal(cronAutorizado(req("abc123")), false);
  assert.equal(cronAutorizado(req()), false);
});

test("áudio: extensão acompanha o formato (Safari grava mp4)", () => {
  assert.equal(extensaoDe("audio/mp4"), "m4a");
  assert.equal(extensaoDe("audio/aac"), "m4a");
  assert.equal(extensaoDe("audio/webm;codecs=opus"), "webm");
  assert.equal(extensaoDe("audio/ogg"), "ogg");
  assert.equal(extensaoDe("audio/mpeg"), "mp3");
  assert.equal(extensaoDe("audio/wav"), "wav");
  assert.equal(extensaoDe(""), "webm");
});

test("cartão: importante = prioridade alta", () => {
  assert.equal(importante({ prioridade: "alta" }), true);
  assert.equal(importante({ prioridade: "media" }), false);
  assert.equal(importante({ prioridade: null }), false);
});

test("cartão: atrasada só vale para tarefa aberta com prazo vencido", () => {
  const ontem = diasAtras(2).slice(0, 10);
  const amanha = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
  assert.equal(atrasada({ tipo: "tarefa", status: "aberta", prazo: ontem }), true);
  assert.equal(atrasada({ tipo: "tarefa", status: "fazendo", prazo: ontem }), true);
  assert.equal(atrasada({ tipo: "tarefa", status: "concluida", prazo: ontem }), false);
  assert.equal(atrasada({ tipo: "ideia", status: "aberta", prazo: ontem }), false);
  assert.equal(atrasada({ tipo: "tarefa", status: "aberta", prazo: amanha }), false);
  assert.equal(atrasada({ tipo: "tarefa", status: "aberta", prazo: hojeISO() }), false);
  assert.equal(atrasada({ tipo: "tarefa", status: "aberta", prazo: null }), false);
});

test("schemas da IA: rejeitam proposta vazia e mais de 3 recortes", () => {
  assert.equal(propostaSchema.safeParse({ destinos: [] }).success, false);
  const ok = propostaSchema.safeParse({ destinos: [{ acao: "criar", tipo: "tarefa", titulo: "x" }] });
  assert.equal(ok.success, true);
  if (ok.success) assert.deepEqual(ok.data.destinos[0].tags, []);
  const recorte = { pai_id: "7b96c9da-6fb8-4d3e-9d3e-d3e3afb797cc", titulo: "t", minutos_estimados: 15, estados: ["leve"] };
  assert.equal(recortesSchema.safeParse({ recortes: [recorte] }).success, true);
  assert.equal(recortesSchema.safeParse({ recortes: [recorte, recorte, recorte, recorte] }).success, false);
  assert.equal(recortesSchema.safeParse({ recortes: [{ ...recorte, minutos_estimados: 0 }] }).success, false);
});

test("mmss formata minutos e segundos", () => {
  assert.equal(mmss(0), "00:00");
  assert.equal(mmss(65), "01:05");
  assert.equal(mmss(3599), "59:59");
});

test("textoParaEmbedding junta só o que existe", () => {
  assert.equal(textoParaEmbedding({ titulo: "a", corpo: null, url: "u" }), "a\nu");
  assert.equal(textoParaEmbedding({ titulo: "a" }), "a");
});
