// sinais do código de um projeto: últimos commits (GitHub) e últimos deploys (Vercel).
// só para as sócias. quem não tem integração configurada simplesmente não vê o bloco.
export type Integracoes = { github?: string; vercel?: { projeto_id?: string; time_id?: string } };
export type Commit = { sha: string; mensagem: string; autor: string; em: string; url: string };
export type Deploy = { id: string; estado: string; url: string; em: string; mensagem: string | null };

export async function ultimosCommits(repo: string, n = 5): Promise<Commit[]> {
  const r = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=${n}`, {
    headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }) },
    next: { revalidate: 300 },
  });
  if (!r.ok) throw new Error(`github: ${r.status}`);
  const j = (await r.json()) as { sha: string; html_url: string; commit: { message: string; author: { name: string; date: string } } }[];
  return j.map((c) => ({ sha: c.sha.slice(0, 7), mensagem: c.commit.message.split("\n")[0], autor: c.commit.author.name, em: c.commit.author.date, url: c.html_url }));
}

export async function ultimosDeploys(v: NonNullable<Integracoes["vercel"]>, n = 3): Promise<Deploy[]> {
  if (!process.env.VERCEL_TOKEN || !v.projeto_id) throw new Error("falta VERCEL_TOKEN ou o id do projeto");
  const qs = new URLSearchParams({ projectId: v.projeto_id, limit: String(n), ...(v.time_id && { teamId: v.time_id }) });
  const r = await fetch(`https://api.vercel.com/v6/deployments?${qs}`, { headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` }, next: { revalidate: 300 } });
  if (!r.ok) throw new Error(`vercel: ${r.status}`);
  const j = (await r.json()) as { deployments: { uid: string; url: string; state?: string; readyState?: string; created: number; meta?: { githubCommitMessage?: string } }[] };
  return j.deployments.map((d) => ({
    id: d.uid, estado: (d.state ?? d.readyState ?? "").toLowerCase(), url: `https://${d.url}`,
    em: new Date(d.created).toISOString(), mensagem: d.meta?.githubCommitMessage?.split("\n")[0] ?? null,
  }));
}

export async function sinaisDoCodigo(i: Integracoes) {
  const [commits, deploys] = await Promise.allSettled([
    i.github ? ultimosCommits(i.github) : Promise.resolve([] as Commit[]),
    i.vercel?.projeto_id ? ultimosDeploys(i.vercel) : Promise.resolve([] as Deploy[]),
  ]);
  return {
    commits: commits.status === "fulfilled" ? commits.value : [],
    deploys: deploys.status === "fulfilled" ? deploys.value : [],
    erros: [commits, deploys].flatMap((r) => (r.status === "rejected" ? [(r.reason as Error).message] : [])),
  };
}
