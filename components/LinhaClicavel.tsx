"use client";
import { useDetalhe } from "./ProvedorDetalhe";

// linha de lista que abre o item na gaveta lateral
export function LinhaClicavel({ id, children, className = "item item-botao" }: { id: string; children: React.ReactNode; className?: string }) {
  const { abrir } = useDetalhe();
  return <button type="button" className={className} onClick={() => abrir(id)}>{children}</button>;
}
