/**
 * carga de tarefas, recorrências, marco e ideia a partir de um JSON (docs/tarefas/AAAA-MM-DD.json).
 *
 *   npm run tarefas:importar -- --arquivo docs/tarefas/2026-11-09.json --simular   (padrão: só mostra, não grava)
 *   npm run tarefas:importar -- --arquivo docs/tarefas/2026-11-09.json --gravar
 *
 * pula o que já existe (mesmo título no mesmo projeto, em qualquer status), como o "aprovar" faz com as já feitas.
 * a filha nasce com pai_id; "espera" aponta a tarefa que precisa ficar pronta antes. grava com origem "manual" e embedding.
 * "reaproveita": true numa tarefa que já existe atualiza só os campos que o JSON traz (dono, definição de pronto, espera...),
 * mostrando antes e depois. sem essa marca, o que já existe é sempre pulado e nunca alterado.
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
  prazo?: string; comeca_em?: string; pai?: string; espera?: string; corpo?: string; reaproveita?: boolean;
};
type RecorrenciaJson = {
  projeto: string; titulo: string; responsavel?: string | null; prioridade: string; frequencia: Recorrencia["frequencia"]; quantidade: number;
  variacoes?: string[]; prazo_no_periodo: string; depende_de?: string; definicao_pronto?: string | null; objetivo?: string | null; inicio?: string;
};
type MarcoJson = { projeto: string; titulo: string; data: string; substitui?: string; desdobramentos?: string[] };
type IdeiaJson = { projeto: string; projeto_se_nao_houver?: string; titulo: string; autor: string };
type Arquivo = { recorrencias?: RecorrenciaJson[]; tarefas?: TarefaJson[]; marcos?: MarcoJson[]; ideias?: IdeiaJson[] };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const arg = (nome: string) => { const i = process.argv.indexOf(`--${nome}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const tem = (nome: string) => process.argv.includes(`--${nome}`);
const dataBr = (iso?: string | null) => (iso ? iso.split("-").reverse().join("/") : "·");

async function main() {
  const arquivo = arg("arquivo") ?? "docs/tarefas/2026-11-09.json";
  const gravar = tem("gravar");
  if (gravar && tem("simular")) throw new Error("escolha --simular ou --gravar, não os dois");
  const bruto = JSON.parse(readFileSync(arquivo, "utf8")) as Arquivo;
  const dados = { recorrencias: bruto.recorrencias ?? [], tarefas: bruto.tarefas ?? [], marcos: bruto.marcos ?? [], ideias: bruto.ideias ?? [] };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const local = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])[:/]/.test(url);
  console.log(`banco: ${new URL(url).host} (${local ? "local" : "REMOTO"})   modo: ${gravar ? "GRAVAR" : "simular (nada é gravado)"}`);
  if (gravar && !local && !tem("confirmo-banco-remoto")) throw new Error("banco remoto: confirme com --confirmo-banco-remoto");

  const admin = supabaseAdmin();
  const [{ data: projetos }, { data: pessoas }, { data: itens }, { data: recs }] = await Promise.all([
    admin.from("projetos").select("id, slug, nome, marcos"),
    admin.from("pessoas").select("id, nome").eq("papel", "socia"),
    admin.from("itens").select("id, titulo, tipo, projeto_id, status, responsavel_id, prioridade, objetivo, definicao_pronto, corpo, prazo, comeca_em, pai_id, espera_item_id"),
    admin.from("recorrencias").select("id, titulo, projeto_id"),
  ]);
  const projeto = (slug: string) => projetos?.find((p) => p.slug === slug);
  const pessoa = (nome?: string | null) => (nome ? pessoas?.find((p) => norm(p.nome).startsWith(norm(nome))) : undefined);
  const juliana = pessoa("Juliana");
  if (!juliana) throw new Error("não achei a Juliana em pessoas");
  const erros: string[] = [];

  // ---- tarefas ----
  type Existente = NonNullable<typeof itens>[number];
  const existeTarefa = (titulo: string, pid: string) => itens?.find((i) => i.tipo === "tarefa" && i.projeto_id === pid && norm(i.titulo) === norm(titulo));
  const chave = (pid: string | null, titulo: string) => `${pid}|${norm(titulo)}`;
  // pai e espera valem no próprio projeto; se o título não está lá, vale o de outro projeto (ex.: um post da moldura que espera o plugin do folga)
  const chavesNoArquivo = new Set<string>();
  const achaChave = (pid: string, ref: string): string | null => {
    const propria = chave(pid, ref);
    const todas = [...chavesNoArquivo, ...(itens ?? []).filter((i) => i.tipo === "tarefa").map((i) => chave(i.projeto_id, i.titulo))];
    if (todas.includes(propria)) return propria;
    const outras = [...new Set(todas.filter((k) => k.endsWith(`|${norm(ref)}`)))];
    return outras.length === 1 ? outras[0] : null;
  };
  const idDe = (pid: string, ref: string) => {
    const k = achaChave(pid, ref);
    return k ? ids.get(k) ?? null : null;
  };
  const ids = new Map<string, string>(); // projeto_id|título normalizado -> id (do banco e, na gravação, dos criados)
  for (const i of itens ?? []) if (i.tipo === "tarefa" && i.projeto_id) ids.set(chave(i.projeto_id, i.titulo), i.id);
  const tituloDe = (id: string | null) => (id ? itens?.find((i) => i.id === id)?.titulo ?? "?" : "nenhuma");
  type Plano = { j: TarefaJson; pid: string; dono: string | null; acao: "entra" | "pula" | "reaproveita"; existente?: Existente; mudancas: { campo: string; antes: string; depois: string; dados: Record<string, unknown> }[]; nota?: string };
  const plano: Plano[] = [];
  const curto = (t: string | null | undefined) => (t ? (t.length > 70 ? t.slice(0, 67) + "..." : t) : "·");
  for (const j of dados.tarefas) {
    const p = projeto(j.projeto);
    if (!p) { erros.push(`projeto "${j.projeto}" não existe (tarefa "${j.titulo}")`); continue; }
    const dono = j.responsavel ? pessoa(j.responsavel) : undefined;
    if (j.responsavel && !dono) erros.push(`responsável "${j.responsavel}" não existe (tarefa "${j.titulo}")`);
    const existente = existeTarefa(j.titulo, p.id);
    const item: Plano = { j, pid: p.id, dono: dono?.id ?? null, acao: existente ? "pula" : "entra", existente, mudancas: [] };
    if (existente && j.reaproveita) {
      if (["concluida", "arquivada"].includes(existente.status)) item.nota = `já existe e está ${existente.status}: não mexo`;
      else {
        // só os campos que o JSON traz; pai e espera são comparados pelo título
        const m = item.mudancas;
        const tit = (ref?: string) => (ref ? idDe(p.id, ref) ?? `novo:${ref}` : undefined);
        if (j.responsavel !== undefined && (dono?.id ?? null) !== existente.responsavel_id) m.push({ campo: "responsável", antes: pessoas?.find((x) => x.id === existente.responsavel_id)?.nome ?? "sem dono", depois: dono?.nome ?? "sem dono", dados: { responsavel_id: dono?.id ?? null } });
        if (j.prioridade && j.prioridade !== existente.prioridade) m.push({ campo: "prioridade", antes: existente.prioridade ?? "·", depois: j.prioridade, dados: { prioridade: j.prioridade } });
        if (j.objetivo !== undefined && (j.objetivo ?? null) !== existente.objetivo) m.push({ campo: "objetivo", antes: curto(existente.objetivo), depois: curto(j.objetivo), dados: { objetivo: j.objetivo ?? null } });
        if (j.definicao_pronto !== undefined && (j.definicao_pronto ?? null) !== existente.definicao_pronto) m.push({ campo: "definição de pronto", antes: curto(existente.definicao_pronto), depois: curto(j.definicao_pronto), dados: { definicao_pronto: j.definicao_pronto ?? null } });
        if (j.corpo !== undefined && j.corpo !== existente.corpo) m.push({ campo: "anotações", antes: curto(existente.corpo), depois: curto(j.corpo), dados: { corpo: j.corpo } });
        if (j.prazo !== undefined && j.prazo !== existente.prazo) m.push({ campo: "prazo", antes: dataBr(existente.prazo), depois: dataBr(j.prazo), dados: { prazo: j.prazo } });
        if (j.comeca_em !== undefined && j.comeca_em !== existente.comeca_em) m.push({ campo: "começa em", antes: dataBr(existente.comeca_em), depois: dataBr(j.comeca_em), dados: { comeca_em: j.comeca_em } });
        if (j.pai !== undefined && tit(j.pai) !== existente.pai_id) m.push({ campo: "filha de", antes: tituloDe(existente.pai_id), depois: j.pai, dados: { __pai: j.pai } });
        if (j.espera !== undefined && tit(j.espera) !== existente.espera_item_id) m.push({ campo: "espera", antes: tituloDe(existente.espera_item_id), depois: j.espera, dados: { __espera: j.espera } });
        item.acao = m.length ? "reaproveita" : "pula";
        if (!m.length) item.nota = "já existe e já está assim";
      }
    }
    plano.push(item);
  }
  for (const x of plano) chavesNoArquivo.add(chave(x.pid, x.j.titulo));
  for (const x of plano) {
    for (const ref of [x.j.pai, x.j.espera].filter(Boolean) as string[]) {
      if (!achaChave(x.pid, ref)) erros.push(`"${x.j.titulo}" aponta para "${ref}", que não está no arquivo nem no banco (ou há mais de uma com esse título)`);
    }
  }

  console.log("\n== tarefas ==");
  const ROTULO = { entra: "ENTRA ", pula: "pula  ", reaproveita: "REAPROV" } as const;
  for (const x of plano) {
    const marcas = [x.j.pai && `filha de "${x.j.pai}"`, x.j.espera && `espera "${x.j.espera}"`, x.j.comeca_em && `começa em ${dataBr(x.j.comeca_em)}`, x.j.prazo && `prazo ${dataBr(x.j.prazo)}`].filter(Boolean).join("; ");
    const dono = x.j.responsavel ?? pessoas?.find((p) => p.id === x.existente?.responsavel_id)?.nome ?? "sem dono";
    console.log(`${ROTULO[x.acao]} ${x.j.projeto.padEnd(7)} ${(x.j.prioridade ?? "").padEnd(5)} ${dono.padEnd(8)} ${x.j.titulo}${x.acao === "entra" && marcas ? `  [${marcas}]` : ""}${x.nota ? `  (${x.nota})` : ""}`);
    for (const m of x.mudancas) console.log(`           ${m.campo}: ${m.antes}  →  ${m.depois}`);
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
  const reaprov = plano.filter((x) => x.acao === "reaproveita").length;
  console.log(`\nresumo: ${entram} tarefas entram, ${reaprov} reaproveitadas, ${plano.length - entram - reaprov} puladas; ${modelos.filter((m) => !m.ja).length} recorrências entram`);
  if (erros.length) {
    console.error("\nproblemas (nada foi gravado):\n- " + erros.join("\n- "));
    process.exit(1);
  }
  if (!gravar) return console.log("simulação: nada foi gravado. para gravar, repita com --gravar.");

  // ---- gravar ----

  // quem é apontado (pai ou espera) é gravado antes de quem aponta
  const ordem: Plano[] = [];
  const faltam = plano.filter((x) => x.acao !== "pula");
  const prontos = new Set<string>();
  for (let volta = 0; volta < 20 && faltam.length; volta++) {
    for (const x of [...faltam]) {
      const refs = [x.j.pai, x.j.espera].filter(Boolean).map((r) => achaChave(x.pid, r!)!);
      // só espera quem aponta para alguém que ainda vai ser criado ou alterado nesta rodada
      if (refs.every((r) => prontos.has(r) || !faltam.some((f) => chave(f.pid, f.j.titulo) === r))) {
        ordem.push(x); prontos.add(chave(x.pid, x.j.titulo)); faltam.splice(faltam.indexOf(x), 1);
      }
    }
  }
  if (faltam.length) throw new Error(`referência circular entre tarefas: ${faltam.map((x) => x.j.titulo).join("; ")}`);

  for (const x of ordem) {
    const { j } = x;
    const pai = j.pai ? idDe(x.pid, j.pai) : null;
    const espera = j.espera ? idDe(x.pid, j.espera) : null;
    if (x.acao === "reaproveita") {
      const dados: Record<string, unknown> = {};
      for (const m of x.mudancas) for (const [k, v] of Object.entries(m.dados)) dados[k === "__pai" ? "pai_id" : k === "__espera" ? "espera_item_id" : k] = k === "__pai" ? pai : k === "__espera" ? espera : v;
      const { error } = await admin.from("itens").update(dados).eq("id", x.existente!.id);
      if (error) throw new Error(`"${j.titulo}": ${error.message}`);
      continue;
    }
    const emb = await gerarEmbedding(textoParaEmbedding({ titulo: j.titulo, corpo: j.definicao_pronto }));
    const { data, error } = await admin.from("itens").insert({
      tipo: "tarefa", origem: "manual", autor_id: juliana.id, projeto_id: x.pid, titulo: j.titulo, objetivo: j.objetivo ?? null, corpo: j.corpo ?? null,
      definicao_pronto: j.definicao_pronto ?? null, responsavel_id: x.dono, prioridade: j.prioridade, prazo: j.prazo ?? null, comeca_em: j.comeca_em ?? null,
      pai_id: pai, espera_item_id: espera,
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
