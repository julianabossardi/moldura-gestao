import { NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/supabase/server";
import { recorteSchema } from "@/lib/ia/schemas";
import { z } from "zod";

const corpo = z.object({
  acao: z.enum(["comecar", "outro", "concluir"]),
  recorte: recorteSchema,
  projeto_id: z.string().uuid(),
  editado: z.boolean().optional(),
});

export async function POST(req: Request) {
  const supabase = await supabaseServidor();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });
  const { acao, recorte, projeto_id, editado } = corpo.parse(await req.json());

  // recortes só viram item quando a pessoa age: começar (fazendo), marcar feita (concluída) ou trocar (guardado como trocado)
  const comecar = acao === "comecar";
  const concluir = acao === "concluir";
  const { data, error } = await supabase
    .from("itens")
    .insert({
      tipo: "tarefa",
      titulo: recorte.titulo,
      corpo: recorte.mini_passos.map((p) => `- ${p}`).join("\n") || null,
      projeto_id,
      autor_id: auth.user.id,
      responsavel_id: auth.user.id,
      pai_id: recorte.pai_id,
      origem: "recorte",
      estados: recorte.estados,
      minutos_estimados: recorte.minutos_estimados,
      status: concluir ? "concluida" : comecar ? "fazendo" : "arquivada",
      recorte_retorno: concluir ? "concluido" : comecar ? (editado ? "editado" : "aceito") : "trocado",
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
