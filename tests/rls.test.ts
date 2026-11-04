// roteiro de permissões (RLS) contra o banco LOCAL do supabase (porta 54422).
// tudo roda numa transação que termina em ROLLBACK: nada fica no banco.
// pula sozinho se o banco local não estiver no ar; nunca roda contra um banco que não seja local.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { Client } from "pg";

const URL_LOCAL = process.env.TESTE_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54422/postgres";
const ehLocal = /@(127\.0\.0\.1|localhost|\[::1\])[:/]/.test(URL_LOCAL);

const U = {
  socia: "00000000-0000-4000-8000-000000000001",
  clienteA: "00000000-0000-4000-8000-0000000000a1",
  clienteB: "00000000-0000-4000-8000-0000000000b1",
};
const P = { a: "00000000-0000-4000-8000-00000000aaaa", b: "00000000-0000-4000-8000-00000000bbbb" };
const I = {
  visivelA: "00000000-0000-4000-8000-0000000a0001",
  internoA: "00000000-0000-4000-8000-0000000a0002",
  tarefaDeA: "00000000-0000-4000-8000-0000000a0003",
  visivelB: "00000000-0000-4000-8000-0000000b0001",
};

const db = new Client({ connectionString: URL_LOCAL });
let disponivel = false;

// executa como um usuário logado (papel authenticated + claims do JWT), dentro de um savepoint
async function como<T>(uid: string | null, fn: () => Promise<T>): Promise<T> {
  await db.query("savepoint s");
  try {
    if (uid) {
      await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: uid, role: "authenticated" })]);
      await db.query("set local role authenticated");
    } else {
      await db.query("select set_config('request.jwt.claims', '', true)");
      await db.query("set local role anon");
    }
    return await fn();
  } finally {
    await db.query("reset role");
    await db.query("rollback to savepoint s");
  }
}
const ids = async (sql: string, args: unknown[] = []) => (await db.query(sql, args)).rows.map((r) => r.id as string).sort();
async function falha(fn: () => Promise<unknown>) {
  await db.query("savepoint f");
  try { await fn(); return false; } catch { return true; } finally { await db.query("rollback to savepoint f"); }
}

before(async () => {
  if (!ehLocal) return;
  try { await db.connect(); disponivel = true; } catch { return; }
  await db.query("begin");
  for (const [uid, email] of [[U.socia, "socia@teste.local"], [U.clienteA, "a@teste.local"], [U.clienteB, "b@teste.local"]]) {
    await db.query("insert into auth.users (id, email, instance_id, aud, role) values ($1, $2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')", [uid, email]);
  }
  await db.query("insert into projetos (id, slug, nome, tema) values ($1,'proj-a','A','{}'), ($2,'proj-b','B','{}')", [P.a, P.b]);
  await db.query("insert into pessoas (id, nome, papel) values ($1,'Socia','socia')", [U.socia]);
  await db.query("insert into pessoas (id, nome, papel, projetos_cliente) values ($1,'Cliente A','cliente',$2), ($3,'Cliente B','cliente',$4)", [U.clienteA, [P.a], U.clienteB, [P.b]]);
  await db.query(
    `insert into itens (id, tipo, titulo, projeto_id, autor_id, responsavel_id, visivel_cliente) values
      ($1,'entrega','visivel a',$5,$7,null,true),
      ($2,'ideia','interno a',$5,$7,null,false),
      ($3,'tarefa','tarefa do cliente a',$5,$7,$8,false),
      ($4,'entrega','visivel b',$6,$7,null,true)`,
    [I.visivelA, I.internoA, I.tarefaDeA, I.visivelB, P.a, P.b, U.socia, U.clienteA],
  );
});
after(async () => {
  if (!disponivel) return;
  await db.query("rollback");
  await db.end();
});

const t = (nome: string, fn: () => Promise<void>) =>
  test(`rls: ${nome}`, async (ctx) => {
    if (!ehLocal) return ctx.skip("TESTE_DATABASE_URL não é um banco local");
    if (!disponivel) return ctx.skip("banco local fora do ar (supabase start)");
    await fn();
  });

t("cliente vê só os itens visíveis do próprio projeto, mais as tarefas dele", () =>
  como(U.clienteA, async () => {
    assert.deepEqual(await ids("select id from itens"), [I.tarefaDeA, I.visivelA].sort());
  }));

