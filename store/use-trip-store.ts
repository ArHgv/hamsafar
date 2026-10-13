'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Activity,
  ChecklistItem,
  Expense,
  Member,
  Profile,
  SavedLocation,
  Settlement,
  Trip,
  TripSection,
} from '@/lib/types';
import { parseCache } from '@/lib/persistence';
import { threeWayMerge } from '@/lib/merge';
import { uid } from '@/lib/utils';
import { seedTrips, DEMO_TRIP_ID } from '@/lib/seed';
import { validateTrip } from '@/lib/schemas';
import { canEdit, roleFor } from '@/lib/permissions';

type EntitySection =
  'activities' | 'checklist' | 'expenses' | 'members' | 'locations' | 'settlements';
type Entity = Activity | ChecklistItem | Expense | Member | SavedLocation | Settlement;
interface TripState {
  trips: Trip[];
  localProfile: Profile;
  cloudUser: Profile | null;
  activeTripId: string;
  theme: 'dark' | 'light' | 'system' | 'black-gold' | 'white-gold';
  reduceTransparency: boolean;
  demo: boolean;
  hydrated: boolean;
  storageError: string | null;
  cloudTripIds: string[];
  revisions: Record<string, number>;
  snapshots: Record<string, Trip>;
  dirtyTripIds: string[];
  syncErrors: Record<string, string>;
  syncingIds: string[];
  onlineUsers: Record<string, string[]>;
  remoteQueue: Record<string, { trip: Trip; revision: number }>;
  addTrip: (trip: Trip) => void;
  updateTrip: (id: string, patch: Partial<Trip>, sections: TripSection[]) => void;
  saveEntity: (id: string, section: EntitySection, entity: Entity) => void;
  removeEntity: (id: string, section: EntitySection, entityId: string) => void;
  toggleChecklist: (id: string, itemId: string) => void;
  deleteTrip: (id: string) => void;
  setActiveTrip: (id: string) => void;
  setLocalProfile: (name: string) => void;
  setCloudUser: (profile: Profile | null) => void;
  setTheme: (theme: 'dark' | 'light' | 'system' | 'black-gold' | 'white-gold') => void;
  setTransparency: (reduce: boolean) => void;
  setHydrated: () => void;
  markSynced: (trip: Trip, revision: number, replace?: boolean) => void;
  mergeRemote: (trip: Trip, revision: number) => void;
  setSyncError: (id: string, message: string) => void;
  setSyncing: (id: string, value: boolean) => void;
  setOnline: (id: string, users: string[]) => void;
  disconnectCloud: () => void;
  reconcileCloudIds: (ids: string[]) => void;
  resetDemo: () => void;
  clearLocal: () => void;
  importTrips: (trips: Trip[]) => void;
}
const identity = (state: TripState, id: string) =>
  state.cloudTripIds.includes(id) ? state.cloudUser?.id || '' : state.localProfile.id;
