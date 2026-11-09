/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { supabaseServidor } from "@/lib/supabase/server";
import { carregarNovidades } from "@/lib/novidades";
import { diasAtras } from "@/lib/datas";
import { Notificacoes, type Notificacao } from "./Notificacoes";

type Tela = "inicio" | "reuniao" | "memoria" | "backlog" | "projeto";
const LINKS: { tela: Tela; href: string; rotulo: string }[] = [
  { tela: "inicio", href: "/", rotulo: "início" },
  { tela: "reuniao", href: "/reuniao", rotulo: "reunião" },
  { tela: "memoria", href: "/memoria", rotulo: "memória" },
  { tela: "backlog", href: "/backlog", rotulo: "tarefas" },
];

// a barra de sistema de todas as telas internas: marca, navegação, onde estou e notificações.
// notificações = o que as outras fizeram: reações nas minhas coisas e novidades da equipe (7 dias)
export async function Cabecalho({ atual, contexto }: { atual: Tela; contexto?: React.ReactNode }) {
  const supabase = await supabaseServidor();
  const { data: auth } = await supabase.auth.getUser();
  const eu = auth.user?.id;

  const [{ data: reacoes }, novidades] = await Promise.all([
    eu
      ? supabase.from("reacoes")
          .select("id, tipo, criado_em, item_id, pessoa:pessoas(nome), item:itens!inner(titulo, autor_id)")
          .eq("item.autor_id", eu).neq("pessoa_id", eu).gte("criado_em", diasAtras(7)).order("criado_em", { ascending: false }).limit(20)
      : Promise.resolve({ data: [] }),
    carregarNovidades(supabase, { dias: 7, limite: 20, excetoPessoa: eu }),
  ]);

  type Reacao = { id: string; tipo: string; criado_em: string; item_id: string; pessoa: { nome: string } | null; item: { titulo: string } };
  const lista: Notificacao[] = [
    ...((reacoes ?? []) as unknown as Reacao[]).map((r) => ({
      id: `r-${r.id}`, item_id: r.item_id, quem: r.pessoa?.nome ?? null, em: r.criado_em, titulo: r.item.titulo,
      verbo: r.tipo === "audio" ? "respondeu em áudio" : r.tipo === "estrela" ? "deu estrela em" : "deu foguinho em",
    })),
    ...novidades.map((n) => ({ id: n.id, item_id: n.item_id, quem: n.quem, em: n.em, titulo: n.titulo, verbo: n.verbo })),
  ].sort((a, b) => b.em.localeCompare(a.em)).slice(0, 20);

  return (
    <header className="sistema">
      <Link href="/" className="sistema-marca" aria-label="moldura, início">
        <img src="/marca/logo_preto.svg" alt="moldura" />
        <span className="sistema-nome">gestão</span>
      </Link>
      <nav className="sistema-nav" aria-label="principal">
        {LINKS.map((l) => (
          <Link key={l.tela} href={l.href} aria-current={atual === l.tela ? "page" : undefined}>{l.rotulo}</Link>
        ))}
      </nav>
      {contexto && <span className="sistema-contexto m-mono">{contexto}</span>}
      <Notificacoes lista={lista} />
    </header>
  );
}
