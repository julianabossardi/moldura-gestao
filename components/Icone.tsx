/* eslint-disable @next/next/no-img-element */
// ícones 32 bits, 16x16 (public/icones, gerados por scripts/gerar-icones.py)
export function Icone({ nome, tam = 16 }: { nome: "foguinho" | "microfone" | "microfone-branco" | "parar" | "parar-branco" | "check" | "check-branco" | "mais" | "mais-branco" | "menu" | "seta-dir" | "estrela" | "atrasada" | "importante"; tam?: number }) {
  return <img className="icone-pixel" src={`/icones/${nome}.png`} alt="" width={tam} height={tam} aria-hidden />;
}
