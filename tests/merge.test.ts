import { describe, expect, it } from 'vitest';
import { threeWayMerge } from '../lib/merge';
import { seedTrips } from '../lib/seed';
import { tripSchema } from '../lib/schemas';
import { equalSplit, percentageSplit } from '../lib/money';
describe('trip validation and collaboration', () => {
  it('accepts every complete demo document', () =>
    seedTrips().forEach((t) => expect(tripSchema.safeParse(t).success).toBe(true)));
  it('merges edits to independent sections', () => {
    const b = seedTrips()[0],
      local = structuredClone(b),
      remote = structuredClone(b);
    local.checklist[0].done = false;
    remote.activities[0].notes = 'تغییر عضو دیگر';
    const result = threeWayMerge(b, local, remote);
    expect(result.conflicts).toEqual([]);
    expect(result.trip.checklist[0].done).toBe(false);
    expect(result.trip.activities[0].notes).toBe('تغییر عضو دیگر');
  });
  it('detects a conflicting edit rather than silently overwriting', () => {
    const b = seedTrips()[0],
      l = { ...b, title: 'تغییر من' },
      r = { ...b, title: 'تغییر دیگری' };
    expect(threeWayMerge(b, l, r).conflicts).toContain('title');
  });
  it('preserves an independently added item', () => {
    const b = seedTrips()[0],
      l = structuredClone(b),
      r = structuredClone(b);
    l.checklist.push({ ...b.checklist[0], id: 'new-local' });
    r.checklist.push({ ...b.checklist[1], id: 'new-cloud' });
    const result = threeWayMerge(b, l, r);
    expect(result.conflicts).toEqual([]);
    expect(result.trip.checklist.length).toBe(b.checklist.length + 2);
  });
  it('rejects foreign participants and inverted dates', () => {
    const t = seedTrips()[0];
    t.expenses[0].payerId = 'not-a-member';
    expect(tripSchema.safeParse(t).success).toBe(false);
    const d = seedTrips()[0];
    d.endDate = '2000-01-01';
    expect(tripSchema.safeParse(d).success).toBe(false);
  });
  it('retains exact large percentage amounts', () => {
    const result = percentageSplit(999999999999, [
      { memberId: 'a', percentage: 33.33 },
      { memberId: 'b', percentage: 33.33 },
      { memberId: 'c', percentage: 33.34 },
    ]);
    expect(result.reduce((n, s) => n + s.amount, 0)).toBe(999999999999);
  });
  it('rejects excessive percentage precision', () =>
    expect(() =>
      percentageSplit(100, [
        { memberId: 'a', percentage: 33.333 },
        { memberId: 'b', percentage: 66.667 },
      ]),
    ).toThrow());
});
