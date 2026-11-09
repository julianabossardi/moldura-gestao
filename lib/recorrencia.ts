// tarefas que se repetem. a conta dos períodos, dos prazos e da previsão é só de calendário (AAAA-MM-DD, sem fuso),
// e o que mexe no banco entra por um adaptador, para o mesmo código servir ao cron e aos testes.

export type Frequencia = "semanal" | "quinzenal" | "mensal";

export type Recorrencia = {
  id: string;
  projeto_id: string;
  titulo: string;
  objetivo: string | null;
  definicao_pronto: string | null;
  prioridade: string;
  responsavel_id: string | null;
  criada_por: string;
  frequencia: Frequencia;
  quantidade: number;
  variacoes: string[];
  prazo_no_periodo: string; // seg..dom, ultimo_dia_util ou dia-N
  depende_de: string | null;
  ativa: boolean;
  inicio: string;
};

// o que a recorrência já criou (basta para saber o que falta criar e o que expirou)
export type ItemRecorrente = { id: string; recorrencia_id: string; periodo: string; vez: number; status: string };

export type Rascunho = {
  recorrencia_id: string; projeto_id: string; periodo: string; vez: number;
  titulo: string; objetivo: string | null; definicao_pronto: string | null; prioridade: string;
  responsavel_id: string | null; autor_id: string; prazo: string; espera_item_id: string | null;
};

const DIA = 86_400_000;
export const paraDia = (iso: string) => Math.floor(Date.parse(iso.slice(0, 10) + "T00:00:00Z") / DIA);
export const paraIso = (dia: number) => new Date(dia * DIA).toISOString().slice(0, 10);
// 1970-01-01 foi quinta; o dia 4 (05/01/1970) foi segunda
const diaDaSemana = (dia: number) => (((dia - 4) % 7) + 7) % 7; // 0 = segunda ... 6 = domingo
const segundaDe = (dia: number) => dia - diaDaSemana(dia);
const SEMANA = { seg: 0, ter: 1, qua: 2, qui: 3, sex: 4, sab: 5, dom: 6 } as const;

export const DIAS_NA_SEMANA = Object.keys(SEMANA) as (keyof typeof SEMANA)[];
export const ROTULO_FREQUENCIA: Record<Frequencia, string> = { semanal: "toda semana", quinzenal: "a cada 15 dias", mensal: "todo mês" };

// primeiro dia do período que contém a data
export function inicioDoPeriodo(r: Pick<Recorrencia, "frequencia" | "inicio">, data: string): string {
  const dia = paraDia(data);
  if (r.frequencia === "semanal") return paraIso(segundaDe(dia));
  if (r.frequencia === "quinzenal") {
    const base = segundaDe(paraDia(r.inicio));
    return paraIso(base + Math.floor((dia - base) / 14) * 14);
  }
  return data.slice(0, 7) + "-01";
}

export function proximoPeriodo(r: Pick<Recorrencia, "frequencia">, periodo: string): string {
  if (r.frequencia === "semanal") return paraIso(paraDia(periodo) + 7);
  if (r.frequencia === "quinzenal") return paraIso(paraDia(periodo) + 14);
  const d = new Date(Date.parse(periodo + "T00:00:00Z"));
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
}

const ultimoDiaDoPeriodo = (r: Pick<Recorrencia, "frequencia">, periodo: string) => paraDia(proximoPeriodo(r, periodo)) - 1;

// quando a tarefa do período vence. dia da semana: o último desse dia dentro do período
export function prazoDoPeriodo(r: Pick<Recorrencia, "frequencia" | "prazo_no_periodo">, periodo: string): string {
  const fim = ultimoDiaDoPeriodo(r, periodo);
  const regra = r.prazo_no_periodo;
  if (regra === "ultimo_dia_util") {
    let d = fim;
    while (diaDaSemana(d) > 4) d--;
    return paraIso(d);
  }
  if (regra.startsWith("dia-")) {
    const n = Number(regra.slice(4));
    return paraIso(Math.min(paraDia(periodo) + n - 1, fim));
  }
  const alvo = SEMANA[regra as keyof typeof SEMANA] ?? SEMANA.sex;
  let d = fim;
  while (diaDaSemana(d) !== alvo) d--;
  return paraIso(Math.max(d, paraDia(periodo)));
}

// qual período é este, contado desde sempre: serve para alternar as variações sem guardar estado
function numeroDoPeriodo(r: Pick<Recorrencia, "frequencia" | "inicio">, periodo: string): number {
  if (r.frequencia === "semanal") return Math.floor(paraDia(periodo) / 7);
  if (r.frequencia === "quinzenal") return Math.floor((paraDia(periodo) - segundaDe(paraDia(r.inicio))) / 14);
  const [a, m] = periodo.split("-").map(Number);
  return a * 12 + (m - 1);
}

export function tituloDaVez(r: Pick<Recorrencia, "titulo" | "variacoes" | "quantidade" | "frequencia" | "inicio">, periodo: string, vez: number): string {
  if (!r.variacoes.length) return r.titulo;
  const i = (numeroDoPeriodo(r, periodo) * r.quantidade + vez - 1) % r.variacoes.length;
  return `${r.titulo} (${r.variacoes[((i % r.variacoes.length) + r.variacoes.length) % r.variacoes.length]})`;
}

// a tarefa de que esta espera: a mais recente da recorrência da qual ela depende, até o período dela
export function esperaDe(r: Pick<Recorrencia, "depende_de">, periodo: string, itens: ItemRecorrente[]): string | null {
  if (!r.depende_de) return null;
  const candidatas = itens.filter((i) => i.recorrencia_id === r.depende_de && i.vez === 1 && i.periodo <= periodo)
    .sort((a, b) => b.periodo.localeCompare(a.periodo));
  return candidatas[0]?.id ?? null;
}

