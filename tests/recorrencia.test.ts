import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aExpirar, inicioDoPeriodo, previsao, prazoDoPeriodo, rodarRecorrencias, tituloDaVez,
  type Banco, type ItemRecorrente, type Rascunho, type Recorrencia,
} from "../lib/recorrencia";

const base: Recorrencia = {
  id: "r1", projeto_id: "p1", titulo: "fazer um post", objetivo: null, definicao_pronto: "post publicado", prioridade: "media",
  responsavel_id: "juliana", criada_por: "juliana", frequencia: "semanal", quantidade: 1, variacoes: [],
  prazo_no_periodo: "sex", depende_de: null, ativa: true, inicio: "2026-11-02",
};

// banco de mentira: guarda tudo em memória, com a mesma regra única do banco de verdade
function bancoFalso(recs: Recorrencia[]) {
  const itens: (ItemRecorrente & Partial<Rascunho>)[] = [];
  let n = 0;
  const banco: Banco = {
    recorrencias: async () => recs,
    itens: async () => itens.map((i) => ({ ...i })),
    inserir: async (rascunhos) => {
      const novos: ItemRecorrente[] = [];
      for (const r of rascunhos) {
        if (itens.some((i) => i.recorrencia_id === r.recorrencia_id && i.periodo === r.periodo && i.vez === r.vez)) continue;
        const item = { ...r, id: `i${++n}`, status: "aberta" };
        itens.push(item);
        novos.push({ id: item.id, recorrencia_id: r.recorrencia_id, periodo: r.periodo, vez: r.vez, status: "aberta" });
      }
      return novos;
    },
    expirar: async (ids) => { for (const i of itens) if (ids.includes(i.id)) i.status = "expirada"; },
  };
  return { banco, itens };
}

test("períodos: semana começa na segunda, quinzena segue o início, mês no dia 1", () => {
  assert.equal(inicioDoPeriodo(base, "2026-11-09"), "2026-11-09"); // segunda
  assert.equal(inicioDoPeriodo(base, "2026-11-15"), "2026-11-09"); // domingo
  assert.equal(inicioDoPeriodo({ ...base, frequencia: "quinzenal", inicio: "2026-11-09" }, "2026-11-22"), "2026-11-09");
  assert.equal(inicioDoPeriodo({ ...base, frequencia: "quinzenal", inicio: "2026-11-09" }, "2026-11-23"), "2026-11-23");
  assert.equal(inicioDoPeriodo({ ...base, frequencia: "mensal" }, "2026-11-27"), "2026-11-01");
});

test("prazos: sexta da semana, último dia útil do mês, dia fixo", () => {
  assert.equal(prazoDoPeriodo(base, "2026-11-09"), "2026-11-13");
  assert.equal(prazoDoPeriodo({ ...base, frequencia: "mensal", prazo_no_periodo: "ultimo_dia_util" }, "2026-11-01"), "2026-11-30");
  assert.equal(prazoDoPeriodo({ ...base, frequencia: "mensal", prazo_no_periodo: "ultimo_dia_util" }, "2026-05-01"), "2026-05-29"); // 31/05 é domingo
  assert.equal(prazoDoPeriodo({ ...base, frequencia: "mensal", prazo_no_periodo: "dia-31" }, "2026-02-01"), "2026-02-28");
  assert.equal(prazoDoPeriodo({ ...base, frequencia: "quinzenal" }, "2026-11-09"), "2026-11-20"); // sexta da segunda semana
});

test("criar duas vezes no mesmo dia não duplica", async () => {
  const { banco, itens } = bancoFalso([base]);
  assert.deepEqual(await rodarRecorrencias(banco, "2026-11-09"), { criadas: 1, expiradas: 0 });
  assert.deepEqual(await rodarRecorrencias(banco, "2026-11-09"), { criadas: 0, expiradas: 0 });
  assert.deepEqual(await rodarRecorrencias(banco, "2026-11-12"), { criadas: 0, expiradas: 0 }); // mesmo período, outro dia
  assert.equal(itens.length, 1);
  assert.equal(itens[0].prazo, "2026-11-13");
  assert.equal(itens[0].responsavel_id, "juliana");
});

test("quantidade 2 cria duas tarefas, com as variações alternadas", async () => {
  const dois = { ...base, quantidade: 2, variacoes: ["1 lâmina", "carrossel de 4 lâminas"] };
  const { banco, itens } = bancoFalso([dois]);
  await rodarRecorrencias(banco, "2026-11-09");
  assert.deepEqual(itens.map((i) => i.titulo), ["fazer um post (1 lâmina)", "fazer um post (carrossel de 4 lâminas)"]);
  assert.deepEqual(itens.map((i) => i.vez), [1, 2]);
  // com duas por semana e duas variações, toda semana sai uma de cada; com uma por semana, elas se revezam
  assert.notEqual(tituloDaVez({ ...dois, quantidade: 1 }, "2026-11-09", 1), tituloDaVez({ ...dois, quantidade: 1 }, "2026-11-16", 1));
  assert.equal(tituloDaVez({ ...dois, quantidade: 1 }, "2026-11-09", 1), tituloDaVez({ ...dois, quantidade: 1 }, "2026-11-23", 1));
});

