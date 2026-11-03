"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function Captura({ projetoId }: { projetoId?: string }) {
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
    setMsg(r.ok ? "" : "não consegui organizar essa. ela ficou guardada.");
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
      <input placeholder={msg || "cola ou escreve"} value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="cola ou escreve" />
      <button
        type="button"
        className={`gravar ${gravando ? "gravando" : ""}`}
        aria-label="segurar para gravar"
        onPointerDown={comecar}
        onPointerUp={parar}
        onPointerLeave={() => gravando && parar()}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
        </svg>
      </button>
    </form>
  );
}
