'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { cloudConfigured, getSupabase } from '@/lib/supabase';
import { authRouteDecision, type AuthStatus } from '@/lib/auth-guard';

export function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    if (!cloudConfigured) return;
    let alive = true;
    let changed = false;
    const client = getSupabase();
    if (!client) {
      setStatus('anonymous');
      return;
    }
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      changed = true;
      if (alive) setStatus(session ? 'authenticated' : 'anonymous');
    });
    // An auth event (especially sign-out) wins over an older initial read.
    void client.auth
      .getSession()
      .then(({ data, error }) => {
        if (alive && !changed) setStatus(!error && data.session ? 'authenticated' : 'anonymous');
      })
      .catch(() => {
        if (alive && !changed) setStatus('anonymous');
      });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  const decision = authRouteDecision(pathname, cloudConfigured, status);
  useEffect(() => {
    if (decision === 'login') {
      const next = pathname + window.location.search;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [decision, pathname, router]);

  if (decision !== 'allow') {
    return (
      <main role="status" aria-live="polite">
        در حال بررسی ورود…
      </main>
    );
  }
  return children;
}
