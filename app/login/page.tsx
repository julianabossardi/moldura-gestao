"use client";
import { useState } from "react";
import { supabaseNavegador } from "@/lib/supabase/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<"parado" | "enviando" | "enviado" | "erro">("parado");

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEstado("enviando");
    const { error } = await supabaseNavegador().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback`, shouldCreateUser: true },
    });
    setEstado(error ? "erro" : "enviado");
  }

  return (
    <main className="login">
      <form className="vidro" onSubmit={entrar}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/marca/logo_preto.svg" alt="moldura" height={28} style={{ height: 28, justifySelf: "start" }} />
        <div>
          <h1 className="m-h3" style={{ margin: 0 }}>entrar</h1>
          <p className="m-meta">mandamos um link para o seu e-mail. sem senha.</p>
        </div>
        {estado === "enviado" ? (
          <p className="m-body">link a caminho. é só abrir o e-mail neste mesmo aparelho.</p>
        ) : (
          <>
            <input className="campo" type="email" required placeholder="seu e-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="btn" disabled={estado === "enviando"}>{estado === "enviando" ? "enviando" : "mandar link"}</button>
            {estado === "erro" && <p className="erro">não deu certo. confere o e-mail e tenta de novo.</p>}
          </>
        )}
      </form>
    </main>
  );
}
