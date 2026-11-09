"use client";
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/client";
import { SELECT_CARTAO, atrasada, importante } from "@/lib/cartao";
import { abrirMicrofone, extensaoDe, formatoDeGravacao } from "@/lib/audio";
import { hojeISO } from "@/lib/datas";
import { Gaveta } from "./Gaveta";
import { Avatar } from "./Avatar";
import { Icone } from "./Icone";
import { BotoesReacao } from "./BotoesReacao";
import { FormItem } from "./FormItem";
import { IssoPodeAjudar } from "./IssoPodeAjudar";

type Props = {
  id: string;
  euId: string;
  projetos: { id: string; nome: string }[];
  pessoas: { id: string; nome: string }[];
  onFechar: () => void;
};

type Item = {
  id: string; tipo: string; titulo: string; corpo: string | null; objetivo: string | null; definicao_pronto: string | null;
  url: string | null; status: string; prioridade: string | null; prazo: string | null; projeto_id: string | null;
  responsavel_id: string | null; origem: string; minutos_estimados: number | null; midia: string[] | null; criado_em: string;
  visivel_cliente: boolean; comeca_em: string | null; recorrencia_id: string | null;
  espera: { titulo: string; status: string } | null;
  projeto: { nome: string } | null; responsavel: { nome: string } | null; autor: { nome: string } | null;
  reacoes: { tipo: string }[];
  audios: { id: string; pessoa_id: string; audio_path: string | null; pessoa: { nome: string } | null }[];
};

const TIPO: Record<string, string> = { tarefa: "tarefa", ideia: "ideia", reflexao: "reflexão", referencia: "referência", decisao: "decisão", entrega: "entrega" };
const STATUS: Record<string, string> = { aberta: "a fazer", fazendo: "em andamento", concluida: "feita", arquivada: "cancelada", expirada: "expirada" };
const LIMITE_AUDIO_MS = 30_000;

