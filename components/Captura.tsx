"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icone } from "./Icone";

export function Captura({ projetoId, placeholder = "cola ou escreve", rotuloOk = "" }: { projetoId?: string; placeholder?: string; rotuloOk?: string }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [gravando, setGravando] = useState(false);
  const [msg, setMsg] = useState("");
  const gravador = useRef<MediaRecorder | null>(null);
  const pedacos = useRef<Blob[]>([]);

  async function enviar(corpo: FormData) {
    setMsg("organizando…");
    if (projetoId) corpo.set("projeto_id", projetoId);
    const r = await fetch("/api/capturas", { method: "POST", body: corpo });
    setMsg(r.ok ? rotuloOk : "não consegui organizar essa. ela ficou guardada.");
    router.refresh();
  }

  async function comecar() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      pedacos.current = [];
      const g = new MediaRecorder(stream);
      g.ondataavailable = (e) => pedacos.current.push(e.data);
      g.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(pedacos.current, { type: g.mimeType || "audio/webm" });
        const f = new FormData();
        f.set("arquivo", new File([blob], "audio.webm", { type: blob.type }));
        enviar(f);
      };
      g.start();
      gravador.current = g;
      setGravando(true);
    } catch {
      setMsg("preciso de acesso ao microfone.");
    }
  }
  function parar() {
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