t("cliente não vê item interno nem item de outro projeto", () =>
  como(U.clienteA, async () => {
    assert.deepEqual(await ids("select id from itens where id = any($1)", [[I.internoA, I.visivelB]]), []);
  }));

t("sócia vê tudo", () =>
  como(U.socia, async () => {
    assert.equal((await ids("select id from itens where id = any($1)", [Object.values(I)])).length, 4);
  }));

t("cliente só lê a própria pessoa", () =>
  como(U.clienteA, async () => {
    assert.deepEqual(await ids("select id from pessoas"), [U.clienteA]);
  }));

t("cliente não lê a tabela projetos; lê só o próprio projeto na visão do portal", () =>
  como(U.clienteA, async () => {
    assert.deepEqual(await ids("select id from projetos"), []);
    assert.deepEqual(await ids("select id from portal_projetos"), [P.a]);
  }));

t("visão do portal não aparece para quem não entrou (anon)", () =>
  como(null, async () => {
    assert.equal(await falha(() => db.query("select * from portal_projetos")), true);
    // nas tabelas o anon tem o privilégio padrão do supabase, mas nenhuma regra libera linhas
    for (const tabela of ["itens", "pessoas", "projetos", "capturas", "reunioes", "reacoes"]) {
      assert.equal((await db.query(`select 1 from ${tabela}`)).rowCount, 0, tabela);
    }
  }));

t("cliente conclui a própria tarefa, mas não muda outros campos", () =>
  como(U.clienteA, async () => {
    const r = await db.query("update itens set status = 'concluida' where id = $1", [I.tarefaDeA]);
    assert.equal(r.rowCount, 1);
    assert.equal(await falha(() => db.query("update itens set titulo = 'x' where id = $1", [I.tarefaDeA])), true);
    assert.equal(await falha(() => db.query("update itens set status = 'arquivada' where id = $1", [I.tarefaDeA])), true);
  }));

t("cliente não altera item de outra pessoa nem de outro projeto", () =>
  como(U.clienteA, async () => {
    assert.equal((await db.query("update itens set status = 'concluida' where id = any($1)", [[I.visivelA, I.visivelB]])).rowCount, 0);
  }));

t("cliente não cria item nem apaga nada", () =>
  como(U.clienteA, async () => {
    assert.equal(await falha(() => db.query("insert into itens (tipo, titulo, projeto_id, autor_id) values ('tarefa','x',$1,$2)", [P.a, U.clienteA])), true);
    assert.equal((await db.query("delete from itens where id = $1", [I.tarefaDeA])).rowCount, 0);
  }));

t("cliente cria captura só no próprio projeto e em seu nome", () =>
  como(U.clienteA, async () => {
    await db.query("insert into capturas (autor_id, projeto_id, formato, texto) values ($1,$2,'texto','oi')", [U.clienteA, P.a]);
    assert.equal(await falha(() => db.query("insert into capturas (autor_id, projeto_id, formato, texto) values ($1,$2,'texto','oi')", [U.clienteA, P.b])), true);
    assert.equal(await falha(() => db.query("insert into capturas (autor_id, projeto_id, formato, texto) values ($1,$2,'texto','oi')", [U.clienteB, P.a])), true);
  }));

t("cliente arquivado perde o acesso ao projeto; reativar devolve", async () => {
  await db.query("update projetos set status = 'arquivado' where id = $1", [P.a]);
  await como(U.clienteA, async () => {
    assert.deepEqual(await ids("select id from itens"), []);
    assert.deepEqual(await ids("select id from portal_projetos"), []);
  });
  await db.query("update projetos set status = 'ativo' where id = $1", [P.a]);
  await como(U.clienteA, async () => {
    assert.equal((await ids("select id from itens")).length, 2);
  });
});

t("cliente desativado não enxerga nada", async () => {
  await db.query("update pessoas set ativa = false where id = $1", [U.clienteA]);
  await como(U.clienteA, async () => {
    assert.deepEqual(await ids("select id from itens"), []);
  });
  await db.query("update pessoas set ativa = true where id = $1", [U.clienteA]);
});

t("cliente não lê reuniões nem reações", () =>
  como(U.clienteA, async () => {
    assert.equal((await db.query("select 1 from reunioes")).rowCount, 0);
    assert.equal((await db.query("select 1 from reacoes")).rowCount, 0);
  }));
