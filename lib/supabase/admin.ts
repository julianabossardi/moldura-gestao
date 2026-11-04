import { createClient } from "@supabase/supabase-js";

// só para scripts e jobs no servidor; nunca importar em componente de cliente
export function supabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}
