/**
 * carga de tarefas, recorrências, marco e ideia a partir de um JSON (docs/tarefas/AAAA-MM-DD.json).
 *
 *   npm run tarefas:importar -- --arquivo docs/tarefas/2026-11-09.json --simular   (padrão: só mostra, não grava)
 *   npm run tarefas:importar -- --arquivo docs/tarefas/2026-11-09.json --gravar
 *
 * pula o que já existe (mesmo título no mesmo projeto, em qualquer status), como o "aprovar" faz com as já feitas.
 * a filha nasce com pai_id; "espera" aponta a tarefa que precisa ficar pronta antes. grava com origem "manual" e embedding.
 * contra um banco que não é o local, só grava com --confirmo-banco-remoto.
 */
import { readFileSync } from "node:fs";
import { supabaseAdmin } from "../lib/supabase/admin";
import { gerarEmbedding, textoParaEmbedding } from "../lib/embedding";
import { camposDoProximo, type Marco } from "../lib/marcos";
import { faltaCriar, rodarRecorrencias, textoDaRegra, type Recorrencia } from "../lib/recorrencia";
import { bancoSupabase } from "../lib/recorrencia-banco";
import { hojeISO } from "../lib/datas";

type TarefaJson = {
  projeto: string; titulo: string; responsavel?: string | null; prioridade: string; definicao_pronto?: string | null; objetivo?: string | null;
  prazo?: string; comeca_em?: string; pai?: string; espera?: string;
};
type RecorrenciaJson = {
  projeto: string; titulo: string; responsavel?: string | null; prioridade: string; frequencia: Recorrencia["frequencia"]; quantidade: number;
  variacoes?: string[]; prazo_no_periodo: string; depende_de?: string; definicao_pronto?: string | null; objetivo?: string | null; inicio?: string;
};
type MarcoJson = { projeto: string; titulo: string; data: string; substitui?: string; desdobramentos?: string[] };
type IdeiaJson = { projeto: string; projeto_se_nao_houver?: string; titulo: string; autor: string };
type Arquivo = { recorrencias: RecorrenciaJson[]; tarefas: TarefaJson[]; marcos: MarcoJson[]; ideias: IdeiaJson[] };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const arg = (nome: string) => { const i = process.argv.indexOf(`--${nome}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const tem = (nome: string) => process.argv.includes(`--${nome}`);
const dataBr = (iso?: string | null) => (iso ? iso.split("-").reverse().join("/") : "·");

async function main() {
  const arquivo = arg("arquivo") ?? "docs/tarefas/2026-11-09.json";
  const gravar = tem("gravar");
  if (gravar && tem("simular")) throw new Error("escolha --simular ou --gravar, não os dois");
  const dados = JSON.parse(readFileSync(arquivo, "utf8")) as Arquivo;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const local = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])[:/]/.test(url);
  console.log(`banco: ${new URL(url).host} (${local ? "local" : "REMOTO"})   modo: ${gravar ? "GRAVAR" : "simular (nada é gravado)"}`);
  if (gravar && !local && !tem("confirmo-banco-remoto")) throw new Error("banco remoto: confirme com --confirmo-banco-remoto");

  const admin = supabaseAdmin();
  const [{ data: projetos }, { data: pessoas }, { data: itens }, { data: recs }] = await Promise.all([
    admin.from("projetos").select("id, slug, nome, marcos"),
    admin.from("pessoas").select("id, nome").eq("papel", "socia"),
    admin.from("itens").select("id, titulo, tipo, projeto_id"),
    admin.from("recorrencias").select("id, titulo, projeto_id"),
  ]);
  const projeto = (slug: string) => projetos?.find((p) => p.slug === slug);
  const pessoa = (nome?: string | null) => (nome ? pessoas?.find((p) => norm(p.nome).startsWith(norm(nome))) : undefined);
  const juliana = pessoa("Juliana");
  if (!juliana) throw new Error("não achei a Juliana em pessoas");
  const erros: string[] = [];

  // ---- tarefas ----
  const existeTarefa = (titulo: string, pid: string) => itens?.find((i) => i.tipo === "tarefa" && i.projeto_id === pid && norm(i.titulo) === norm(titulo));
  type Plano = { j: TarefaJson; pid: string; dono: string | null; acao: "entra" | "pula" };
  const plano: Plano[] = [];
  for (const j of dados.tarefas) {
    const p = projeto(j.projeto);
    if (!p) { erros.push(`projeto "${j.projeto}" não existe (tarefa "${j.titulo}")`); continue; }
    const dono = j.responsavel ? pessoa(j.responsavel) : undefined;
    if (j.responsavel && !dono) erros.push(`responsável "${j.responsavel}" não existe (tarefa "${j.titulo}")`);
    plano.push({ j, pid: p.id, dono: dono?.id ?? null, acao: existeTarefa(j.titulo, p.id) ? "pula" : "entra" });
  }
  const titulosNoArquivo = (pid: string) => new Set(plano.filter((x) => x.pid === pid).map((x) => norm(x.j.titulo)));
  for (const x of plano) {
    for (const ref of [x.j.pai, x.j.espera].filter(Boolean) as string[]) {
      if (!titulosNoArquivo(x.pid).has(norm(ref)) && !existeTarefa(ref, x.pid)) erros.push(`"${x.j.titulo}" aponta para "${ref}", que não está no arquivo nem no banco`);
    }
  }

  console.log("\n== tarefas ==");
  for (const x of plano) {
    const marcas = [x.j.pai && `filha de "${x.j.pai}"`, x.j.espera && `espera "${x.j.espera}"`, x.j.comeca_em && `começa em ${dataBr(x.j.comeca_em)}`, x.j.prazo && `prazo ${dataBr(x.j.prazo)}`].filter(Boolean).join("; ");
    console.log(`${x.acao === "entra" ? "ENTRA" : "pula "}  ${x.j.projeto.padEnd(7)} ${x.j.prioridade.padEnd(5)} ${(pessoas?.find((p) => p.id === x.dono)?.nome ?? "sem dono").padEnd(8)} ${x.j.titulo}${marcas ? `  [${marcas}]` : ""}`);
  }

  // ---- recorrências ----
  console.log("\n== recorrências (entram no modelo, não como tarefa) ==");
  const modelos: (RecorrenciaJson & { pid: string; dono: string | null; ja: boolean })[] = [];
  for (const j of dados.recorrencias) {
    const p = projeto(j.projeto);
    if (!p) { erros.push(`projeto "${j.projeto}" não existe (recorrência "${j.titulo}")`); continue; }
    const dono = j.responsavel ? pessoa(j.responsavel) : undefined;
    const ja = !!recs?.find((r) => r.projeto_id === p.id && norm(r.titulo) === norm(j.titulo));
    modelos.push({ ...j, pid: p.id, dono: dono?.id ?? null, ja });
    console.log(`${ja ? "pula " : "ENTRA"}  ${j.projeto.padEnd(7)} ${j.prioridade.padEnd(5)} ${(dono?.nome ?? "sem dono").padEnd(8)} ${j.titulo}${j.variacoes?.length ? ` [variações: ${j.variacoes.join(" | ")}]` : ""}  (${textoDaRegra({ frequencia: j.frequencia, quantidade: j.quantidade, prazo_no_periodo: j.prazo_no_periodo })}${j.depende_de ? `; depende de "${j.depende_de}"` : ""})`);
  }
  // o que a primeira rodada criaria hoje, calculado sem gravar
  const hoje = hojeISO();
  const falsas: Recorrencia[] = modelos.filter((m) => !m.ja).map((m, i) => ({
    id: `novo-${i}`, projeto_id: m.pid, titulo: m.titulo, objetivo: m.objetivo ?? null, definicao_pronto: m.definicao_pronto ?? null, prioridade: m.prioridade,
    responsavel_id: m.dono, criada_por: juliana.id, frequencia: m.frequencia, quantidade: m.quantidade, variacoes: m.variacoes ?? [],
    prazo_no_periodo: m.prazo_no_periodo, depende_de: null, ativa: true, inicio: m.inicio ?? hoje,
  }));
  console.log(`\n== primeira leva das recorrências (período de ${dataBr(hoje)}) ==`);
  for (const r of falsas) for (const t of faltaCriar(r, hoje, [])) console.log(`cria   ${t.titulo}   prazo ${dataBr(t.prazo)}`);

  // ---- marcos e ideias ----
  console.log("\n== marcos ==");
  for (const m of dados.marcos) {
    const p = projeto(m.projeto);
    if (!p) { erros.push(`projeto "${m.projeto}" não existe (marco "${m.titulo}")`); continue; }
    const atuais = (p.marcos ?? []) as Marco[];
    const antigo = m.substitui ? atuais.find((x) => norm(x.titulo) === norm(m.substitui!)) : undefined;
    const igual = atuais.some((x) => norm(x.titulo) === norm(m.titulo) && x.data === m.data);
    console.log(`${igual ? "pula " : "ENTRA"}  ${m.projeto}: ${m.titulo} em ${dataBr(m.data)}${antigo ? `  (troca "${antigo.titulo}", que estava em ${dataBr(antigo.data)})` : ""}`);
    if (m.desdobramentos?.length) console.log(`        desdobramentos (só sugestão, não viram tarefa): ${m.desdobramentos.join("; ")}`);
  }
  console.log("\n== ideias ==");
  for (const d of dados.ideias) {
    const p = projeto(d.projeto) ?? projeto(d.projeto_se_nao_houver ?? "");
    if (!p) { erros.push(`nenhum projeto para a ideia "${d.titulo}"`); continue; }
    const ja = itens?.some((i) => i.tipo === "ideia" && i.projeto_id === p.id && norm(i.titulo) === norm(d.titulo));
    console.log(`${ja ? "pula " : "ENTRA"}  ${p.slug}${p.slug !== d.projeto ? ` (não há "${d.projeto}")` : ""}: ${d.titulo}`);
  }

  const entram = plano.filter((x) => x.acao === "entra").length;
  console.log(`\nresumo: ${entram} tarefas entram, ${plano.length - entram} puladas; ${modelos.filter((m) => !m.ja).length} recorrências entram`);
  if (erros.length) {
    console.error("\nproblemas (nada foi gravado):\n- " + erros.join("\n- "));
    process.exit(1);
  }
  if (!gravar) return console.log("simulação: nada foi gravado. para gravar, repita com --gravar.");

  // ---- gravar ----
  const ids = new Map<string, string>(); // projeto_id|título normalizado -> id
  for (const i of itens ?? []) if (i.tipo === "tarefa" && i.projeto_id) ids.set(`${i.projeto_id}|${norm(i.titulo)}`, i.id);
  const chave = (pid: string, titulo: string) => `${pid}|${norm(titulo)}`;

  // pais e tarefas soltas primeiro, depois as filhas e as que esperam
  const ordem = [...plano.filter((x) => !x.j.pai && !x.j.espera), ...plano.filter((x) => x.j.pai || x.j.espera)];
  for (const x of ordem) {
    if (x.acao === "pula") continue;
    const { j } = x;
    const emb = await gerarEmbedding(textoParaEmbedding({ titulo: j.titulo, corpo: j.definicao_pronto }));
    const { data, error } = await admin.from("itens").insert({
      tipo: "tarefa", origem: "manual", autor_id: juliana.id, projeto_id: x.pid, titulo: j.titulo, objetivo: j.objetivo ?? null,
      definicao_pronto: j.definicao_pronto ?? null, responsavel_id: x.dono, prioridade: j.prioridade, prazo: j.prazo ?? null, comeca_em: j.comeca_em ?? null,
      pai_id: j.pai ? ids.get(chave(x.pid, j.pai)) ?? null : null, espera_item_id: j.espera ? ids.get(chave(x.pid, j.espera)) ?? null : null,
      ...(emb && { embedding: JSON.stringify(emb) }),
    }).select("id").single();
    if (error) throw new Error(`"${j.titulo}": ${error.message}`);
    ids.set(chave(x.pid, j.titulo), data.id);
  }

  const idRec = new Map<string, string>((recs ?? []).map((r) => [chave(r.projeto_id, r.titulo), r.id]));
  for (const m of [...modelos.filter((x) => !x.depende_de), ...modelos.filter((x) => x.depende_de)]) {
    if (m.ja) continue;
    const { data, error } = await admin.from("recorrencias").insert({
      projeto_id: m.pid, titulo: m.titulo, objetivo: m.objetivo ?? null, definicao_pronto: m.definicao_pronto ?? null, prioridade: m.prioridade,
      responsavel_id: m.dono, criada_por: juliana.id, frequencia: m.frequencia, quantidade: m.quantidade, variacoes: m.variacoes ?? [],
      prazo_no_periodo: m.prazo_no_periodo, depende_de: m.depende_de ? idRec.get(chave(m.pid, m.depende_de)) ?? null : null, inicio: m.inicio ?? hoje,
    }).select("id").single();
    if (error) throw new Error(`recorrência "${m.titulo}": ${error.message}`);
    idRec.set(chave(m.pid, m.titulo), data.id);
  }

  for (const m of dados.marcos) {
    const p = projeto(m.projeto)!;
    const atuais = ((p.marcos ?? []) as Marco[]).filter((x) => !m.substitui || norm(x.titulo) !== norm(m.substitui));
    if (atuais.some((x) => norm(x.titulo) === norm(m.titulo) && x.data === m.data)) continue;
    const novos = [...atuais, { titulo: m.titulo, data: m.data, feito: false }];
    const { error } = await admin.from("projetos").update({ marcos: novos, ...camposDoProximo(novos) }).eq("id", p.id);
    if (error) throw new Error(`marco "${m.titulo}": ${error.message}`);
  }
  for (const d of dados.ideias) {
    const p = (projeto(d.projeto) ?? projeto(d.projeto_se_nao_houver ?? ""))!;
    if (itens?.some((i) => i.tipo === "ideia" && i.projeto_id === p.id && norm(i.titulo) === norm(d.titulo))) continue;
    const autor = pessoa(d.autor) ?? juliana;
    const { error } = await admin.from("itens").insert({ tipo: "ideia", origem: "manual", autor_id: autor.id, projeto_id: p.id, titulo: d.titulo });
    if (error) throw new Error(`ideia: ${error.message}`);
  }

  // a primeira leva das recorrências sai do mesmo mecanismo do cron
  const r = await rodarRecorrencias(bancoSupabase(admin), hoje);
  console.log(`\ngravado. recorrências: ${r.criadas} tarefas criadas, ${r.expiradas} expiradas.`);
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
