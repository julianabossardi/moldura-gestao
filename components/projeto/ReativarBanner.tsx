"use client";
import { useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/client";

export function ReativarBanner({ projetoId }: { projetoId: string }) {
  const router = useRouter();
  async function reativar() {
    await supabaseNavegador().rpc("reativar_projeto", { p_id: projetoId });
    router.refresh();
  }
  return (
    <div className="vidro quieto linha" style={{ justifyContent: "space-between" }}>
      <span className="m-body">este projeto está arquivado. o histórico continua aqui.</span>
      <button className="btn" onClick={reativar}>reativar</button>
    </div>
  );
}
