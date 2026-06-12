import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _supabase;
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabaseAdmin;
}

// Backward-compat aliases so callers don't need to change
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop: string) { return (getSupabase() as any)[prop]; },
});
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_, prop: string) { return (getSupabaseAdmin() as any)[prop]; },
});
