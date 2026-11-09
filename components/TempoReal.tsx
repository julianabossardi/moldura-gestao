"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/client";

// escuta o banco e pede à página para se atualizar, sem recarregar
export function TempoReal() {
  const router = useRouter();
  useEffect(() => {
    const supabase = supabaseNavegador();
    let espera: ReturnType<typeof setTimeout>;
    const atualizar = () => {
      clearTimeout(espera);
      espera = setTimeout(() => router.refresh(), 300);
    };
    const canal = supabase
      .channel("equipe")
      .on("postgres_changes", { event: "*", schema: "public", table: "itens" }, atualizar)
      .on("postgres_changes", { event: "*", schema: "public", table: "reacoes" }, atualizar)
      .on("postgres_changes", { event: "*", schema: "public", table: "pessoas" }, atualizar)
      .on("postgres_changes", { event: "*", schema: "public", table: "bilhetes" }, atualizar)
      .subscribe();
    return () => {
      clearTimeout(espera);
      supabase.removeChannel(canal);
    };
  }, [router]);
  return null;
}
