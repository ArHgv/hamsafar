import { beforeEach, describe, expect, it } from 'vitest';
import { safeNext } from '../lib/navigation';
import { parseCache } from '../lib/persistence';
import { seedTrips } from '../lib/seed';
import { tripSchema, expenseSchema } from '../lib/schemas';
import { useTripStore } from '../store/use-trip-store';
import { haversineKm } from '../lib/money';
import type { Trip } from '../lib/types';
const OWNER = 'c43a2000-2f64-47b1-9c12-000000000001';
const PLANNER = 'c43a2000-2f64-47b1-9c12-000000000002';
function cloudTrip(): Trip {
  const t = seedTrips()[0];
  t.ownerId = OWNER;
  t.members[0].userId = OWNER;
  t.members[1].userId = PLANNER;
  t.members[1].role = 'planner';
  return t;
}
describe('safe navigation and strict backup validation', () => {
  it('keeps invitation and query redirects inside the app', () => {
    expect(safeNext('/invite/test?from=mail')).toBe('/invite/test?from=mail');
    expect(safeNext(null)).toBe('/');
  });
  it.each([
    'https://evil.test',
    '//evil.test',
    '/\\evil.test',
    '/%5cevil.test',
    '/%2f%2fevil.test',
    '/%255cevil.test',
    '/%25255cevil.test',
    '/\nwrong',
    '/%00evil',
    '/%xx',
  ])('rejects unsafe redirect %s', (path) => expect(safeNext(path)).toBe('/'));
  it('rejects duplicate entities and missing location references', () => {
    const t = seedTrips()[0];
    t.activities.push({ ...t.activities[0] });
    expect(tripSchema.safeParse(t).success).toBe(false);
    t.activities.pop();
    t.activities[0].locationId = 'missing';
    expect(tripSchema.safeParse(t).success).toBe(false);
  });
  it('rejects a missing checklist assignee or missing owner', () => {
    const t = seedTrips()[0];
    t.checklist[0].assignedTo = 'missing';
    expect(tripSchema.safeParse(t).success).toBe(false);
    const other = seedTrips()[0];
    other.members = other.members.filter((m) => m.userId !== other.ownerId);
    expect(tripSchema.safeParse(other).success).toBe(false);
  });
  it('rejects a forged equal split even if the shares sum correctly', () => {
    const e = seedTrips()[0].expenses[0];
    e.shares[0].amount--;
    e.shares[1].amount++;
    expect(expenseSchema.safeParse(e).success).toBe(false);
  });
  it('strips unknown persisted keys rather than replacing executable methods', () => {
    const data = parseCache({
      trips: seedTrips(),
      setHydrated: 'not a function',
      addTrip: 'tampered',
      cloudUser: { id: OWNER },
    });
    expect(data).not.toHaveProperty('setHydrated');
    expect(data).not.toHaveProperty('cloudUser');
  });
  it('rejects malformed persisted preferences and prunes orphan cloud snapshots', () => {
    expect(() => parseCache({ trips: seedTrips(), theme: 'pink' })).toThrow();
    const t = seedTrips()[0];
    const data = parseCache({
      trips: [],
      cloudTripIds: [t.id],
      dirtyTripIds: [t.id],
      revisions: { [t.id]: 3 },
      snapshots: { [t.id]: t },
    });
    expect(data.cloudTripIds).toEqual([]);
    expect(data.snapshots).toEqual({});
  });
  it('computes finite antipodal distances and zero identical-point distances', () => {
    expect(
      haversineKm({ latitude: 89.3, longitude: 0 }, { latitude: -89.3, longitude: 180 }),
    ).toBeCloseTo(20015.09, 1);
    expect(haversineKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0 })).toBe(0);
  });
});
describe('local state, permissions and lossless cloud merges', () => {
  beforeEach(() =>
    useTripStore.setState({
      trips: seedTrips(),
      localProfile: { id: 'local-user', name: 'نیکا' },
      cloudUser: null,
      cloudTripIds: [],
      snapshots: {},
      revisions: {},
      dirtyTripIds: [],
      syncingIds: [],
      syncErrors: {},
      onlineUsers: {},
      remoteQueue: {},
    }),
  );
  it('updates and persists meaningful state without mutating the original document', () => {
    const before = useTripStore.getState().trips[0];
    useTripStore.getState().toggleChecklist(before.id, before.checklist[0].id);
    expect(before.checklist[0].done).toBe(true);
    expect(useTripStore.getState().trips[0].checklist[0].done).toBe(false);
  });
  it('enforces actual changed sections even when the caller mislabels a patch', () => {
    const t = cloudTrip();
    useTripStore.getState().markSynced(t, 1);
    useTripStore.getState().setCloudUser({ id: PLANNER, name: 'آرمان' });
    expect(() =>
      useTripStore.getState().updateTrip(t.id, { expenses: [] }, ['activities']),
    ).toThrow('FORBIDDEN');
    useTripStore.getState().toggleChecklist(t.id, t.checklist[1].id);
    expect(useTripStore.getState().dirtyTripIds).toContain(t.id);
  });
  it('locks currency once a financial record exists', () => {
    const t = useTripStore.getState().trips[0];
    expect(() => useTripStore.getState().updateTrip(t.id, { currency: 'USD' }, ['info'])).toThrow(
      'CURRENCY_LOCKED',
    );
  });
  it('unlinks a deleted location without deleting its activities', () => {
    const t = useTripStore.getState().trips[0];
    const location = t.locations.find((l) => t.activities.some((a) => a.locationId === l.id))!;
    useTripStore.getState().removeEntity(t.id, 'locations', location.id);
    const next = useTripStore.getState().trips[0];
    expect(next.activities).toHaveLength(t.activities.length);
    expect(next.activities.some((a) => a.locationId === location.id)).toBe(false);
  });
  it('merges independent remote changes without discarding pending local work', () => {
    const t = cloudTrip();
    useTripStore.getState().markSynced(t, 1);
    useTripStore.getState().setCloudUser({ id: OWNER, name: 'نیکا' });
    useTripStore.getState().toggleChecklist(t.id, t.checklist[0].id);
    const remote = structuredClone(t);
    remote.title = 'نسخه هم‌سفر دیگر';
    useTripStore.getState().mergeRemote(remote, 2);
    const s = useTripStore.getState();
    expect(s.trips.find((trip) => trip.id === t.id)!.title).toBe(remote.title);
    expect(s.trips.find((trip) => trip.id === t.id)!.checklist[1].done).toBe(false);
    expect(s.revisions[t.id]).toBe(2);
    expect(s.dirtyTripIds).toContain(t.id);
    expect(s.syncErrors[t.id]).toBe('');
  });
  it('retains local content and reports simultaneous conflicts', () => {
    const t = cloudTrip();
    useTripStore.getState().markSynced(t, 1);
    useTripStore.getState().setCloudUser({ id: OWNER, name: 'نیکا' });
    useTripStore.getState().updateTrip(t.id, { title: 'عنوان من' }, ['info']);
    useTripStore.getState().mergeRemote({ ...t, title: 'عنوان دیگر' }, 2);
    expect(useTripStore.getState().trips.find((trip) => trip.id === t.id)!.title).toBe('عنوان من');
    expect(useTripStore.getState().syncErrors[t.id]).toContain('تداخل');
  });
  it('queues only the newest remote revision while a save is in flight', () => {
    const t = cloudTrip();
    useTripStore.getState().markSynced(t, 1);
    useTripStore.getState().setSyncing(t.id, true);
    useTripStore.getState().mergeRemote({ ...t, title: 'نسخه سه' }, 3);
    useTripStore.getState().mergeRemote({ ...t, title: 'نسخه دو' }, 2);
    expect(useTripStore.getState().remoteQueue[t.id].revision).toBe(3);
    expect(useTripStore.getState().trips[0].title).toBe(t.title);
  });
  it('removes revoked cloud data and snapshots but preserves local trips', () => {
    const t = cloudTrip();
    useTripStore.getState().markSynced(t, 1);
    useTripStore.getState().reconcileCloudIds([]);
    const s = useTripStore.getState();
    expect(s.snapshots).toEqual({});
    expect(s.revisions).toEqual({});
    expect(s.trips).toHaveLength(0);
  });
  it('imports cloud backups as independent editable local copies', () => {
    const t = cloudTrip();
    useTripStore.getState().markSynced(t, 1);
    useTripStore.getState().importTrips([t]);
    const local = useTripStore.getState().trips[0];
    expect(local.id).not.toBe(t.id);
    expect(local.ownerId).toBe('local-user');
    expect(local.members.find((m) => m.id === t.members[0].id)!.userId).toBe('local-user');
    expect(tripSchema.safeParse(local).success).toBe(true);
  });
});
