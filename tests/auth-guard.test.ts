import { describe, expect, it } from 'vitest';
import { authRouteDecision, isPublicAuthPath } from '../lib/auth-guard';

describe('cloud authentication route boundary', () => {
  it.each(['/', '/trips', '/trips/private-id', '/expenses', '/settings'])(
    'hides %s until session resolution and redirects anonymous visitors',
    (path) => {
      expect(authRouteDecision(path, true, 'loading')).toBe('wait');
      expect(authRouteDecision(path, true, 'anonymous')).toBe('login');
      expect(authRouteDecision(path, true, 'authenticated')).toBe('allow');
    },
  );
  it.each(['/login', '/auth/callback', '/invite/token', '/welcome'])(
    'keeps %s public during session resolution',
    (path) => {
      expect(authRouteDecision(path, true, 'loading')).toBe('allow');
      expect(authRouteDecision(path, true, 'anonymous')).toBe('allow');
    },
  );
  it.each(['/login-other', '/authentication', '/invite-private', '/welcomeback'])(
    'does not grant prefix lookalikes an exemption: %s',
    (path) => {
      expect(isPublicAuthPath(path)).toBe(false);
      expect(authRouteDecision(path, true, 'anonymous')).toBe('login');
    },
  );
  it('keeps local development usable with no Supabase', () => {
    expect(authRouteDecision('/trips/local', false, 'loading')).toBe('allow');
    expect(authRouteDecision('/', false, 'anonymous')).toBe('allow');
  });
  it('blocks the route again after sign-out', () => {
    expect(authRouteDecision('/trips/private', true, 'authenticated')).toBe('allow');
    expect(authRouteDecision('/trips/private', true, 'anonymous')).toBe('login');
  });
});
