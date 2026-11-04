export type Marco = { titulo: string; data: string | null; feito: boolean };

// linha do tempo em ordem de data; marcos sem data vão para o fim
export const ordenarMarcos = (m: Marco[]) => [...m].sort((a, b) => (a.data ?? "9999").localeCompare(b.data ?? "9999"));

// o próximo marco é o primeiro ainda não feito; ele continua alimentando proximo_marco (portal do cliente)
export function proximoMarco(m: Marco[]): Marco | null {
  return ordenarMarcos(m).find((x) => !x.feito) ?? null;
}

export const camposDoProximo = (m: Marco[]) => {
  const p = proximoMarco(m);
  return { proximo_marco: p?.titulo ?? null, proximo_marco_em: p?.data ?? null };
};
