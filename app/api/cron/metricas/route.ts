import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { consultarExterno, type Metrica } from "@/lib/metricas";

export const maxDuration = 60;

// job diário (Vercel Cron): lê os números vivos de cada projeto ativo e guarda no próprio projetos.metricas
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  const admin = supabaseAdmin();
  const hoje = new Date().toISOString().slice(0, 10);
  const { data: projetos } = await admin.from("projetos").select("id, slug, metricas").eq("status", "ativo");
  const relatorio: Record<string, string[]> = {};

  for (const p of projetos ?? []) {
    const metricas = (p.metricas ?? []) as Metrica[];
    relatorio[p.slug] = [];
    for (const m of metricas) {
      try {
        if (m.fonte === "sql" && m.consulta) {
          const url = m.conexao_env ? process.env[m.conexao_env] : null;
          if (m.conexao_env && !url) throw new Error(`falta a variável ${m.conexao_env}`);
          if (url) m.valor = await consultarExterno(url, m.consulta);
          else {
            const { data, error } = await admin.rpc("consulta_leitura", { q: m.consulta });
            if (error) throw new Error(error.message);
            m.valor = Number(data);
          }
        }
        // ga4 entra na fase 6; manual mantém o valor digitado
        m.erro = null;
        if (m.valor != null) {
          m.historico = [...(m.historico ?? []).filter((h) => h.data !== hoje), { data: hoje, valor: m.valor }].slice(-60);
        }
        m.atualizado_em = new Date().toISOString();
        relatorio[p.slug].push(`${m.rotulo}: ${m.valor}`);
      } catch (e) {
        m.erro = (e as Error).message; // mantém o último valor bom
        relatorio[p.slug].push(`${m.rotulo}: erro (${m.erro})`);
      }
    }
    await admin.from("projetos").update({ metricas }).eq("id", p.id);
  }
  return NextResponse.json({ ok: true, relatorio });
}
