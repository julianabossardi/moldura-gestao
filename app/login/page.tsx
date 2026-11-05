"use client";
import { useState } from "react";
import { supabaseNavegador } from "@/lib/supabase/client";

// login só tipográfico: o foco é a hierarquia ("entrar" grande contra o texto pequeno),
// e o símbolo entra em sangria no canto, com o conteúdo dentro do ângulo.
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
      <span className="login-simbolo" aria-hidden />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="login-logo" src="/marca/logo_preto.svg" alt="moldura" height={28} />
      <div className="login-corpo">
        <h1 className="login-titulo">entrar</h1>
        <p className="login-apoio">mandamos um link para o seu e-mail. sem senha.</p>
        {estado === "enviado" ? (
          <p className="login-apoio login-enviado" role="status">link a caminho. é só abrir o e-mail neste mesmo aparelho.</p>
        ) : (
          <form className="login-form" onSubmit={entrar}>
            <label className="login-rotulo" htmlFor="email">seu e-mail</label>
            <div className="login-linha">
              <input id="email" className="campo" type="email" required autoComplete="email" placeholder="nome@agenciamoldura.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <button className="btn acento" disabled={estado === "enviando"}>{estado === "enviando" ? "enviando" : "mandar link"}</button>
            </div>
            {estado === "erro" && <p className="erro" role="alert">não deu certo. confere o e-mail e tenta de novo.</p>}
          </form>
        )}
      </div>
    </main>
  );
}