// o que falta criar no período em que a data cai (desligada não cria nada)
export function faltaCriar(r: Recorrencia, hoje: string, existentes: ItemRecorrente[], itensDeTodas: ItemRecorrente[] = existentes): Rascunho[] {
  if (!r.ativa) return [];
  const periodo = inicioDoPeriodo(r, hoje);
  const feitas = new Set(existentes.filter((i) => i.recorrencia_id === r.id && i.periodo === periodo).map((i) => i.vez));
  const saida: Rascunho[] = [];
  for (let vez = 1; vez <= r.quantidade; vez++) {
    if (feitas.has(vez)) continue;
    saida.push({
      recorrencia_id: r.id, projeto_id: r.projeto_id, periodo, vez,
      titulo: tituloDaVez(r, periodo, vez), objetivo: r.objetivo, definicao_pronto: r.definicao_pronto, prioridade: r.prioridade,
      responsavel_id: r.responsavel_id, autor_id: r.criada_por, prazo: prazoDoPeriodo(r, periodo),
      espera_item_id: esperaDe(r, periodo, itensDeTodas),
    });
  }
  return saida;
}

// o que ficou aberto de um período que já acabou vira expirada: não acumula
export function aExpirar(recorrencias: Recorrencia[], itens: (ItemRecorrente)[], hoje: string): string[] {
  const por = new Map(recorrencias.map((r) => [r.id, r]));
  return itens
    .filter((i) => ["aberta", "fazendo"].includes(i.status))
    .filter((i) => { const r = por.get(i.recorrencia_id); return !!r && i.periodo < inicioDoPeriodo(r, hoje); })
    .map((i) => i.id);
}

export type Ocorrencia = { periodo: string; vez: number; titulo: string; prazo: string; criada: boolean };

// o que vem pela frente: as ocorrências com prazo nos próximos dias, calculadas (nada é gravado)
export function previsao(r: Recorrencia, hoje: string, itens: ItemRecorrente[], dias = 28): Ocorrencia[] {
  if (!r.ativa) return [];
  const limite = paraDia(hoje) + dias;
  const saida: Ocorrencia[] = [];
  for (let periodo = inicioDoPeriodo(r, hoje), n = 0; n < 60 && paraDia(periodo) <= limite; periodo = proximoPeriodo(r, periodo), n++) {
    const prazo = prazoDoPeriodo(r, periodo);
    if (prazo < hoje || paraDia(prazo) > limite) continue;
    for (let vez = 1; vez <= r.quantidade; vez++) {
      saida.push({
        periodo, vez, prazo, titulo: tituloDaVez(r, periodo, vez),
        criada: itens.some((i) => i.recorrencia_id === r.id && i.periodo === periodo && i.vez === vez),
      });
    }
  }
  return saida;
}

export function textoDaRegra(r: Pick<Recorrencia, "frequencia" | "quantidade" | "prazo_no_periodo">): string {
  const prazo = r.prazo_no_periodo === "ultimo_dia_util" ? "no último dia útil" : r.prazo_no_periodo.startsWith("dia-") ? `no dia ${r.prazo_no_periodo.slice(4)}` : `até ${NOME_DIA[r.prazo_no_periodo] ?? r.prazo_no_periodo}`;
  return `${r.quantidade > 1 ? `${r.quantidade} ` : ""}${ROTULO_FREQUENCIA[r.frequencia]}, ${prazo}`;
}
const NOME_DIA: Record<string, string> = { seg: "segunda", ter: "terça", qua: "quarta", qui: "quinta", sex: "sexta", sab: "sábado", dom: "domingo" };

// ---- a rodada diária ----------------------------------------------------------------------------
export type Banco = {
  recorrencias(): Promise<Recorrencia[]>;
  itens(desde: string): Promise<ItemRecorrente[]>; // tudo o que recorrências já criaram de `desde` em diante
  inserir(rascunhos: Rascunho[]): Promise<ItemRecorrente[]>;
  expirar(ids: string[]): Promise<void>;
};

export type Rodada = { criadas: number; expiradas: number };

// expira o que ficou para trás e cria o que falta do período atual. rodar de novo no mesmo dia não faz nada.
export async function rodarRecorrencias(banco: Banco, hoje: string): Promise<Rodada> {
  const todas = await banco.recorrencias();
  let itens = await banco.itens(paraIso(paraDia(hoje) - 62));

  const expirar = aExpirar(todas, itens, hoje);
  if (expirar.length) await banco.expirar(expirar);
  itens = itens.map((i) => (expirar.includes(i.id) ? { ...i, status: "expirada" } : i));

  // quem depende de outra espera a outra ser criada primeiro
  let criadas = 0;
  const feitas = new Set<string>();
  const pendentes = todas.filter((r) => r.ativa);
  for (let volta = 0; volta < 5 && pendentes.length; volta++) {
    for (const r of [...pendentes]) {
      const dependeDeAlguemPendente = r.depende_de && pendentes.some((p) => p.id === r.depende_de) && !feitas.has(r.depende_de);
      if (dependeDeAlguemPendente) continue;
      const novos = faltaCriar(r, hoje, itens.filter((i) => i.recorrencia_id === r.id), itens);
      if (novos.length) {
        const inseridos = await banco.inserir(novos);
        itens = [...itens, ...inseridos];
        criadas += inseridos.length;
      }
      feitas.add(r.id);
      pendentes.splice(pendentes.indexOf(r), 1);
    }
  }
  return { criadas, expiradas: expirar.length };
}
