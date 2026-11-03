"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Trecho = { falante: string; url: string | null; de: number; ate: number; amostra: string };
type Props = { id: string; falantes: Record<string, string | null>; trechos: Trecho[]; socias: { id: string; nome: string }[] };

// cada voz da gravação vira uma sócia: ouve o trecho e escolhe (três toques)
export function AssociarFalantes({ id, falantes, trechos, socias }: Props) {
  const router = useRouter();
  const [escolha, setEscolha] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(falantes).map(([f, p]) => [f, p ?? ""])),
  );
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const completo = Object.keys(falantes).every((f) => escolha[f]);

  async function enviar() {
    setEnviando(true);
    setErro("");
    const r = await fetch(`/api/reunioes/${id}/falantes`, { method: "POST", body: JSON.stringify({ falantes: escolha }) });
    if (!r.ok) {
      setEnviando(false);
      return setErro("não consegui montar a proposta agora. suas escolhas ficaram guardadas, tenta de novo.");
    }
    router.refresh();
  }

  return (
    <section className="bloco">
      <h2>quem é quem?</h2>
      <p className="m-meta" style={{ margin: 0 }}>ouça um trecho de cada voz e escolha a sócia.</p>
      {trechos.map((t, n) => (
        <div className="vidro quieto" key={t.falante} style={{ display: "grid", gap: 8 }}>
          <span className="m-small">voz {n + 1}</span>
          <span className="m-meta">“{t.amostra}”</span>
          {t.url && <audio controls preload="none" src={`${t.url}#t=${t.de},${t.ate}`} style={{ width: "100%" }} />}
          <div className="linha">
            {socias.map((s) => (
              <button key={s.id} className="chip" aria-pressed={escolha[t.falante] === s.id} onClick={() => setEscolha((e) => ({ ...e, [t.falante]: s.id }))}>
                {s.nome.toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      ))}
      {erro && <p className="erro">{erro}</p>}
      <div><button className="btn acento" disabled={!completo || enviando} onClick={enviar}>{enviando ? "organizando a reunião…" : "montar a proposta"}</button></div>
    </section>
  );
}
