export const diasAtras = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

export const hojeISO = () => new Date().toISOString().slice(0, 10);

// dias inteiros de hoje até a data (negativo se já passou)
export const diasAte = (data: string) => Math.ceil((new Date(data + "T23:59:59").getTime() - Date.now()) / 86_400_000);

export const diasDesde = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

// "há 3 horas", "há 2 dias"
export function haQuanto(iso: string) {
  const min = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (min < 60) return `há ${min} min`;
  if (min < 1440) return `há ${Math.round(min / 60)} h`;
  const d = Math.round(min / 1440);
  return `há ${d} ${d === 1 ? "dia" : "dias"}`;
}
