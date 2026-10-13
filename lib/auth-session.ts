import type { Session } from '@supabase/supabase-js';
export interface CallbackClient {
  auth: {
    exchangeCodeForSession: (code: string) => Promise<{ error: Error | null }>;
    setSession: (tokens: {
      access_token: string;
      refresh_token: string;
    }) => Promise<{ error: Error | null }>;
    getSession: () => Promise<{ data: { session: Session | null }; error: Error | null }>;
  };
}
const pending = new WeakMap<CallbackClient, Map<string, Promise<Session>>>();
/** One exchange per code in flight, including React Strict Mode's effect replay. */
export function completeAuthCallback(
  client: CallbackClient,
  code: string | null,
  hash = '',
): Promise<Session> {
  const key = code || hash;
  const attempts = pending.get(client) || new Map<string, Promise<Session>>();
  pending.set(client, attempts);
  if (key && attempts.has(key)) return attempts.get(key)!;
  const completion = (async () => {
    if (code) {
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (error) throw error;
    } else if (hash) {
      const params = new URLSearchParams(hash.replace(/^#/, ''));
      if (params.get('error')) throw new Error(params.get('error_description') || 'AUTH_CALLBACK');
      const access_token = params.get('access_token'),
        refresh_token = params.get('refresh_token');
      if (access_token && !refresh_token) throw new Error('AUTH_CALLBACK');
      if (access_token && refresh_token) {
        const { error } = await client.auth.setSession({ access_token, refresh_token });
        if (error) throw error;
      }
    }
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (!data.session) throw new Error('AUTH_CALLBACK');
    return data.session;
  })();
  if (key) {
    attempts.set(key, completion);
    void completion.finally(() => attempts.delete(key)).catch(() => {});
  }
  return completion;
}
