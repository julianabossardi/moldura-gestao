export type LinkProjeto = { titulo: string; url: string; tipo?: string };

// acesso rápido no topo de "como estamos"; documento fica nos documentos fixados da gestão
export const TIPOS_LINK: Record<string, string> = {
  site: "site publicado",
  app: "app",
  homologacao: "homologação",
  repositorio: "repositório",
  design: "design",
  documento: "documento",
};
export const ehRapido = (l: LinkProjeto) => !!l.tipo && l.tipo !== "documento";
export const normalizarUrl = (u: string) => (/^https?:\/\//.test(u.trim()) ? u.trim() : `https://${u.trim()}`);
