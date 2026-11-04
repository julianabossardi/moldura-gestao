"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/client";
import { BLOCO_SEGUNDOS, mmss, type Marcacao, type Painel } from "@/lib/reuniao/tipos";
import { PainelProjetoView } from "./PainelProjetoView";
import { Icone } from "../Icone";
import { TIPOS_LINK, type LinkProjeto } from "@/lib/links";
import { abrirMicrofone, extensaoDe, formatoDeGravacao } from "@/lib/audio";

type Props = { reuniaoId: string; painel: Painel; audioPaths: string[]; marcacoes: Marcacao[]; links: Record<string, LinkProjeto[]> };

// grava no navegador em blocos de 10 minutos, sobe cada bloco ao terminar e registra
// a hora de cada troca de projeto e de cada marcação ("isso é decisão", "isso é tarefa")
export function ModoReuniao({ reuniaoId, painel, audioPaths, marcacoes: inicial, links }: Props) {
  const router = useRouter();
  const supabase = useRef(supabaseNavegador()).current;
  const [i, setI] = useState(0);
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(audioPaths.length * BLOCO_SEGUNDOS);
  const [aviso, setAviso] = useState("");
  const [encerrando, setEncerrando] = useState(false);

  const marcacoes = useRef<Marcacao[]>(inicial);
  const paths = useRef<string[]>(audioPaths);
  const inicio = useRef(0);
  const stream = useRef<MediaStream | null>(null);
  const gravador = useRef<MediaRecorder | null>(null);
  const pendentes = useRef<Promise<unknown>[]>([]);
  const parando = useRef(false);
  const corte = useRef<ReturnType<typeof setTimeout> | null>(null);

  const atual = painel.projetos[i];
  const projetoId = atual?.projeto?.id ?? null;

  useEffect(() => {
    if (!gravando) return;
    const t = setInterval(() => setSegundos(Math.floor((Date.now() - inicio.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [gravando]);

  const salvarMarcacoes = () => supabase.from("reunioes").update({ marcacoes: marcacoes.current }).eq("id", reuniaoId);

  function iniciarBloco() {
    const formato = formatoDeGravacao();
    const g = new MediaRecorder(stream.current!, formato ? { mimeType: formato } : undefined);
    const pedacos: Blob[] = [];
    g.ondataavailable = (e) => e.data.size && pedacos.push(e.data);
    g.onstop = () => {
      const n = paths.current.length + 1;
      const tipo = g.mimeType || formato || "audio/webm";
      const caminho = `reunioes/${reuniaoId}/bloco-${String(n).padStart(3, "0")}.${extensaoDe(tipo)}`;
      const blob = new Blob(pedacos, { type: tipo });
      paths.current = [...paths.current, caminho]; // reserva o número do bloco já
      pendentes.current.push(
        supabase.storage.from("midia").upload(caminho, blob, { contentType: blob.type })
          .then(({ error }) => {
            if (error) setAviso("um bloco de áudio não subiu. confira a conexão.");
            return supabase.from("reunioes").update({ audio_paths: paths.current }).eq("id", reuniaoId);
          }),
      );
      if (!parando.current) iniciarBloco();
    };
    g.start();
    gravador.current = g;
    corte.current = setTimeout(() => g.state === "recording" && g.stop(), BLOCO_SEGUNDOS * 1000);
  }

  async function comecar() {
    const { stream: s, erro } = await abrirMicrofone();
    if (!s) return setAviso(erro ?? "preciso de acesso ao microfone para gravar.");
    stream.current = s;
    setAviso("");
    parando.current = false;
    inicio.current = Date.now() - paths.current.length * BLOCO_SEGUNDOS * 1000;
    marcacoes.current = [...marcacoes.current, { tipo: "projeto", projeto_id: projetoId, em: paths.current.length * BLOCO_SEGUNDOS }];
    salvarMarcacoes();
    iniciarBloco();
    setGravando(true);
  }

  function irPara(novo: number) {
    if (novo < 0 || novo >= painel.projetos.length) return;
    setI(novo);
    if (gravando) {
      marcacoes.current = [...marcacoes.current, { tipo: "projeto", projeto_id: painel.projetos[novo].projeto?.id ?? null, em: segundos }];
      salvarMarcacoes();
    }
  }

  function marcar(tipo: "decisao" | "tarefa") {
    marcacoes.current = [...marcacoes.current, { tipo, projeto_id: projetoId, em: segundos }];
    salvarMarcacoes();
    setAviso(`marcado: isso é ${tipo === "decisao" ? "decisão" : "tarefa"}, às ${mmss(segundos)}`);
  }

  async function encerrar() {
    setEncerrando(true);
    parando.current = true;
    if (corte.current) clearTimeout(corte.current);
    const g = gravador.current;
    if (g && g.state !== "inactive") {
      await new Promise((ok) => { g.addEventListener("stop", () => ok(null), { once: true }); g.stop(); });
    }
    stream.current?.getTracks().forEach((t) => t.stop());
    await Promise.all(pendentes.current);
    await salvarMarcacoes();
    await supabase.from("reunioes").update({ status: "processando", audio_paths: paths.current, encerrada_em: new Date().toISOString() }).eq("id", reuniaoId);
    router.push(`/reuniao/${reuniaoId}`);
  }

  return (
    <section className="bloco" style={{ gap: "var(--m-space-5)" }}>
      <div className="vidro linha" style={{ justifyContent: "space-between" }}>
        <div className="linha">
          <span className="m-mono" aria-live="off" style={{ fontSize: 28 }}>{mmss(segundos)}</span>
          {gravando && <span className="selo">gravando</span>}
        </div>
        <div className="linha">
          {!gravando ? (
            <button className="btn acento" onClick={comecar}><Icone nome="microfone-branco" /> {audioPaths.length ? "continuar" : "começar"}</button>
          ) : (
            <button className="btn" disabled={encerrando} onClick={encerrar}><Icone nome="parar-branco" /> {encerrando ? "subindo o áudio…" : "encerrar"}</button>
          )}
          {!gravando && audioPaths.length > 0 && !encerrando && (
            <button className="btn sutil" onClick={encerrar}>encerrar sem gravar mais</button>
          )}
        </div>
      </div>
      <p className="m-meta" style={{ margin: 0 }}>
        a gravação é uma só, da reunião inteira, para todas. vocês conversam projeto por projeto; ao encerrar, a moldura transcreve,
        separa o que foi dito em cada projeto e propõe os encaminhamentos (tarefas, decisões e ideias) para vocês revisarem antes de guardar.
      </p>
      {aviso && <p className="aviso" role="status">{aviso}</p>}

      <div className="linha" style={{ justifyContent: "space-between" }}>
        <button className="btn sutil" disabled={i === 0} onClick={() => irPara(i - 1)}>voltar</button>
        <div style={{ textAlign: "center" }}>
          <h2 className="m-h2" style={{ margin: 0 }}>{atual?.projeto?.nome ?? "soltos"}</h2>
          <span className="m-mono">{i + 1} de {painel.projetos.length}</span>
        </div>
        <button className="btn sutil" disabled={i === painel.projetos.length - 1} onClick={() => irPara(i + 1)}>avançar</button>
      </div>

      <div className="linha">
        <button className="chip" disabled={!gravando} onClick={() => marcar("decisao")}>isso é decisão</button>
        <button className="chip" disabled={!gravando} onClick={() => marcar("tarefa")}>isso é tarefa</button>
      </div>

      {atual?.projeto && (links[atual.projeto.id] ?? []).length > 0 && (
        <div className="linha">
          {(links[atual.projeto.id] ?? []).map((l, k) => (
            <a key={k} className="link-rapido" href={l.url} target="_blank" rel="noreferrer">
              <span className="m-meta">{TIPOS_LINK[l.tipo ?? ""] ?? "link"}</span><span className="m-small">{l.titulo}</span>
            </a>
          ))}
        </div>
      )}

      {atual && <PainelProjetoView bloco={atual} />}
    </section>
  );
}
