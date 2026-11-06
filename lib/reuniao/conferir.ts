import type { PropostaReuniao } from "./tipos";

// conferências feitas pelo código, sem confiar no modelo

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

type Lista = "novas" | "ideias" | "decisoes" | "ja_feitas";
const LISTAS: Lista[] = ["novas", "ideias", "decisoes", "ja_feitas"];
const NOME: Record<Lista, string> = { novas: "tarefa", ideias: "ideia", decisoes: "decisão", ja_feitas: "já feito" };

function itens(p: PropostaReuniao) {
  return p.projetos.flatMap((pr) =>
    LISTAS.flatMap((l) => (pr[l] as { titulo: string }[]).map((x) => ({ lista: l, projeto: pr.projeto_slug ?? "solto", titulo: x.titulo }))),
  );
}

// o que saiu e o que entrou entre duas propostas, pelo título
export function diferencas(antes: PropostaReuniao, depois: PropostaReuniao): string[] {
  const a = itens(antes), d = itens(depois);
  const chave = (x: { lista: Lista; titulo: string }) => `${x.lista}|${norm(x.titulo)}`;
  const tinha = new Set(a.map(chave)), tem = new Set(d.map(chave));
  return [
    ...a.filter((x) => !tem.has(chave(x))).map((x) => `saiu (${NOME[x.lista]}, ${x.projeto}): ${x.titulo}`),
    ...d.filter((x) => !tinha.has(chave(x))).map((x) => `entrou (${NOME[x.lista]}, ${x.projeto}): ${x.titulo}`),
  ];
}

// zera o trecho que não existe na transcrição; devolve os títulos afetados
export function conferirTrechos(p: PropostaReuniao, transcricao: string): string[] {
  const base = norm(transcricao);
  const invalidos: string[] = [];
  for (const pr of p.projetos)
    for (const l of LISTAS)
      for (const x of pr[l] as { titulo: string; trecho?: string | null }[]) {
        if (x.trecho && !base.includes(norm(x.trecho))) {
          invalidos.push(x.titulo);
          x.trecho = null;
        }
      }
  return invalidos;
}

// tarefa "alta" fora do que o contexto manda (hoje: só o folga)
export function altaForaDoFolga(p: PropostaReuniao, projetosAltos: string[]): string[] {
  return p.projetos.flatMap((pr) =>
    projetosAltos.includes(pr.projeto_slug ?? "") ? [] : pr.novas.filter((t) => t.prioridade === "alta").map((t) => t.titulo),
  );
}

// mesma tarefa repetida para donos diferentes (ex.: "revisar o site" para a Juliana e para a Viviane).
// o app guarda um responsável por item, então a repetição aparece aqui para a pessoa decidir
export function mesmoTituloDonosDiferentes(p: PropostaReuniao): string[] {
  const grupos = new Map<string, { titulo: string; donos: Set<string> }>();
  for (const pr of p.projetos)
    for (const t of pr.novas) {
      const k = `${pr.projeto_slug ?? "solto"}|${norm(t.titulo)}`;
      const g = grupos.get(k) ?? { titulo: t.titulo, donos: new Set<string>() };
      g.donos.add(t.responsavel ?? "sem dono");
      grupos.set(k, g);
    }
  return [...grupos.values()].filter((g) => g.donos.size > 1).map((g) => `${g.titulo} (${[...g.donos].join(", ")})`);
}
