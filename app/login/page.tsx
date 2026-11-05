"use client";
import { useState } from "react";
import { supabaseNavegador } from "@/lib/supabase/client";

// login só tipográfico: o foco é a hierarquia ("entrar" grande contra o texto pequeno),
// e o símbolo entra em sangria no canto, com o conteúdo dentro do ângulo.
// o Supabase diz por que não mandou o link; a tela repete o motivo em vez de culpar o e-mail
function explicarErro(e: { code?: string; status?: number; message?: string }): string {
  if (e.code === "over_email_send_rate_limit" || e.status === 429) return "foram links demais em pouco tempo. espere cerca de uma hora e tente de novo.";
  if (e.code === "email_address_not_authorized") return "esse e-mail ainda não pode receber o link. fala com a Juliana.";
  if (e.code === "signup_disabled" || e.code === "otp_disabled") return "novos acessos estão fechados. fala com a Juliana.";
  if (e.code === "validation_failed" || e.code === "email_address_invalid") return "esse e-mail parece estar escrito errado. confere e tenta de novo.";
  if (/fetch|network/i.test(e.message ?? "")) return "não consegui falar com o servidor. confere a internet e tenta de novo.";
  return "não consegui mandar o link agora. tenta de novo daqui a pouco.";
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<"parado" | "enviando" | "enviado" | "erro">("parado");
  const [motivo, setMotivo] = useState("");

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEstado("enviando");
    const { error } = await supabaseNavegador().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback`, shouldCreateUser: true },
    });
    if (error) setMotivo(explicarErro(error));
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
            {estado === "erro" && <p className="erro" role="alert">{motivo}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
