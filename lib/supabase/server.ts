import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function supabaseServidor() {
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (lista) => {
          try {
            lista.forEach(({ name, value, options }) => jar.set(name, value, options));
          } catch {
            // chamado de um server component: o proxy já renova a sessão
          }
        },
      },
    },
  );
}
