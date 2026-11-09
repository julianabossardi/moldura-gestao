"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/client";
import { haQuanto } from "@/lib/datas";
import { CartaoBilhete } from "./CartaoBilhete";

export type BilheteRecebido = { id: string; texto: string; criado_em: string; de: string };

// pop-up com o bilhete que ainda não foi lido, um por vez, do mais antigo ao mais novo
export function BilhetePopup({ bilhetes }: { bilhetes: BilheteRecebido[] }) {
  const router = useRouter();
  const [lidos, setLidos] = useState<string[]>([]);
  const atual = bilhetes.find((b) => !lidos.includes(b.id));
  if (!atual) return null;
  const restam = bilhetes.filter((b) => !lidos.includes(b.id)).length - 1;

  async function li() {
    setLidos((l) => [...l, atual!.id]);
    await supabaseNavegador().from("bilhetes").update({ lido_em: new Date().toISOString() }).eq("id", atual!.id);
    router.refresh();
  }

  return (
    <>
      <div className="veu" />
      <div className="bilhete-popup" role="alertdialog" aria-modal="true" aria-label="bilhete novo">
        <CartaoBilhete de={atual.de} texto={atual.texto} quando={haQuanto(atual.criado_em)} />
        <div className="linha" style={{ justifyContent: "space-between" }}>
          <span className="m-meta">{restam > 0 ? `mais ${restam} ${restam === 1 ? "bilhete" : "bilhetes"} depois deste` : ""}</span>
          <button className="btn acento" autoFocus onClick={li}>li, obrigada</button>
        </div>
      </div>
    </>
  );
}
