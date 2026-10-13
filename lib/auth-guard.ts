export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export function isPublicAuthPath(pathname: string): boolean {
  return ['/login', '/auth', '/invite', '/welcome'].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/** Never use a persisted profile as proof of an authenticated session. */
export function authRouteDecision(
  pathname: string,
  configured: boolean,
  status: AuthStatus,
): 'allow' | 'wait' | 'login' {
  if (!configured || isPublicAuthPath(pathname)) return 'allow';
  if (status === 'loading') return 'wait';
  return status === 'authenticated' ? 'allow' : 'login';
}
