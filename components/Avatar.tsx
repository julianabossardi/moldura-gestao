/* eslint-disable @next/next/no-img-element */
import { chaveSprite } from "@/lib/estados-bonequinho";

// o bonequinho de quem é responsável, em miniatura. sem responsável, um contorno vazio
export function Avatar({ nome, tam = 48 }: { nome: string | null; tam?: number }) {
  if (!nome) return <span className="avatar-vazio" style={{ width: tam, height: tam }} title="sem responsável" aria-label="sem responsável" />;
  return <img className="avatar" src={`/bonequinhos/${chaveSprite(nome)}/busto.png`} alt={nome} title={nome} width={tam} height={tam} />;
}
