// os jobs agendados da Vercel mandam "Authorization: Bearer <CRON_SECRET>".
// sem o segredo configurado, ninguém passa (antes, "Bearer undefined" passava).
export function cronAutorizado(req: Request): boolean {
  const segredo = process.env.CRON_SECRET;
  return !!segredo && req.headers.get("authorization") === `Bearer ${segredo}`;
}
