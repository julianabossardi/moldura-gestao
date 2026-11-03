import { NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/supabase/server";
import { destinoSchema } from "@/lib/ia/schemas";
import { gerarEmbedding, textoParaEmbedding } from "@/lib/embedding";
import { z } from "zod";

const corpoSchema = z.object({ destinos: z.array(destinoSchema), recusar: z.boolean().optional() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServidor();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  const { destinos, recusar } = corpoSchema.parse(await req.json());
  if (recusar) {
    await supabase.from("capturas").update({ status: "recusada" }).eq("id", id);
    return NextResponse.json({ ok: true });
  }

  const [{ data: projetos }, { data: pessoas }] = await Promise.all([
    supabase.from("projetos").select("id, slug"),
    supabase.from("pessoas").select("id, nome"),
  ]);
  const projetoId = (slug?: string | null) => projetos?.find((p) => p.slug === slug)?.id ?? null;
  const pessoaId = (nome?: string | null) =>
    nome ? pessoas?.find((p) => p.nome.toLowerCase().startsWith(nome.slice(0, 4)))?.id ?? null : null;

  for (const d of destinos) {
    const campos = {
      tipo: d.tipo,
      titulo: d.titulo,
      corpo: d.corpo ?? null,
      tags: d.tags,
      projeto_id: projetoId(d.projeto_slug),
      prioridade: d.tipo === "tarefa" ? d.prioridade ?? "media" : null,
      responsavel_id: d.tipo === "tarefa" ? pessoaId(d.responsavel) ?? auth.user.id : null,
    };
    const emb = await gerarEmbedding(textoParaEmbedding(d));
    const embedding = emb ? JSON.stringify(emb) : undefined;
    if (d.acao === "atualizar" && d.item_id) {
      await supabase.from("itens").update({ ...campos, ...(embedding && { embedding }) }).eq("id", d.item_id);
    } else {
      await supabase.from("itens").insert({
        ...campos,
        autor_id: auth.user.id,
        origem: "captura",
        captura_id: id,
        ...(embedding && { embedding }),
      });
    }
  }
  await supabase.from("capturas").update({ status: "confirmada" }).eq("id", id);
  return NextResponse.json({ ok: true });
}
