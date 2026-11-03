/**
 * cria um projeto.
 *
 * npm run projeto:criar -- --nome "folga" --slug folga --ordem 1 \
 *   --fundo "#ffffff" --texto "#1a1a1f" --destaque "#e32450" \
 *   --metrica "usuários|sql|select count(*) from auth.users|FOLGA_DATABASE_URL" \
 *   --metrica "visitas|manual|0"
 *
 * metrica: rotulo|fonte|valor-ou-consulta|variavel-da-conexao (opcional)
 */
import { supabaseAdmin } from "../lib/supabase/admin";

const args = process.argv.slice(2);
const pega = (chave: string) => {
  const i = args.indexOf(`--${chave}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const todas = (chave: string) => args.flatMap((a, i) => (a === `--${chave}` ? [args[i + 1]] : []));

const nome = pega("nome");
if (!nome) {
  console.error('falta --nome. exemplo: npm run projeto:criar -- --nome "folga" --ordem 1');
  process.exit(1);
}
const slug = pega("slug") ?? nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const metricas = todas("metrica").map((m) => {
  const [rotulo, fonte, extra, conexao_env] = m.split("|");
  return fonte === "manual"
    ? { rotulo, fonte, valor: Number(extra || 0), historico: [] }
    : { rotulo, fonte, consulta: extra, ...(conexao_env && { conexao_env }), historico: [] };
});

async function main() {
  const { data, error } = await supabaseAdmin()
    .from("projetos")
    .insert({
      slug,
      nome,
      descricao: pega("descricao") ?? null,
      ordem_prioridade: pega("ordem") ? Number(pega("ordem")) : null,
      tema: {
        cor_fundo: pega("fundo") ?? "#ffffff",
        cor_texto: pega("texto") ?? "#1a1a1f",
        cor_destaque: pega("destaque") ?? "#e32450",
        fonte: pega("fonte") ?? "Instrument Sans",
        icone: pega("icone") ?? slug,
      },
      metricas: metricas.slice(0, 3),
    })
    .select("slug")
    .single();

  if (error) {
    console.error("não deu para criar:", error.message);
    process.exit(1);
  }
  console.log(`projeto criado: /projetos/${data.slug}`);
}

main();
