import { test } from "node:test";
import assert from "node:assert/strict";
import { sprintAtual, naSprint } from "../lib/sprint";

test("sprint 1, primeiro dia", () => {
  assert.deepEqual(sprintAtual("2026-11-02", "2026-11-02"), { numero: 1, inicio: "2026-11-02", fim: "2026-11-15", dia: 1, restam: 13, comecou: true });
});

test("último dia da sprint 1 e primeiro da 2", () => {
  const s1 = sprintAtual("2026-11-02", "2026-11-15");
  assert.equal(s1.numero, 1);
  assert.equal(s1.dia, 14);
  assert.equal(s1.restam, 0);
  const s2 = sprintAtual("2026-11-02", "2026-11-16");
  assert.deepEqual([s2.numero, s2.inicio, s2.fim, s2.dia], [2, "2026-11-16", "2026-11-29", 1]);
});

test("atravessa mês e ano", () => {
  const s = sprintAtual("2026-11-02", "2027-01-05");
  assert.equal(s.numero, 5);
  assert.equal(s.inicio, "2026-12-28");
  assert.equal(s.fim, "2027-01-10");
});

test("antes do início: sprint 1 ainda não começou", () => {
  const s = sprintAtual("2026-11-16", "2026-11-05");
  assert.equal(s.comecou, false);
  assert.equal(s.numero, 1);
  assert.equal(s.dia, 0);
});

test("aceita data com hora", () => {
  assert.equal(sprintAtual("2026-11-02T03:00:00Z", "2026-11-05T23:59:00Z").dia, 4);
});

test("naSprint: em andamento sempre; aberta só com prazo até o fim", () => {
  const s = sprintAtual("2026-11-02", "2026-11-05");
  assert.equal(naSprint({ status: "fazendo", prazo: null }, s), true);
  assert.equal(naSprint({ status: "aberta", prazo: "2026-11-15" }, s), true);
  assert.equal(naSprint({ status: "aberta", prazo: "2026-10-01" }, s), true);
  assert.equal(naSprint({ status: "aberta", prazo: "2026-11-16" }, s), false);
  assert.equal(naSprint({ status: "aberta", prazo: null }, s), false);
  assert.equal(naSprint({ status: "concluida", prazo: "2026-11-10" }, s), false);
});
