"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icone } from "./Icone";
import { abrirMicrofone, extensaoDe, formatoDeGravacao } from "@/lib/audio";

export function Captura({ projetoId, placeholder = "cola ou escreve", rotuloOk = "" }: { projetoId?: string; placeholder?: string; rotuloOk?: string }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [gravando, setGravando] = useState(false);
  const [msg, setMsg] = useState("");
  const gravador = useRef<MediaRecorder | null>(null);
  const pedacos = useRef<Blob[]>([]);
  const segurando = useRef(false); // soltou antes do microfone abrir? então não grava

  async function enviar(corpo: FormData) {
    setMsg("organizando…");
    if (projetoId) corpo.set("projeto_id", projetoId);
    const r = await fetch("/api/capturas", { method: "POST", body: corpo });
    setMsg(r.ok ? rotuloOk : "não consegui organizar essa. ela ficou guardada.");
    router.refresh();
  }

  async function comecar() {
    segurando.current = true;
    setMsg("");
    const { stream, erro } = await abrirMicrofone();
    if (!stream) return setMsg(erro ?? "não consegui abrir o microfone.");
    if (!segurando.current) return stream.getTracks().forEach((t) => t.stop());
    pedacos.current = [];
    const formato = formatoDeGravacao();
    const g = new MediaRecorder(stream, formato ? { mimeType: formato } : undefined);
    g.ondataavailable = (e) => e.data.size && pedacos.current.push(e.data);
    g.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const tipo = g.mimeType || formato || "audio/webm";
      const blob = new Blob(pedacos.current, { type: tipo });
      if (!blob.size) return;
      const f = new FormData();
      f.set("arquivo", new File([blob], `audio.${extensaoDe(tipo)}`, { type: tipo }));
      enviar(f);
    };
    g.start();
    gravador.current = g;
    setGravando(true);
  }
  function parar() {
    segurando.current = false;
    if (gravador.current?.state === "recording") gravador.current.stop();
    setGravando(false);
  }

  function colar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    const f = new FormData();
    f.set("texto", texto);
    setTexto("");
    enviar(f);
  }

  return (
    <form className="vidro captura" onSubmit={colar}>
      {msg && msg !== "organizando…" && <p className="captura-aviso" role="status">{msg}</p>}
      <input placeholder={msg || placeholder} value={texto} onChange={(e) => setTexto(e.target.value)} aria-label={placeholder} />
      <button
        type="button"
        className={`gravar ${gravando ? "gravando" : ""}`}
        aria-label="segurar para gravar"
        onPointerDown={comecar}
        onPointerUp={parar}
        onPointerLeave={() => gravando && parar()}
      >
        <Icone nome="microfone-branco" tam={24} />
      </button>
    </form>
  );
}