const assertEdit = (state: TripState, trip: Trip, sections: TripSection[]) => {
  if (sections.some((s) => !canEdit(roleFor(trip, identity(state, trip.id)), s)))
    throw new Error('FORBIDDEN');
};
let quotaReported = false;
const safeStorage = {
  getItem: (name: string) => {
    try {
      if (typeof window === 'undefined') return null;
      const raw = localStorage.getItem(name);
      if (raw && name === 'hamsafar-v1') {
        try {
          JSON.parse(raw);
        } catch {
          try {
            localStorage.setItem('hamsafar-recovery', raw);
          } catch {}
          queueMicrotask(() =>
            useTripStore.setState({
              storageError:
                'فایل ذخیره‌شده خوانا نیست. داده خام برای بازیابی حفظ شد؛ از تنظیمات آن را دریافت کنید.',
            }),
          );
          return null;
        }
      }
      return raw;
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(name, value);
      quotaReported = false;
    } catch {
      if (quotaReported) return;
      quotaReported = true;
      queueMicrotask(() =>
        useTripStore.setState({
          storageError:
            'فضای ذخیره‌سازی مرورگر پر است. برای حفظ اطلاعات، یک نسخه پشتیبان بگیرید و عکس‌های حجیم را حذف کنید.',
        }),
      );
    }
  },
  removeItem: (name: string) => {
    try {
      if (typeof window !== 'undefined') localStorage.removeItem(name);
    } catch {}
  },
};
export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      trips: seedTrips(),
      localProfile: { id: 'local-user', name: 'نیکا' },
      cloudUser: null,
      activeTripId: DEMO_TRIP_ID,
      theme: 'dark',
      reduceTransparency: false,
      demo: true,
      hydrated: false,
      storageError: null,
      cloudTripIds: [],
      revisions: {},
      snapshots: {},
      dirtyTripIds: [],
      syncErrors: {},
      syncingIds: [],
      onlineUsers: {},
      remoteQueue: {},
      addTrip: (trip) => {
        const valid = validateTrip(trip);
        if (get().trips.length >= 100) throw new Error('TRIP_LIMIT');
        set((s) => ({ trips: [valid, ...s.trips], activeTripId: valid.id, demo: false }));
      },
      updateTrip: (id, patch, sections) => {
        const state = get(),
          trip = state.trips.find((t) => t.id === id);
        if (!trip) throw new Error('NOT_FOUND');
        const actualSections = Object.keys(patch).map((key) => {
          if (
            [
              'title',
              'destination',
              'startDate',
              'endDate',
              'budget',
              'currency',
              'description',
              'cover',
              'archived',
            ].includes(key)
          )
            return 'info' as TripSection;
          if (
            [
              'members',
              'activities',
              'checklist',
              'expenses',
              'settlements',
              'locations',
              'transport',
            ].includes(key)
          )
            return key as TripSection;
          throw new Error('FORBIDDEN');
        });
        assertEdit(state, trip, [...sections, ...actualSections]);
        if (
          patch.currency &&
          patch.currency !== trip.currency &&
          (trip.expenses.length || trip.settlements.length)
        )
          throw new Error('CURRENCY_LOCKED');
        const next = validateTrip({
          ...trip,
          ...patch,
          id: trip.id,
          ownerId: trip.ownerId,
          updatedAt: new Date().toISOString(),
        });
        set((s) => ({
          trips: s.trips.map((t) => (t.id === id ? next : t)),
          dirtyTripIds: s.cloudTripIds.includes(id)
            ? [...new Set([...s.dirtyTripIds, id])]
            : s.dirtyTripIds,
          syncErrors: { ...s.syncErrors, [id]: '' },
        }));
      },
      saveEntity: (id, section, entity) => {
        const trip = get().trips.find((t) => t.id === id);
        if (!trip) return;
        const arr = trip[section] as Entity[];
        const next = arr.some((e) => e.id === entity.id)
          ? arr.map((e) => (e.id === entity.id ? entity : e))
          : [...arr, entity];
        get().updateTrip(id, { [section]: next }, [section]);
      },
      removeEntity: (id, section, entityId) => {
        const trip = get().trips.find((t) => t.id === id);
        if (!trip) return;
        const patch: Partial<Trip> = {
          [section]: trip[section].filter((entity) => entity.id !== entityId),
        };
        const sections: TripSection[] = [section];
        if (
          section === 'locations' &&
          trip.activities.some((activity) => activity.locationId === entityId)
        ) {
          patch.activities = trip.activities.map((activity) =>
            activity.locationId === entityId ? { ...activity, locationId: '' } : activity,
          );
          sections.push('activities');
        }
        if (section === 'members' && trip.checklist.some((item) => item.assignedTo === entityId)) {
          patch.checklist = trip.checklist.map((item) =>
            item.assignedTo === entityId ? { ...item, assignedTo: '' } : item,
          );
          sections.push('checklist');
        }
        get().updateTrip(id, patch, sections);
      },
      toggleChecklist: (id, itemId) => {
        const trip = get().trips.find((t) => t.id === id);
        if (!trip) return;
        get().updateTrip(
          id,
          { checklist: trip.checklist.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)) },
          ['checklist'],
        );
      },
      deleteTrip: (id) => {
        const s = get(),
          trip = s.trips.find((t) => t.id === id);
        if (!trip) return;
        assertEdit(s, trip, ['info']);
        set((s) => ({
          trips: s.trips.filter((t) => t.id !== id),
          activeTripId:
            s.activeTripId === id ? s.trips.find((t) => t.id !== id)?.id || '' : s.activeTripId,
          cloudTripIds: s.cloudTripIds.filter((v) => v !== id),
          dirtyTripIds: s.dirtyTripIds.filter((v) => v !== id),
          revisions: Object.fromEntries(Object.entries(s.revisions).filter(([key]) => key !== id)),
          snapshots: Object.fromEntries(Object.entries(s.snapshots).filter(([key]) => key !== id)),
          remoteQueue: Object.fromEntries(
            Object.entries(s.remoteQueue).filter(([key]) => key !== id),
          ),
          syncErrors: Object.fromEntries(
            Object.entries(s.syncErrors).filter(([key]) => key !== id),
          ),
          onlineUsers: Object.fromEntries(
            Object.entries(s.onlineUsers).filter(([key]) => key !== id),
          ),
        }));
      },
      setActiveTrip: (activeTripId) => set({ activeTripId }),
      setLocalProfile: (name) =>
        set((s) => ({
          localProfile: { ...s.localProfile, name },
          trips: s.trips.map((t) =>
            s.cloudTripIds.includes(t.id)
              ? t
              : {
                  ...t,
                  members: t.members.map((m) =>
                    m.userId === s.localProfile.id ? { ...m, name } : m,
                  ),
                },
          ),
        })),
      setCloudUser: (cloudUser) => set({ cloudUser }),
      setTheme: (theme) => set({ theme }),
      setTransparency: (reduceTransparency) => set({ reduceTransparency }),
      setHydrated: () => set({ hydrated: true }),
      markSynced: (trip, revision, replace = true) =>
        set((s) => ({
          trips: replace ? [trip, ...s.trips.filter((t) => t.id !== trip.id)] : s.trips,
          cloudTripIds: [...new Set([...s.cloudTripIds, trip.id])],
          revisions: { ...s.revisions, [trip.id]: revision },
          snapshots: { ...s.snapshots, [trip.id]: trip },
          dirtyTripIds: replace ? s.dirtyTripIds.filter((id) => id !== trip.id) : s.dirtyTripIds,
          syncErrors: { ...s.syncErrors, [trip.id]: '' },
        })),
      mergeRemote: (trip, revision) => {
        const s = get(),
          local = s.trips.find((t) => t.id === trip.id);
        if (local && (s.revisions[trip.id] ?? -1) >= revision) return;
        if (s.syncingIds.includes(trip.id)) {
          set((s) => ({
            remoteQueue: {
              ...s.remoteQueue,
              [trip.id]:
                !s.remoteQueue[trip.id] || s.remoteQueue[trip.id].revision < revision
                  ? { trip, revision }
                  : s.remoteQueue[trip.id],
            },
          }));
          return;
        }
        if (local && s.dirtyTripIds.includes(trip.id) && s.snapshots[trip.id]) {
          const result = threeWayMerge(s.snapshots[trip.id], local, trip);
          if (result.conflicts.length) {
            get().setSyncError(
              trip.id,
              'تداخل در ویرایش یک بخش. تغییرات محلی محفوظ‌اند؛ برای بررسی نسخه‌ها به تنظیمات بروید.',
            );
            return;
          }
          try {
            const merged = validateTrip(result.trip);
            set((s) => ({ trips: s.trips.map((t) => (t.id === trip.id ? merged : t)) }));
            get().markSynced(trip, revision, false);
          } catch {
            get().setSyncError(
              trip.id,
              'نسخه‌های سفر نیاز به بررسی دارند؛ تغییرات محلی محفوظ‌اند.',
            );
          }
          return;
        }
        get().markSynced(trip, revision);
      },
      setSyncError: (id, message) =>
        set((s) => ({ syncErrors: { ...s.syncErrors, [id]: message } })),
      setSyncing: (id, value) =>
        set((s) => ({
          syncingIds: value
            ? [...new Set([...s.syncingIds, id])]
            : s.syncingIds.filter((x) => x !== id),
        })),
      setOnline: (id, users) => set((s) => ({ onlineUsers: { ...s.onlineUsers, [id]: users } })),
      reconcileCloudIds: (ids) =>
        set((s) => {
          const allowed = new Set(ids),
            keep = (id: string) => allowed.has(id);
          const pick = <T>(record: Record<string, T>) =>
            Object.fromEntries(Object.entries(record).filter(([id]) => keep(id)));
          return {
            trips: s.trips.filter((trip) => !s.cloudTripIds.includes(trip.id) || keep(trip.id)),
            cloudTripIds: s.cloudTripIds.filter(keep),
            dirtyTripIds: s.dirtyTripIds.filter(keep),
            syncingIds: s.syncingIds.filter(keep),
            revisions: pick(s.revisions),
            snapshots: pick(s.snapshots),
            syncErrors: pick(s.syncErrors),
            onlineUsers: pick(s.onlineUsers),
            remoteQueue: pick(s.remoteQueue),
          };
        }),
      disconnectCloud: () =>
        set((s) => ({
          trips: s.trips.filter((t) => !s.cloudTripIds.includes(t.id)),
          cloudTripIds: [],
          revisions: {},
          snapshots: {},
          dirtyTripIds: [],
          cloudUser: null,
          syncErrors: {},
          onlineUsers: {},
          syncingIds: [],
          remoteQueue: {},
        })),
      resetDemo: () => {
        const trips = seedTrips();
        set((s) => ({
          trips: [
            ...trips.filter((t) => !s.cloudTripIds.includes(t.id)),
            ...s.trips.filter((t) => s.cloudTripIds.includes(t.id)),
          ],
          activeTripId: trips[0].id,
          demo: true,
        }));
      },
      clearLocal: () =>
        set((s) => ({
          trips: s.trips.filter((t) => s.cloudTripIds.includes(t.id)),
          activeTripId: s.cloudTripIds[0] || '',
          demo: false,
        })),
      importTrips: (trips) =>
        set((s) => {
          const imported = trips.map((t) => {
            const valid = validateTrip(t),
              owner = valid.members.find((m) => m.userId === valid.ownerId) || valid.members[0];
            return {
              ...valid,
              id:
                s.cloudTripIds.includes(valid.id) || valid.ownerId !== s.localProfile.id
                  ? uid()
                  : valid.id,
              ownerId: s.localProfile.id,
              archived: false,
              expenses: valid.expenses.map((expense) =>
                expense.receipt
                  ? { ...expense, receipt: { ...expense.receipt, cloudPath: undefined } }
                  : expense,
              ),
              transport: {
                ...valid.transport,
                outbound: {
                  ...valid.transport.outbound,
                  ticket: valid.transport.outbound.ticket
                    ? { ...valid.transport.outbound.ticket, cloudPath: undefined }
                    : undefined,
                },
                return: {
                  ...valid.transport.return,
                  ticket: valid.transport.return.ticket
                    ? { ...valid.transport.return.ticket, cloudPath: undefined }
                    : undefined,
                },
              },
              members: valid.members.map((m) =>
                m.id === owner.id
                  ? { ...m, userId: s.localProfile.id, role: 'admin' as const }
                  : { ...m, userId: undefined },
              ),
            };
          });
          const combined = [
            ...imported,
            ...s.trips.filter((t) => !imported.some((v) => v.id === t.id)),
          ];
          if (combined.length > 100) throw new Error('TRIP_LIMIT');
          return {
            trips: combined,
            demo: false,
            activeTripId: imported[0]?.id || s.activeTripId,
          };
        }),
    }),
    {
      name: 'hamsafar-v1',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      skipHydration: true,
      partialize: (s) => ({
        trips: s.trips,
        localProfile: s.localProfile,
        activeTripId: s.activeTripId,
        theme: s.theme,
        reduceTransparency: s.reduceTransparency,
        demo: s.demo,
        cloudTripIds: s.cloudTripIds,
        revisions: s.revisions,
        snapshots: s.snapshots,
        dirtyTripIds: s.dirtyTripIds,
      }),
      merge: (persisted, current) => {
        if (!persisted) return current;
        try {
          const data = parseCache(persisted);
          return {
            ...current,
            ...data,
            trips: data.trips.map(validateTrip),
            hydrated: false,
            cloudUser: current.cloudUser,
            syncingIds: current.syncingIds,
            onlineUsers: current.onlineUsers,
            remoteQueue: current.remoteQueue,
            syncErrors: current.syncErrors,
          };
        } catch {
          try {
            localStorage.setItem('hamsafar-recovery', localStorage.getItem('hamsafar-v1') || '');
          } catch {}
          return {
            ...current,
            storageError:
              'نسخه ذخیره‌شده معتبر نیست. داده خام هنوز در مرورگر است؛ پیش از بازنشانی، از آن نسخه پشتیبان بگیرید.',
          };
        }
      },
    },
  ),
);
export function useIdentity(tripId?: string) {
  const local = useTripStore((s) => s.localProfile),
    cloud = useTripStore((s) => s.cloudUser),
    cloudIds = useTripStore((s) => s.cloudTripIds);
  return tripId && cloudIds.includes(tripId) ? cloud || { id: '', name: 'مهمان' } : local;
}