// detalhes de um item, num resumo curto, com a opção de editar
export function DetalheItem({ id, euId, projetos, pessoas, onFechar }: Props) {
  const router = useRouter();
  const supabase = useRef(supabaseNavegador()).current;
  const [item, setItem] = useState<Item | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [editando, setEditando] = useState(false);
  const [ocupada, setOcupada] = useState(false);

  const carregar = useCallback(async () => {
    const { data } = await supabase
      .from("itens")
      .select(`${SELECT_CARTAO}, visivel_cliente, audios:reacoes(id, pessoa_id, tipo, audio_path, pessoa:pessoas(nome))`)
      .eq("id", id)
      .eq("audios.tipo", "audio")
      .single();
    if (!data) return;
    const i = data as unknown as Item;
    const caminhos = [...(i.midia ?? []), ...i.audios.map((a) => a.audio_path).filter(Boolean)] as string[];
    const { data: assinadas } = caminhos.length ? await supabase.storage.from("midia").createSignedUrls(caminhos, 3600) : { data: [] };
    setUrls(Object.fromEntries((assinadas ?? []).filter((a) => a.signedUrl).map((a) => [a.path, a.signedUrl])));
    setItem(i);
  }, [id, supabase]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function mudarStatus(status: "aberta" | "fazendo" | "concluida" | "arquivada") {
    if (!item) return;
    setOcupada(true);
    const recorte = ["recorte", "faxina"].includes(item.origem);
    await supabase.from("itens").update({
      status,
      ...(status === "fazendo" && !item.responsavel_id && { responsavel_id: euId }),
      ...(status === "concluida" && recorte && { recorte_retorno: "concluido" }),
      ...(status === "fazendo" && recorte && { recorte_retorno: "aceito" }),
    }).eq("id", item.id);
    setOcupada(false);
    router.refresh();
    carregar();
  }

  if (!item) return <Gaveta titulo="carregando" onFechar={onFechar}><p className="aviso">abrindo…</p></Gaveta>;

  if (editando) {
    return (
      <Gaveta titulo={`editar ${TIPO[item.tipo] ?? "item"}`} onFechar={onFechar}>
        <FormItem
          item={{ ...item, responsavel_id: item.responsavel_id }}
          autorId={euId}
          projetos={projetos}
          pessoas={pessoas}
          onSalvo={() => { setEditando(false); router.refresh(); carregar(); }}
        />
        <button className="btn sutil" onClick={() => setEditando(false)}>voltar sem salvar</button>
      </Gaveta>
    );
  }

  const tarefa = item.tipo === "tarefa";
  const pessoa = tarefa ? item.responsavel?.nome ?? null : item.autor?.nome ?? null;
  const cartao = { ...item, projeto: item.projeto?.nome ?? null };
  const conta = (t: string) => item.reacoes.filter((r) => r.tipo === t).length;

  return (
    <Gaveta titulo={[TIPO[item.tipo], item.projeto?.nome].filter(Boolean).join(" · ")} onFechar={onFechar}>
      <h2 className="m-h3" style={{ margin: 0 }}>{item.titulo}</h2>

      <div className="linha">
        {importante(cartao) && <span className="marca"><Icone nome="importante" tam={16} /> importante</span>}
        {atrasada(cartao) && <span className="marca atrasada"><Icone nome="atrasada" tam={16} /> atrasada</span>}
        {item.status !== "aberta" && <span className="m-mono">{STATUS[item.status] ?? item.status}</span>}
        {item.minutos_estimados && <span className="m-mono">{item.minutos_estimados} min</span>}
        {item.recorrencia_id && <span className="m-mono">tarefa que se repete</span>}
        {item.comeca_em && item.comeca_em > hojeISO() && <span className="m-mono">começa em {new Date(item.comeca_em + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}</span>}
        {item.espera && item.espera.status !== "concluida" && <span className="m-mono">espera: {item.espera.titulo}</span>}
      </div>

      <div className="linha" style={{ gap: 10 }}>
        <Avatar nome={pessoa} tam={72} />
        <span className="m-small">{pessoa ? `${tarefa ? "com" : "de"} ${pessoa.toLowerCase()}` : "sem responsável"}</span>
        {item.prazo && <span className="m-meta">· até {new Date(item.prazo + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}</span>}
      </div>

      {tarefa ? (
        <>
          {item.objetivo && <Trecho rotulo="objetivo" texto={item.objetivo} />}
          {item.definicao_pronto && <Trecho rotulo="definição de pronto" texto={item.definicao_pronto} />}
          {item.corpo && <Trecho rotulo={item.objetivo || item.definicao_pronto ? "anotações" : "sobre"} texto={item.corpo} />}
          {!item.objetivo && !item.definicao_pronto && !item.corpo && <p className="aviso">sem objetivo nem definição de pronto ainda. dá para completar em editar.</p>}
        </>
      ) : (
        item.corpo && <p className="m-body" style={{ margin: 0, whiteSpace: "pre-line" }}>{item.corpo}</p>
      )}

      {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="m-small">{item.url}</a>}
      {(item.midia ?? []).map((m) => urls[m] && <img key={m} className="entrega-img" src={urls[m]} alt={item.titulo} />)}

      <BotoesReacao itemId={item.id} euId={euId} foguinho={conta("foguinho")} estrela={conta("estrela")} />

      {item.tipo === "entrega" && (
        <div className="bloco" style={{ gap: 8 }}>
          <span className="m-meta">respostas em áudio</span>
          {item.audios.map((a) => a.audio_path && urls[a.audio_path] && (
            <div key={a.id} className="m-meta">
              {a.pessoa?.nome.toLowerCase()}
              <audio controls src={urls[a.audio_path]} style={{ display: "block", width: "100%", marginTop: 4 }} />
            </div>
          ))}
          <ResponderEmAudio itemId={item.id} euId={euId} minha={item.audios.find((a) => a.pessoa_id === euId)?.id ?? null} onEnviado={carregar} />
        </div>
      )}

      {tarefa && <IssoPodeAjudar itemId={item.id} />}

      <div className="linha" style={{ marginTop: 8 }}>
        {tarefa && item.status === "aberta" && <button className="btn acento" disabled={ocupada} onClick={() => mudarStatus("fazendo")}>começar</button>}
        {tarefa && ["aberta", "fazendo"].includes(item.status) && <button className="btn" disabled={ocupada} onClick={() => mudarStatus("concluida")}><Icone nome="check-branco" /> feita</button>}
        {tarefa && item.status === "concluida" && <button className="btn" disabled={ocupada} onClick={() => mudarStatus("fazendo")}>desfazer feita</button>}
        {tarefa && item.status === "arquivada" && <button className="btn" disabled={ocupada} onClick={() => mudarStatus("aberta")}>reabrir</button>}
        {tarefa && ["aberta", "fazendo"].includes(item.status) && <button className="btn sutil" disabled={ocupada} onClick={() => mudarStatus("arquivada")}>cancelar tarefa</button>}
        <button className="btn sutil" onClick={() => setEditando(true)}>editar</button>
      </div>
    </Gaveta>
  );
}

function Trecho({ rotulo, texto }: { rotulo: string; texto: string }) {
  return (
    <div>
      <span className="m-meta">{rotulo}</span>
      <p className="m-body" style={{ margin: "2px 0 0", whiteSpace: "pre-line" }}>{texto}</p>
    </div>
  );
}

// resposta curta em áudio (até 30 s). a nova substitui a anterior da mesma pessoa, sem apagar nada do banco
function ResponderEmAudio({ itemId, euId, minha, onEnviado }: { itemId: string; euId: string; minha: string | null; onEnviado: () => void }) {
  const [gravando, setGravando] = useState(false);
  const [aviso, setAviso] = useState("");
  const gravador = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function alternar() {
    if (gravando) return gravador.current?.stop();
    const { stream, erro } = await abrirMicrofone();
    if (!stream) return setAviso(erro ?? "");
    setAviso("");
    const pedacos: Blob[] = [];
    const formato = formatoDeGravacao();
    const g = new MediaRecorder(stream, formato ? { mimeType: formato } : undefined);
    g.ondataavailable = (e) => e.data.size && pedacos.push(e.data);
    g.onstop = async () => {
      if (timer.current) clearTimeout(timer.current);
      stream.getTracks().forEach((t) => t.stop());
      setGravando(false);
      const tipo = g.mimeType || formato || "audio/webm";
      const blob = new Blob(pedacos, { type: tipo });
      const caminho = `${euId}/reacoes/${crypto.randomUUID()}.${extensaoDe(tipo)}`;
      const supabase = supabaseNavegador();
      const { error } = await supabase.storage.from("midia").upload(caminho, blob, { contentType: tipo });
      if (error) return setAviso("o áudio não subiu. confira a conexão e tente de novo.");
      const r = minha
        ? await supabase.from("reacoes").update({ audio_path: caminho }).eq("id", minha)
        : await supabase.from("reacoes").insert({ item_id: itemId, pessoa_id: euId, tipo: "audio", audio_path: caminho });
      if (r.error) return setAviso("não consegui guardar a resposta.");
      onEnviado();
    };
    g.start();
    gravador.current = g;
    setGravando(true);
    timer.current = setTimeout(() => g.state === "recording" && g.stop(), LIMITE_AUDIO_MS);
  }

  return (
    <div>
      <button className={`chip ${gravando ? "gravando-chip" : ""}`} onClick={alternar}>
        <Icone nome={gravando ? "parar-branco" : "microfone"} /> {gravando ? "parar e enviar" : minha ? "gravar de novo" : "responder em áudio"}
      </button>
      {aviso && <p className="erro" role="status" style={{ margin: "6px 0 0" }}>{aviso}</p>}
    </div>
  );
}
