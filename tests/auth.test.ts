import { describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import { completeAuthCallback } from '../lib/auth-session';
function client() {
  const session = { user: { id: 'verified-user' } } as Session;
  return {
    auth: {
      exchangeCodeForSession: vi.fn(async () => ({ error: null })),
      setSession: vi.fn(async () => ({ error: null })),
      getSession: vi.fn(async () => ({ data: { session }, error: null })),
    },
  };
}
describe('auth callback protocol', () => {
  it('exchanges a PKCE code only once across concurrent effect invocations', async () => {
    const c = client();
    await Promise.all([completeAuthCallback(c, 'code'), completeAuthCallback(c, 'code')]);
    expect(c.auth.exchangeCodeForSession).toHaveBeenCalledOnce();
  });
  it('supports legacy implicit links without a second code exchange', async () => {
    const c = client();
    await completeAuthCallback(c, null, '#access_token=access&refresh_token=refresh');
    expect(c.auth.setSession).toHaveBeenCalledWith({
      access_token: 'access',
      refresh_token: 'refresh',
    });
    expect(c.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });
  it('never treats a failed exchange or missing session as successful authentication', async () => {
    const c = client();
    c.auth.exchangeCodeForSession.mockRejectedValue(new Error('expired'));
    await expect(completeAuthCallback(c, 'expired-code')).rejects.toThrow('expired');
    await expect(
      completeAuthCallback(
        { auth: { ...c.auth, getSession: async () => ({ data: { session: null }, error: null }) } },
        null,
      ),
    ).rejects.toThrow('AUTH_CALLBACK');
  });
  it('does not cache ordinary sessions after sign-out', async () => {
    const c = client();
    await completeAuthCallback(c, null);
    await completeAuthCallback(c, null);
    expect(c.auth.getSession).toHaveBeenCalledTimes(2);
  });
});
