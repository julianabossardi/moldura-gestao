import type { SupabaseClient } from "@supabase/supabase-js";

// para onde vai quem acabou de entrar: sócia na página inicial, cliente direto no portal do primeiro projeto
export async function destinoPosLogin(supabase: SupabaseClient): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return "/login";
  const { data: pessoa } = await supabase.from("pessoas").select("papel").eq("id", auth.user.id).single();
  if (pessoa?.papel !== "cliente") return "/";
  const { data: projeto } = await supabase.from("portal_projetos").select("slug").limit(1).maybeSingle();
  return projeto ? `/p/${projeto.slug}` : "/";
}
