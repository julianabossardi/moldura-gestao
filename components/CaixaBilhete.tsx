"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/client";
import { haQuanto } from "@/lib/datas";
import { CartaoBilhete } from "./CartaoBilhete";

export type BilheteEnviado = { id: string; texto: string; criado_em: string; lido_em: string | null };

// no lugar da seleção de tarefas, na página da colega: deixar um bilhete, ver como ele vai aparecer pra ela
// e ver os que já foram (com "leu" ou "ainda não leu")
export function CaixaBilhete({ euId, euNome, paraId, paraNome, enviados }: {
  euId: string; euNome: string; paraId: string; paraNome: string; enviados: BilheteEnviado[];
}) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const primeiro = paraNome.split(" ")[0].toLowerCase();

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    setErro("");
    const { error } = await supabaseNavegador().from("bilhetes").insert({ de_id: euId, para_id: paraId, texto: texto.trim() });
    setEnviando(false);
    if (error) return setErro("não consegui deixar o bilhete. tenta de novo.");
    setTexto("");
    router.refresh();
  }

  return (
    <div className="vidro hero-seletor">
      <h2 className="m-lead" style={{ margin: 0 }}>deixar um bilhete para {primeiro}</h2>
      <form className="bloco" style={{ gap: 8 }} onSubmit={enviar}>
        <textarea className="campo" rows={3} maxLength={1000} placeholder={`um recado curto para ${primeiro}`} value={texto} onChange={(e) => setTexto(e.target.value)} aria-label={`bilhete para ${primeiro}`} />
        {texto.trim() && (
          <div className="bloco" style={{ gap: 6 }}>
            <span className="m-meta">assim {primeiro} vai ver, num pop-up na página inicial</span>
            <CartaoBilhete de={euNome} texto={texto.trim()} />
          </div>
        )}
        {erro && <p className="erro" role="alert">{erro}</p>}
        <div><button className="btn acento" disabled={enviando || !texto.trim()}>{enviando ? "deixando…" : "deixar bilhete"}</button></div>
      </form>
      {enviados.length > 0 && (
        <div className="bloco" style={{ gap: 4 }}>
          <span className="m-meta">os últimos que você deixou</span>
          {enviados.map((b) => (
            <div className="item" key={b.id}>
              <span>{b.texto}</span>
              <span className="m-mono">{b.lido_em ? `${primeiro} leu ${haQuanto(b.lido_em)}` : "ainda não leu"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
