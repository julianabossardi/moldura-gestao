// sprint quinzenal: a 1 começa em projetos.sprint_inicio e as seguintes vêm a cada 14 dias.
// datas em AAAA-MM-DD, contadas como dias de calendário (sem fuso)
export const DIAS_SPRINT = 14;
const DIA = 86_400_000;

export type Sprint = { numero: number; inicio: string; fim: string; dia: number; restam: number; comecou: boolean };

const paraDia = (iso: string) => Date.parse(iso.slice(0, 10) + "T00:00:00Z") / DIA;
const paraIso = (dia: number) => new Date(dia * DIA).toISOString().slice(0, 10);

export function sprintAtual(inicio: string, hoje: string): Sprint {
  const base = paraDia(inicio);
  const passados = paraDia(hoje) - base;
  if (passados < 0) {
    // a primeira sprint ainda não começou
    return { numero: 1, inicio: paraIso(base), fim: paraIso(base + DIAS_SPRINT - 1), dia: 0, restam: DIAS_SPRINT, comecou: false };
  }
  const numero = Math.floor(passados / DIAS_SPRINT) + 1;
  const ini = base + (numero - 1) * DIAS_SPRINT;
  const dia = passados - (numero - 1) * DIAS_SPRINT + 1;
  return { numero, inicio: paraIso(ini), fim: paraIso(ini + DIAS_SPRINT - 1), dia, restam: DIAS_SPRINT - dia, comecou: true };
}

// tarefa entra na sprint se está em andamento, ou aberta com prazo até o fim dela (inclui as atrasadas)
export const naSprint = (t: { status: string; prazo: string | null }, s: Sprint) =>
  t.status === "fazendo" || (t.status === "aberta" && !!t.prazo && t.prazo <= s.fim);
