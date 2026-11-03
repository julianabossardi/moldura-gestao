// regras dos estados do bonequinho. adicionar um estado novo = mexer só aqui e nos sprites.
// sem ranking e sem pontos visíveis: o estado é só um jeito de a equipe se perceber.

export type ResumoPessoa = {
  id: string;
  nome: string;
  estados: string[] | null;
  fazendo_id: string | null;
  fazendo_titulo: string | null;
  concluidos_7d: number;
  ultima_atividade: string;
  feliz: boolean;
};

export const ESTADOS_BASE = ["leve", "criativa", "focada"] as const;

export const REGRAS = {
  fogo: { minimoConcluidos: 5, dias: 7 },
  dormindo: { diasSemAtividade: 3 },
};

const CHAVES: Record<string, string> = { lari: "larissa", vivi: "viviane" };

// nome -> pasta de sprites (public/bonequinhos/<chave>/); quem não tem sprite usa "padrao"
export function chaveSprite(nome: string): string {
  const primeiro = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[\s.]/)[0]
    .toLowerCase();
  const chave = CHAVES[primeiro] ?? primeiro;
  return ["juliana", "larissa", "viviane"].includes(chave) ? chave : "padrao";
}

export type EstadoBonequinho = {
  sprite: string; // nome do arquivo, sem .png
  rotulo: string;
  simbolos: string[]; // estados base, mostrados lado a lado
};

// precedência do visual: dormindo > feliz > pegando fogo > estado base
export function estadoDoBonequinho(p: ResumoPessoa, agora = Date.now()): EstadoBonequinho {
  const base = (p.estados ?? []).filter((e) => (ESTADOS_BASE as readonly string[]).includes(e));
  const dias = (agora - new Date(p.ultima_atividade).getTime()) / 86_400_000;
  if (dias >= REGRAS.dormindo.diasSemAtividade) return { sprite: "dormindo", rotulo: "dormindo", simbolos: [] };
  if (p.feliz) return { sprite: "feliz", rotulo: "feliz", simbolos: base };
  if (p.concluidos_7d >= REGRAS.fogo.minimoConcluidos) return { sprite: "pegando-fogo", rotulo: "pegando fogo", simbolos: base };
  const sprite = base[0] ?? "focada";
  return { sprite, rotulo: base.length ? base.join(" + ") : "sem estado", simbolos: base.length > 1 ? base : [] };
}
