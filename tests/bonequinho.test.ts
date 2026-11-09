import { test } from "node:test";
import assert from "node:assert/strict";
import { chaveSprite, estadoDoBonequinho, type ResumoPessoa } from "../lib/estados-bonequinho";

const AGORA = new Date("2026-11-10T12:00:00Z").getTime();
const horasAtras = (h: number) => new Date(AGORA - h * 3_600_000).toISOString();
const pessoa = (o: Partial<ResumoPessoa> = {}): ResumoPessoa => ({
  id: "1", nome: "Juliana", estados: null, fazendo_id: null, fazendo_titulo: null,
  concluidos_7d: 0, ultima_atividade: horasAtras(1), feliz: false, ...o,
});

test("sem estado nenhum, fica neutro", () => {
  const e = estadoDoBonequinho(pessoa(), AGORA);
  assert.equal(e.sprite, "neutro");
  assert.equal(e.rotulo, "sem estado");
  assert.deepEqual(e.simbolos, []);
});

test("um estado base vira o sprite", () => {
  assert.equal(estadoDoBonequinho(pessoa({ estados: ["criativa"] }), AGORA).sprite, "criativa");
});

test("vários estados mostram os símbolos lado a lado", () => {
  const e = estadoDoBonequinho(pessoa({ estados: ["leve", "focada"] }), AGORA);
  assert.equal(e.sprite, "leve");
  assert.deepEqual(e.simbolos, ["leve", "focada"]);
  assert.equal(e.rotulo, "distraída + focada"); // "leve" aparece como "distraída"
});

test("estados desconhecidos são ignorados", () => {
  assert.equal(estadoDoBonequinho(pessoa({ estados: ["xyz"] }), AGORA).sprite, "neutro");
});

test("3 dias sem atividade: dormindo, mesmo se feliz ou em fogo", () => {
  const e = estadoDoBonequinho(pessoa({ ultima_atividade: horasAtras(72), feliz: true, concluidos_7d: 9 }), AGORA);
  assert.equal(e.sprite, "dormindo");
  assert.deepEqual(e.simbolos, []);
});

test("2 dias e meio sem atividade ainda não dorme", () => {
  assert.notEqual(estadoDoBonequinho(pessoa({ ultima_atividade: horasAtras(60) }), AGORA).sprite, "dormindo");
});

test("feliz vence pegando fogo", () => {
  assert.equal(estadoDoBonequinho(pessoa({ feliz: true, concluidos_7d: 8 }), AGORA).sprite, "feliz");
});

test("5 concluídos em 7 dias pega fogo; 4 não", () => {
  assert.equal(estadoDoBonequinho(pessoa({ concluidos_7d: 5 }), AGORA).sprite, "pegando-fogo");
  assert.equal(estadoDoBonequinho(pessoa({ concluidos_7d: 4 }), AGORA).sprite, "neutro");
});

test("chaveSprite: apelidos, acentos e desconhecidos", () => {
  assert.equal(chaveSprite("Lari"), "larissa");
  assert.equal(chaveSprite("Vivi Souza"), "viviane");
  assert.equal(chaveSprite("Juliana Bossardi"), "juliana");
  assert.equal(chaveSprite("JULIANA"), "juliana");
  assert.equal(chaveSprite("Larissa"), "larissa");
  assert.equal(chaveSprite("Zé"), "padrao");
  assert.equal(chaveSprite(""), "padrao");
});

test("normal usa o boneco neutro e some quando há outro estado junto", () => {
  const so = estadoDoBonequinho(pessoa({ estados: ["normal"] }), AGORA);
  assert.equal(so.sprite, "neutro");
  assert.equal(so.rotulo, "normal");
  assert.deepEqual(so.simbolos, []);
  const junto = estadoDoBonequinho(pessoa({ estados: ["normal", "focada"] }), AGORA);
  assert.equal(junto.sprite, "focada");
  assert.equal(junto.rotulo, "focada");
});
