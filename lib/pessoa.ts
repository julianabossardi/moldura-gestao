import { redirect } from "next/navigation";
import { supabaseServidor } from "./supabase/server";

export async function pessoaAtual() {
  const supabase = await supabaseServidor();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const { data: pessoa } = await supabase.from("pessoas").select("*").eq("id", auth.user.id).single();
  return { supabase, user: auth.user, pessoa };
}
