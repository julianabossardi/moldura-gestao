import { createSign } from "node:crypto";

// Google Analytics Data API (GA4), com conta de serviço. GOOGLE_SERVICE_ACCOUNT_JSON guarda o JSON da conta,
// e a conta precisa ter acesso de leitura à propriedade.
const b64 = (x: object | Buffer) => Buffer.from(x instanceof Buffer ? x : JSON.stringify(x)).toString("base64url");

async function token(): Promise<string> {
  const cru = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!cru) throw new Error("falta GOOGLE_SERVICE_ACCOUNT_JSON");
  const conta = JSON.parse(cru) as { client_email: string; private_key: string };
  const agora = Math.floor(Date.now() / 1000);
  const corpo = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: conta.client_email,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: agora,
    exp: agora + 3600,
  })}`;
  const assinatura = createSign("RSA-SHA256").update(corpo).sign(conta.private_key);
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${corpo}.${b64(assinatura)}` }),
  });
  if (!r.ok) throw new Error(`google: ${r.status}`);
  return ((await r.json()) as { access_token: string }).access_token;
}

// total da métrica nos últimos `dias` dias (sessões, por padrão: "visitas")
export async function consultarGa4(o: { propriedade: string; metrica?: string; dias?: number }): Promise<number> {
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${o.propriedade}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      dateRanges: [{ startDate: `${o.dias ?? 7}daysAgo`, endDate: "today" }],
      metrics: [{ name: o.metrica ?? "sessions" }],
    }),
  });
  if (!r.ok) throw new Error(`ga4: ${r.status}`);
  const j = (await r.json()) as { rows?: { metricValues: { value: string }[] }[] };
  return Number(j.rows?.[0]?.metricValues?.[0]?.value ?? 0);
}
