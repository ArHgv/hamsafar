import { describe, expect, it } from 'vitest';
import { jalaliToISO } from '../lib/dates';
import { seedTrips } from '../lib/seed';
import { tripSchema } from '../lib/schemas';

describe('default trip seed', () => {
  it('contains only the Mashhad trip with the requested Jalali date range', () => {
    const trips = seedTrips();
    expect(trips).toHaveLength(1);
    const trip = trips[0];

    expect(trip.destination).toBe('مشهد');
    expect(trip.startDate).toBe(jalaliToISO(1405, 7, 23));
    expect(trip.endDate).toBe(jalaliToISO(1405, 7, 28));
    expect(trip.members.map((member) => member.name)).toEqual(['آرین', 'عارف', 'ساج', 'دلارام']);
    expect(trip.transport.mode).toBe('train');
    expect(trip.cover).toBe('/images/mashhad-cover.jpg');
    expect(trip.checklist.length).toBeGreaterThanOrEqual(15);
    expect(trip.checklist.some((item) => item.name.includes('هتل'))).toBe(true);
    expect(tripSchema.safeParse(trip).success).toBe(true);
  });
});
