"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icone } from "./Icone";
import { supabaseNavegador } from "@/lib/supabase/client";

export type Reacao = { id: string; pessoa_id: string; tipo: string; audio_url: string | null; pessoa: { nome: string } | null };
export type Entrega = {
  id: string;
  titulo: string;
  corpo: string | null;
  criado_em: string;
  midia_urls: string[];
  autor: string;
  projeto: string | null;
  reacoes: Reacao[];
};

const LIMITE_AUDIO_MS = 30_000;

export function EntregaCard({ entrega, euId }: { entrega: Entrega; euId: string }) {
  const router = useRouter();
  const [gravando, setGravando] = useState(false);
  const gravador = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = supabaseNavegador();

  const foguinhos = entrega.reacoes.filter((r) => r.tipo === "foguinho");
  const audios = entrega.reacoes.filter((r) => r.tipo === "audio" && r.audio_url);
  const meuFoguinho = foguinhos.find((r) => r.pessoa_id === euId);

  async function foguinho() {
    if (meuFoguinho) await supabase.from("reacoes").delete().eq("id", meuFoguinho.id);
    else await supabase.from("reacoes").insert({ item_id: entrega.id, pessoa_id: euId, tipo: "foguinho" });
    router.refresh();
  }

  async function gravarAudio() {
    if (gravando) return gravador.current?.stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const pedacos: Blob[] = [];
      const g = new MediaRecorder(stream);
      g.ondataavailable = (e) => pedacos.push(e.data);
      g.onstop = async () => {
        if (timer.current) clearTimeout(timer.current);
        stream.getTracks().forEach((t) => t.stop());
        setGravando(false);
        const blob = new Blob(pedacos, { type: g.mimeType || "audio/webm" });
        const caminho = `${euId}/reacoes/${crypto.randomUUID()}.webm`;
        const { error } = await supabase.storage.from("midia").upload(caminho, blob, { contentType: blob.type });
        if (!error) {
          // uma reação em áudio por pessoa em cada entrega: a nova substitui a anterior
          await supabase.from("reacoes").delete().eq("item_id", entrega.id).eq("pessoa_id", euId).eq("tipo", "audio");
          await supabase.from("reacoes").insert({ item_id: entrega.id, pessoa_id: euId, tipo: "audio", audio_path: caminho });
        }
        router.refresh();
      };
      g.start();
      gravador.current = g;
      setGravando(true);
      timer.current = setTimeout(() => g.state === "recording" && g.stop(), LIMITE_AUDIO_MS);
    } catch {
      /* sem microfone: a reação em foguinho continua disponível */
    }
  }

  return (
    <article className="vidro quieto entrega">
      {entrega.midia_urls[0] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="entrega-img" src={entrega.midia_urls[0]} alt={entrega.titulo} />
      )}
      <div className="m-meta">{entrega.autor}{entrega.projeto ? ` · ${entrega.projeto}` : ""}</div>
      <h3 className="m-h4" style={{ margin: 0 }}>{entrega.titulo}</h3>
      {entrega.corpo && <p className="m-body" style={{ margin: 0 }}>{entrega.corpo}</p>}
      <div className="linha">
        <button className="chip" aria-pressed={!!meuFoguinho} onClick={foguinho} aria-label="foguinho"><Icone nome="foguinho" /> {foguinhos.length || ""}</button>
        <button className={`chip ${gravando ? "gravando-chip" : ""}`} onClick={gravarAudio}><Icone nome={gravando ? "parar-branco" : "microfone"} /> {gravando ? "parar" : "responder em áudio"}</button>
      </div>
      {audios.map((a) => (
        <div key={a.id} className="m-meta">
          {a.pessoa?.nome}
          <audio controls src={a.audio_url!} style={{ display: "block", width: "100%", marginTop: 4 }} />
        </div>
      ))}
    </article>
  );
}
