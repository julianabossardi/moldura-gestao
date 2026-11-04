import { supabaseServidor } from "@/lib/supabase/server";
import { NavProjetos } from "./NavProjetos";

export async function NavegacaoProjetos({ atual }: { atual?: string }) {
  const supabase = await supabaseServidor();
  const { data } = await supabase.from("projetos").select("id, slug, nome, status, ordem_prioridade").order("ordem_prioridade", { nullsFirst: false });
  const todos = data ?? [];
  return (
    <NavProjetos
      ativos={todos.filter((p) => p.status === "ativo")}
      arquivados={todos.filter((p) => p.status === "arquivado")}
      atual={atual}
    />
  );
}
