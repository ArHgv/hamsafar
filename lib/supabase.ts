import { createClient, type SupabaseClient } from '@supabase/supabase-js';
export const cloudConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
let client: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient | null {
  if (!cloudConfigured || typeof window === 'undefined') return null;
  if (!client)
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          flowType: 'pkce',
        },
        realtime: { params: { eventsPerSecond: 10 } },
      },
    );
  return client;
}
export function requireSupabase(): SupabaseClient {
  const client = getSupabase();
  if (!client) throw new Error('CLOUD_NOT_CONFIGURED');
  return client;
}