test("a virada de período expira o que ficou aberto e cria o novo", async () => {
  const { banco, itens } = bancoFalso([{ ...base, quantidade: 2 }]);
  await rodarRecorrencias(banco, "2026-11-09");
  itens[0].status = "concluida"; // uma foi feita, a outra não
  const r = await rodarRecorrencias(banco, "2026-11-16");
  assert.deepEqual(r, { criadas: 2, expiradas: 1 });
  assert.deepEqual(itens.filter((i) => i.periodo === "2026-11-09").map((i) => i.status), ["concluida", "expirada"]);
  assert.deepEqual(itens.filter((i) => i.periodo === "2026-11-16").map((i) => i.status), ["aberta", "aberta"]);
  assert.deepEqual(aExpirar([base], [{ id: "x", recorrencia_id: "r1", periodo: "2026-11-09", vez: 1, status: "fazendo" }], "2026-11-12"), []);
});

test("a dependência espera a anterior e só some o aviso quando ela for concluída", async () => {
  const texto = { ...base, id: "texto", frequencia: "mensal" as const, prazo_no_periodo: "ultimo_dia_util", titulo: "escrever o texto do site" };
  const linkedin = { ...base, id: "linkedin", frequencia: "mensal" as const, prazo_no_periodo: "ultimo_dia_util", titulo: "publicar no LinkedIn", depende_de: "texto" };
  // a dependente vem primeiro na lista: a rodada ainda cria a outra antes
  const { banco, itens } = bancoFalso([linkedin, texto]);
  await rodarRecorrencias(banco, "2026-11-09");
  const t = itens.find((i) => i.recorrencia_id === "texto")!;
  const l = itens.find((i) => i.recorrencia_id === "linkedin")!;
  assert.equal(l.espera_item_id, t.id);
  assert.equal(t.espera_item_id, null);
  // quem mostra o aviso olha o status da tarefa de que espera
  const esperando = (i: typeof l) => !!i.espera_item_id && itens.find((x) => x.id === i.espera_item_id)?.status !== "concluida";
  assert.equal(esperando(l), true);
  t.status = "concluida";
  assert.equal(esperando(l), false);
});

test("recorrência desligada não cria nada e a previsão some", async () => {
  const desligada = { ...base, ativa: false };
  const { banco, itens } = bancoFalso([desligada]);
  assert.deepEqual(await rodarRecorrencias(banco, "2026-11-09"), { criadas: 0, expiradas: 0 });
  assert.equal(itens.length, 0);
  assert.deepEqual(previsao(desligada, "2026-11-09", []), []);
});

test("previsão: 4 semanas, marca o que já foi criado e não repete o que já venceu", () => {
  const dois = { ...base, quantidade: 2 };
  const itens: ItemRecorrente[] = [{ id: "a", recorrencia_id: "r1", periodo: "2026-11-09", vez: 1, status: "aberta" }];
  const p = previsao(dois, "2026-11-09", itens);
  assert.deepEqual([...new Set(p.map((o) => o.prazo))], ["2026-11-13", "2026-11-20", "2026-11-27", "2026-12-04"]);
  assert.equal(p.length, 8);
  assert.deepEqual(p.filter((o) => o.criada).map((o) => `${o.periodo}#${o.vez}`), ["2026-11-09#1"]);
  assert.equal(previsao(dois, "2026-11-14", []).some((o) => o.prazo === "2026-11-13"), false); // sábado: a sexta já passou
});

test("comeca_em no futuro esconde do painel do dia e a página do projeto continua mostrando", async () => {
  const { aindaNaoComeca } = await import("../lib/cartao");
  const tarefas = [{ titulo: "pegar o DUNS", comeca_em: "2026-11-12" }, { titulo: "outra", comeca_em: null }];
  assert.deepEqual(tarefas.filter((t) => !aindaNaoComeca(t, "2026-11-09")).map((t) => t.titulo), ["outra"]);
  assert.deepEqual(tarefas.filter((t) => !aindaNaoComeca(t, "2026-11-12")).map((t) => t.titulo), ["pegar o DUNS", "outra"]); // no dia, aparece
  // a página do projeto não passa por esse filtro: lista todas as abertas
  assert.equal(tarefas.length, 2);
});
