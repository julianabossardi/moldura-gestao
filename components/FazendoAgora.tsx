"use client";
import { useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/client";

export function FazendoAgora({ item }: { item: { id: string; titulo: string; origem: string } }) {
  const router = useRouter();
  async function concluir() {
    await supabaseNavegador()
      .from("itens")
      .update({ status: "concluida", ...(item.origem === "recorte" && { recorte_retorno: "concluido" }) })
      .eq("id", item.id);
    router.refresh();
  }
  return (
    <div className="vidro quieto linha" style={{ justifyContent: "space-between" }}>
      <div><span className="m-meta">fazendo agora</span><div className="m-lead">{item.titulo}</div></div>
      <button className="btn" onClick={concluir}>concluir</button>
    </div>
  );
}
