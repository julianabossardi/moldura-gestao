import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // a pasta contexto/ é lida do disco na hora; sem isso ela não vai no pacote da rota na Vercel
  outputFileTracingIncludes: { "/api/reunioes/[id]/falantes": ["./contexto/**/*"] },
};

export default nextConfig;
