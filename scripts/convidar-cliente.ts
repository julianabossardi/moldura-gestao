/**
 * convida uma cliente para o portal do projeto dela. ela recebe um link mágico por e-mail.
 *
 * npm run cliente:convidar -- --nome "Maria Souza" --email maria@empresa.com --projetos folga,vetor
 */
import { supabaseAdmin } from "../lib/supabase/admin";

const args = process.argv.slice(2);
const pega = (chave: string) => {
  const i = args.indexOf(`--${chave}`);
  return i >= 0 ? args[i + 1] : undefined;
};

async function main() {
  const nome = pega("nome");
  const email = pega("email")?.toLowerCase();
  const slugs = (pega("projetos") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!nome || !email || !slugs.length) {
    console.error('uso: npm run cliente:convidar -- --nome "Maria" --email maria@empresa.com --projetos folga,vetor');
    process.exit(1);
  }
  const admin = supabaseAdmin();

  const { data: projetos } = await admin.from("projetos").select("id, slug").in("slug", slugs);
  const faltando = slugs.filter((s) => !projetos?.some((p) => p.slug === s));
  if (faltando.length) {
    console.error(`projeto não encontrado: ${faltando.join(", ")}`);
    process.exit(1);
  }

  // cria o acesso (ou reaproveita, se o e-mail já existe)
  let id: string | undefined;
  const criado = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (criado.data.user) id = criado.data.user.id;
  else {
    const lista = await admin.auth.admin.listUsers({ perPage: 1000 });
    id = lista.data.users.find((u) => u.email?.toLowerCase() === email)?.id;
  }
  if (!id) {
    console.error("não consegui criar o acesso:", criado.error?.message);
    process.exit(1);
  }

  const { error } = await admin.from("pessoas").upsert({ id, nome, papel: "cliente", projetos_cliente: projetos!.map((p) => p.id), ativa: true });
  if (error) {
    console.error("não deu para registrar a pessoa:", error.message);
    process.exit(1);
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100";
  const { error: erroLink } = await admin.auth.signInWithOtp({ email, options: { emailRedirectTo: `${site}/auth/callback`, shouldCreateUser: false } });
  if (erroLink) {
    console.error("acesso criado, mas o e-mail não saiu:", erroLink.message);
    process.exit(1);
  }
  console.log(`${nome} (${email}) convidada para: ${slugs.join(", ")}. o link mágico foi enviado.`);
}

main();
