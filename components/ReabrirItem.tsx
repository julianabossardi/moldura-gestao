"use client";
import { useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/client";

// traz de volta para o backlog algo arquivado ou expirado (conta como movimento: ideia ganha mais 6 semanas)
export function ReabrirItem({ id }: { id: string }) {
  const router = useRouter();
  async function reabrir() {
    await supabaseNavegador().from("itens").update({ status: "aberta" }).eq("id", id);
    router.refresh();
  }
  return <button className="btn sutil" onClick={reabrir}>voltar para o backlog</button>;
}
