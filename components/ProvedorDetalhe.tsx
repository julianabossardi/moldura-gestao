"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { DetalheItem } from "./DetalheItem";

type Ctx = { abrir: (id: string) => void };
const Contexto = createContext<Ctx | null>(null);
const SEM_GAVETA: Ctx = { abrir: () => {} };
export const useDetalhe = () => useContext(Contexto) ?? SEM_GAVETA;
// fora de uma tela com gaveta (faxina, por exemplo) devolve null, para quem chama decidir o que fazer
export const useDetalheOpcional = () => useContext(Contexto);

type Props = {
  euId: string;
  projetos: { id: string; nome: string }[];
  pessoas: { id: string; nome: string }[];
  children: React.ReactNode;
};

// qualquer cartão da página pode abrir os detalhes do item na gaveta lateral
export function ProvedorDetalhe({ euId, projetos, pessoas, children }: Props) {
  const [aberto, setAberto] = useState<string | null>(null);
  const abrir = useCallback((id: string) => setAberto(id), []);
  const fechar = useCallback(() => setAberto(null), []);
  return (
    <Contexto.Provider value={{ abrir }}>
      {children}
      {aberto && <DetalheItem key={aberto} id={aberto} euId={euId} projetos={projetos} pessoas={pessoas} onFechar={fechar} />}
    </Contexto.Provider>
  );
}
