import Link from "next/link";
import { redirect } from "next/navigation";
import { pessoaAtual } from "@/lib/pessoa";
import { montarPainel } from "@/lib/reuniao/painel";
import type { Painel, Marcacao } from "@/lib/reuniao/tipos";
import { diasAtras, hojeISO } from "@/lib/datas";
import { NavegacaoProjetos } from "@/components/NavegacaoProjetos";
import { ModoReuniao } from "@/components/reuniao/ModoReuniao";
import { ReunioesAnteriores } from "@/components/reuniao/GavetaReuniao";
import { ProvedorDetalhe } from "@/components/ProvedorDetalhe";
import { ehRapido, type LinkProjeto } from "@/lib/links";

export default async function Reuniao() {
  const { supabase, pessoa } = await pessoaAtual();
  if (!pessoa || pessoa.papel !== "socia") redirect("/");

  // ao abrir, a reunião é criada e o painel se monta sozinho; uma reunião aberta há pouco é reaproveitada
  const { data: abertas } = await supabase.from("reunioes").select("*").eq("status", "gravando").gte("criado_em", diasAtras(1)).order("criado_em", { ascending: false }).limit(1);
  let reuniao = abertas?.[0];
  if (!reuniao) {
    const { data: ultima } = await supabase.from("reunioes").select("criado_em").eq("status", "aprovada").order("criado_em", { ascending: false }).limit(1);
    const desde = ultima?.[0]?.criado_em ?? diasAtras(7);
    const painel = await montarPainel(supabase, desde);
    const { data } = await supabase.from("reunioes").insert({ data: hojeISO(), painel }).select().single();
    reuniao = data!;
  }

  const [{ data: historico }, { data: projetos }, { data: socias }] = await Promise.all([
    supabase.from("reunioes").select("id, data, status, resumo").neq("id", reuniao.id).order("criado_em", { ascending: false }).limit(30),
    supabase.from("projetos").select("id, nome, links").eq("status", "ativo").order("ordem_prioridade"),
    supabase.from("pessoas").select("id, nome").eq("papel", "socia").eq("ativa", true),
  ]);
  const links = Object.fromEntries((projetos ?? []).map((p) => [p.id, ((p.links ?? []) as LinkProjeto[]).filter(ehRapido)]));

  return (
    <ProvedorDetalhe euId={pessoa.id} projetos={(projetos ?? []).map((p) => ({ id: p.id, nome: p.nome }))} pessoas={socias ?? []}>
    <main className="pagina">
      <header className="topo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <Link href="/"><img src="/marca/logo_preto.svg" alt="moldura" /></Link>
        <span className="m-meta">reunião de {new Date(reuniao.data + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}</span>
      </header>
      <NavegacaoProjetos />

      <div className="saudacao">
        <h1 className="m-h1">reunião</h1>
        <p className="m-lead" style={{ margin: 0, color: "var(--m-ink-quiet)" }}>o painel já está pronto. é só começar.</p>
      </div>

      <ModoReuniao
        reuniaoId={reuniao.id}
        painel={reuniao.painel as Painel}
        audioPaths={reuniao.audio_paths ?? []}
        marcacoes={(reuniao.marcacoes ?? []) as Marcacao[]}
        links={links}
      />

      {(historico ?? []).length > 0 && <ReunioesAnteriores reunioes={historico ?? []} />}
    </main>
    </ProvedorDetalhe>
  );
}
