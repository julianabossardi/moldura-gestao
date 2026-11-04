"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// enquanto os blocos de áudio são transcritos, pergunta de tempos em tempos como estão
export function ProcessandoReuniao({ id }: { id: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState("transcrevendo a reunião. pode fechar a página e voltar depois.");
  useEffect(() => {
    let vivo = true;
    let t: ReturnType<typeof setTimeout>;
    async function passo() {
      try {
        const r = await fetch(`/api/reunioes/${id}/avancar`, { method: "POST" });
        const j = await r.json();
        if (!vivo) return;
        if (j.pronta) return router.refresh();
        if (j.erro) setMsg(`a transcrição tropeçou: ${j.erro}. tentando de novo.`);
        else if (j.blocos) setMsg(`transcrevendo: ${j.feitos} de ${j.blocos} blocos.`);
      } catch { /* sem rede: tenta no próximo ciclo */ }
      t = setTimeout(passo, 6000);
    }
    passo();
    return () => { vivo = false; clearTimeout(t); };
  }, [id, router]);
  return <div className="vidro quieto"><p className="m-body" style={{ margin: 0 }}>{msg}</p></div>;
}
