"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/client";
import { Icone } from "./Icone";

type P = { id: string; slug: string; nome: string };

const CHAVE = "menu-lateral";
const LARGURA_FIXA = 1100; // acima disso o menu empurra a página; abaixo, fica por cima

// menu lateral esquerdo, com aba para abrir e fechar. arrastar os projetos muda a ordem de prioridade
export function NavProjetos({ ativos, arquivados, atual }: { ativos: P[]; arquivados: P[]; atual?: string }) {
  const router = useRouter();
  const [lista, setLista] = useState(ativos);
  const [aberto, setAberto] = useState(false);
  const [sobre, setSobre] = useState<number | null>(null);
  const origem = useRef<number | null>(null);

  // a lista local só serve para mostrar o arrasto na hora; quando o servidor manda outra, ela vale
  const [anterior, setAnterior] = useState(ativos);
  if (ativos !== anterior) {
    setAnterior(ativos);
    setLista(ativos);
  }

  // lembra a escolha por aparelho; sem escolha, abre só em tela larga
  useEffect(() => {
    let salvo: string | null = null;
    try { salvo = localStorage.getItem(CHAVE); } catch { /* sem storage: segue o padrão */ }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- storage só existe no navegador
    setAberto(salvo ? salvo === "aberto" : window.innerWidth >= LARGURA_FIXA);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.menu = aberto ? "aberto" : "fechado";
    try { localStorage.setItem(CHAVE, aberto ? "aberto" : "fechado"); } catch { /* ignora */ }
  }, [aberto]);

  const fecharNoCelular = () => window.innerWidth < LARGURA_FIXA && setAberto(false);

  async function soltar(destino: number) {
    const de = origem.current;
    origem.current = null;
    setSobre(null);
    if (de === null || de === destino) return;
    const nova = [...lista];
    nova.splice(destino, 0, nova.splice(de, 1)[0]);
    setLista(nova);
    const supabase = supabaseNavegador();
    await Promise.all(nova.map((p, i) => supabase.from("projetos").update({ ordem_prioridade: i + 1 }).eq("id", p.id)));
    router.refresh();
  }

  async function sair() {
    await supabaseNavegador().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function reativar(id: string) {
    await supabaseNavegador().rpc("reativar_projeto", { p_id: id });
    router.refresh();
  }

  return (
    <>
      <button
        className={`aba-menu vidro ${aberto ? "aberta" : ""}`}
        onClick={() => setAberto(!aberto)}
        aria-expanded={aberto}
        aria-controls="menu-lateral"
        aria-label={aberto ? "fechar menu" : "abrir menu"}
      >
        <span style={{ display: "grid", transform: aberto ? "scaleX(-1)" : undefined }}><Icone nome={aberto ? "seta-dir" : "menu"} tam={16} /></span>
      </button>

      <nav id="menu-lateral" className={`menu-lateral vidro ${aberto ? "aberto" : ""}`} aria-label="menu" aria-hidden={!aberto}>
        <div className="menu-bloco">
          <Link href="/" className="menu-item" aria-current={!atual ? "page" : undefined} onClick={fecharNoCelular} tabIndex={aberto ? 0 : -1}>início</Link>
        </div>

        <div className="menu-bloco">
          <span className="menu-titulo">projetos</span>
          {lista.map((p, i) => (
            <Link
              key={p.id}
              href={`/projetos/${p.slug}`}
              className={`menu-item arrastavel ${sobre === i ? "sobre" : ""}`}
              aria-current={atual === p.slug ? "page" : undefined}
              draggable
              onDragStart={() => (origem.current = i)}
              onDragOver={(e) => { e.preventDefault(); setSobre(i); }}
              onDragLeave={() => setSobre(null)}
              onDrop={() => soltar(i)}
              onClick={fecharNoCelular}
              tabIndex={aberto ? 0 : -1}
              title="arraste para mudar a prioridade"
            >
              <span className="m-mono">{i + 1}</span> {p.nome}
            </Link>
          ))}
        </div>

        <div className="menu-bloco">
          <span className="menu-titulo">outros</span>
          <Link href="/reuniao" className="menu-item" aria-current={atual === "reuniao" ? "page" : undefined} onClick={fecharNoCelular} tabIndex={aberto ? 0 : -1}>reunião</Link>
          <Link href="/memoria" className="menu-item" aria-current={atual === "memoria" ? "page" : undefined} onClick={fecharNoCelular} tabIndex={aberto ? 0 : -1}>memória</Link>
          <Link href="/faxina" className="menu-item" aria-current={atual === "faxina" ? "page" : undefined} onClick={fecharNoCelular} tabIndex={aberto ? 0 : -1}>faxina</Link>
        </div>

        {arquivados.length > 0 && (
          <details className="menu-bloco arquivados">
            <summary className="menu-titulo">projetos arquivados ({arquivados.length})</summary>
            {arquivados.map((p) => (
              <div className="menu-arquivado" key={p.id}>
                <Link href={`/projetos/${p.slug}`} onClick={fecharNoCelular} tabIndex={aberto ? 0 : -1}>{p.nome}</Link>
                <button className="btn sutil" onClick={() => reativar(p.id)} tabIndex={aberto ? 0 : -1}>reativar</button>
              </div>
            ))}
          </details>
        )}
        <div className="menu-bloco menu-rodape">
          <button className="menu-item menu-sair" onClick={sair} tabIndex={aberto ? 0 : -1}>sair</button>
        </div>
      </nav>
    </>
  );
}
