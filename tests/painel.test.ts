import { test } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { montarPainel } from "../lib/reuniao/painel";
import { painelNovo } from "../lib/reuniao/tipos";

// cliente falso: cada .from() devolve uma corrente que ignora filtros e resolve com os dados da tabela.
// "itens" é consultado duas vezes, na ordem: mexidos desde a reunião anterior, depois abertos.
function falso(t: { projetos: unknown[]; pessoas: unknown[]; mexidos: unknown[]; abertos: unknown[] }) {
  let chamadasItens = 0;
  return {
    from(tabela: string) {
      const dados = tabela === "projetos" ? t.projetos : tabela === "pessoas" ? t.pessoas : chamadasItens++ === 0 ? t.mexidos : t.abertos;
      const corrente: Record<string, unknown> = new Proxy({}, {
        get: (_, prop) => (prop === "then" ? (res: (v: unknown) => unknown) => res({ data: dados }) : () => corrente),
      });
      return corrente;
    },
  } as unknown as SupabaseClient;
}

const DESDE = "2026-11-01T00:00:00.000Z";
const item = (o: Record<string, unknown>) => ({
  id: String(Math.random()), tipo: "tarefa", titulo: "t", status: "aberta", prioridade: "media", origem: "manual", prazo: null,
  projeto_id: "p1", responsavel_id: "u1", autor_id: "u2", validade: null,
  criado_em: "2026-10-01T00:00:00Z", ultima_movimentacao: "2026-10-01T00:00:00Z", pai_id: null, ...o,
});
const base = {
  projetos: [{ id: "p1", slug: "folga", nome: "folga" }, { id: "p2", slug: "vetor", nome: "vetor" }],
  pessoas: [{ id: "u1", nome: "Juliana" }, { id: "u2", nome: "Lari" }],
};

test("separa em andamento, feito, falta, entregas, novas e ideias por projeto", async () => {
  const fazendo = item({ titulo: "fazendo", status: "fazendo" });
  const feita = item({ titulo: "feita", status: "concluida", ultima_movimentacao: "2026-11-02T00:00:00Z" });
  const nova = item({ titulo: "nova", origem: "captura", criado_em: "2026-11-03T00:00:00Z", ultima_movimentacao: "2026-11-03T00:00:00Z" });
  const entrega = item({ titulo: "entrega", tipo: "entrega", status: "concluida", ultima_movimentacao: "2026-11-02T00:00:00Z" });
  const ideia = item({ titulo: "ideia", tipo: "ideia" });
  const painel = await montarPainel(
    falso({ ...base, mexidos: [feita, nova, entrega], abertos: [fazendo, nova, ideia] }),
    DESDE,
  );
  const p1 = painel.projetos[0];
  assert.ok(painelNovo(p1));
  assert.equal(p1.projeto?.slug, "folga");
  assert.deepEqual(p1.emAndamento.map((i) => i.titulo), ["fazendo"]);
  assert.deepEqual(p1.feito.map((i) => i.titulo), ["feita"]);
  assert.deepEqual(p1.falta.map((i) => i.titulo), ["nova"]);
  assert.deepEqual(p1.entregas.map((i) => i.titulo), ["entrega"]);
  assert.deepEqual(p1.novas.map((i) => i.titulo), ["nova"]);
  assert.deepEqual(p1.ideias.map((i) => i.titulo), ["ideia"]);
  assert.equal(p1.falta[0].responsavel, "Juliana"); // tarefa mostra o responsável
  assert.equal(painel.desde, DESDE);
});

test("falta: importantes primeiro, depois prazo mais cedo, no máximo 8", async () => {
  const abertos = [
    item({ titulo: "baixa", prioridade: "baixa" }),
    item({ titulo: "media tarde", prioridade: "media", prazo: "2026-12-30" }),
    item({ titulo: "media cedo", prioridade: "media", prazo: "2026-11-20" }),
    item({ titulo: "alta", prioridade: "alta" }),
    ...Array.from({ length: 8 }, (_, n) => item({ titulo: `extra${n}`, prioridade: "baixa" })),
  ];
  const painel = await montarPainel(falso({ ...base, mexidos: [], abertos }), DESDE);
  const p1 = painel.projetos[0];
  assert.ok(painelNovo(p1));
  assert.equal(p1.falta.length, 8);
  assert.deepEqual(p1.falta.slice(0, 3).map((i) => i.titulo), ["alta", "media cedo", "media tarde"]);
});

test("entrega e ideia mostram o autor; ideia mostra dias até a validade", async () => {
  const ideia = item({ tipo: "ideia", validade: "2999-01-01" });
  const painel = await montarPainel(falso({ ...base, mexidos: [], abertos: [ideia] }), DESDE);
  const p1 = painel.projetos[0];
  assert.ok(painelNovo(p1));
  assert.equal(p1.ideias[0].responsavel, "Lari");
  assert.ok((p1.ideias[0].dias ?? 0) > 1000);
});

test("itens soltos só aparecem se houver algo; projetos ativos sempre aparecem", async () => {
  const vazio = await montarPainel(falso({ ...base, mexidos: [], abertos: [] }), DESDE);
  assert.deepEqual(vazio.projetos.map((b) => b.projeto?.slug), ["folga", "vetor"]);
  const solto = item({ projeto_id: null, titulo: "solta" });
  const comSolto = await montarPainel(falso({ ...base, mexidos: [], abertos: [solto] }), DESDE);
  assert.equal(comSolto.projetos.length, 3);
  assert.equal(comSolto.projetos[2].projeto, null);
});
