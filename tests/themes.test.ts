import { describe, expect, it } from 'vitest';
import { parseCache } from '../lib/persistence';
import { seedTrips } from '../lib/seed';

describe('gold theme persistence', () => {
  it.each(['black-gold', 'white-gold'])('restores %s without losing trips', (theme) => {
    const trips = seedTrips();
    const restored = parseCache({ trips, theme });
    expect(restored.theme).toBe(theme);
    expect(restored.trips).toEqual(trips);
  });
});
