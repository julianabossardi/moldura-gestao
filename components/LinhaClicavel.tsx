"use client";
import { useDetalhe } from "./ProvedorDetalhe";

// linha de lista que abre o item na gaveta lateral
export function LinhaClicavel({ id, children }: { id: string; children: React.ReactNode }) {
  const { abrir } = useDetalhe();
  return <button type="button" className="item item-botao" onClick={() => abrir(id)}>{children}</button>;
}
