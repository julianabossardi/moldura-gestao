"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/client";

type Props = { autorId: string; projetos: { id: string; nome: string }[]; projetoInicial: string | null };

// botão "mostrar": mesma captura, já marcada como entrega para o mural
export function Mostrar({ autorId, projetos, projetoInicial }: Props) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [corpo, setCorpo] = useState("");
  const [projeto, setProjeto] = useState(projetoInicial ?? "");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function enviar() {
    if (!titulo.trim()) return setErro("dá um título para o que você quer mostrar.");
    setSalvando(true);
    const supabase = supabaseNavegador();
    let caminho: string | null = null;
    if (arquivo) {
      caminho = `${autorId}/entregas/${crypto.randomUUID()}-${arquivo.name}`;
      const { error } = await supabase.storage.from("midia").upload(caminho, arquivo, { contentType: arquivo.type });
      if (error) {
        setSalvando(false);
        return setErro("não consegui subir o arquivo.");
      }
    }
    const { data: captura } = await supabase
      .from("capturas")
      .insert({ autor_id: autorId, projeto_id: projeto || null, formato: caminho ? "arquivo" : "texto", arquivo_path: caminho, texto: corpo || titulo, status: "confirmada" })
      .select("id")
      .single();
    const { error } = await supabase.from("itens").insert({
      tipo: "entrega", titulo: titulo.trim(), corpo: corpo || null, projeto_id: projeto || null,
      autor_id: autorId, midia: caminho ? [caminho] : [], origem: "captura", captura_id: captura?.id ?? null, status: "concluida",
    });
    setSalvando(false);
    if (error) return setErro("não deu para mostrar. tenta de novo.");
    setAberto(false); setTitulo(""); setCorpo(""); setArquivo(null); setErro("");
    router.refresh();
  }

  return (
    <>
      <button className="btn sutil" onClick={() => setAberto(true)}>mostrar</button>
      {aberto && (
        <>
          <div className="veu" onClick={() => setAberto(false)} />
          <aside className="painel vidro" role="dialog" aria-label="mostrar para a equipe">
            <div className="linha" style={{ justifyContent: "space-between" }}>
              <h2 className="m-h4" style={{ margin: 0 }}>mostrar para a equipe</h2>
              <button className="btn sutil" onClick={() => setAberto(false)}>fechar</button>
            </div>
            <label className="rotulo-campo">o que é
              <input className="campo" value={titulo} onChange={(e) => setTitulo(e.target.value)} autoFocus />
            </label>
            <label className="rotulo-campo">conta um pouco
              <textarea className="campo" rows={3} value={corpo} onChange={(e) => setCorpo(e.target.value)} />
            </label>
            <label className="rotulo-campo">projeto
              <select className="campo" value={projeto} onChange={(e) => setProjeto(e.target.value)}>
                <option value="">solto</option>
                {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </label>
            <label className="rotulo-campo">print ou imagem
              <input type="file" accept="image/*" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
            </label>
            {erro && <p className="erro">{erro}</p>}
            <button className="btn acento" disabled={salvando} onClick={enviar}>{salvando ? "enviando…" : "mostrar"}</button>
          </aside>
        </>
      )}
    </>
  );
}
