import { Client } from "pg";

export type Metrica = {
  rotulo: string;
  fonte: "manual" | "sql" | "ga4";
  valor?: number | null;
  consulta?: string;
  conexao_env?: string; // nome da variável com a URL do banco do próprio produto
  propriedade?: string | null; // ga4: id numérico da propriedade
  metrica?: string; // ga4: sessions, activeUsers...
  dias?: number; // ga4: janela em dias (7 = visitas da semana)
  visivel_cliente?: boolean; // some do portal do cliente quando false
  historico?: { data: string; valor: number }[];
  erro?: string | null;
  atualizado_em?: string;
};

// variação contra a semana anterior: compara com o último valor guardado há 7 dias ou mais
export function variacaoSemana(m: Metrica, hoje = new Date()): number | null {
  if (m.valor == null) return null;
  const limite = new Date(hoje.getTime() - 7 * 86_400_000).toISOString().slice(0, 10);
  const antigo = [...(m.historico ?? [])].filter((h) => h.data <= limite).sort((a, b) => b.data.localeCompare(a.data))[0];
  return antigo ? m.valor - antigo.valor : null;
}

// consulta somente-leitura no banco do próprio produto, dentro de uma transação read only
export async function consultarExterno(url: string, consulta: string): Promise<number> {
  if (!/^\s*select\s/i.test(consulta) || consulta.includes(";")) throw new Error("só select, sem ponto e vírgula");
  const cliente = new Client({ connectionString: url, ssl: url.includes("localhost") || url.includes("127.0.0.1") ? undefined : { rejectUnauthorized: false } });
  await cliente.connect();
  try {
    await cliente.query("begin read only");
    const r = await cliente.query(consulta);
    await cliente.query("rollback");
    return Number(Object.values(r.rows[0] ?? {})[0]);
  } finally {
    await cliente.end();
  }
}
