/* eslint-disable @next/next/no-img-element */
// ícones 8-bit (public/icones, gerados por scripts/gerar-icones.py)
export function Icone({ nome, tam = 18 }: { nome: "foguinho" | "microfone" | "microfone-branco" | "parar" | "parar-branco" | "check" | "check-branco" | "mais" | "menu" | "seta-dir" | "estrela" | "atrasada" | "importante"; tam?: number }) {
  return <img className="icone-pixel" src={`/icones/${nome}.png`} alt="" width={tam} height={tam} aria-hidden />;
}
