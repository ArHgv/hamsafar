'use client';
import { useEffect, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import { listCloudTrips, syncTrip } from '@/lib/cloud';
import { useTripStore } from '@/store/use-trip-store';
import { useToast } from '@/store/use-ui-store';
import { validateTrip } from '@/lib/schemas';
import { readableError } from '@/lib/utils';
export function CloudBridge() {
  const hydrated = useTripStore((s) => s.hydrated),
    user = useTripStore((s) => s.cloudUser),
    trips = useTripStore((s) => s.trips),
    dirty = useTripStore((s) => s.dirtyTripIds),
    syncing = useTripStore((s) => s.syncingIds),
    errors = useTripStore((s) => s.syncErrors),
    active = useTripStore((s) => s.activeTripId),
    cloudIds = useTripStore((s) => s.cloudTripIds),
    queued = useTripStore((s) => s.remoteQueue),
    toast = useToast();
  const initialUser = useRef<string | null>(null);
  useEffect(() => {
    const supabase = getSupabase();
    if (!hydrated || !supabase) return;
    let alive = true,
      generation = 0;
    const load = async (session: Session | null) => {
      const version = generation + 1;
      if (!session) {
        generation = version;
        useTripStore.getState().setCloudUser(null);
        initialUser.current = null;
        return;
      }
      if (initialUser.current === session.user.id) return;
      initialUser.current = session.user.id;
      generation = version;
      useTripStore.getState().setCloudUser({
        id: session.user.id,
        name: (typeof session.user.user_metadata?.name === 'string' &&
        session.user.user_metadata.name.trim()
          ? session.user.user_metadata.name.trim()
          : session.user.email?.split('@')[0] || 'هم‌سفر'
        ).slice(0, 150),
        email: session.user.email,
      });
      try {
        const records = await listCloudTrips();
        if (alive && generation === version) {
          records.forEach((r) => useTripStore.getState().mergeRemote(r.data, r.revision));
          const ids = records.map((r) => r.id);
          useTripStore.getState().reconcileCloudIds(ids);
        }
      } catch (e) {
        if (alive) {
          toast(readableError(e), 'error');
          initialUser.current = null;
        }
      }
    };
    supabase.auth.getSession().then(({ data, error }) => {
      if (alive && !error) void load(data.session);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'USER_UPDATED') initialUser.current = null;
      setTimeout(() => {
        if (alive) void load(session);
      }, 0);
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [hydrated, toast]);
  useEffect(() => {
    const supabase = getSupabase();
    if (!user || !supabase) return;
    let alive = true;
    const channel = supabase
      .channel(`trip-changes-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const id = payload.old.id as string;
          useTripStore.setState((s) => ({
            trips: s.trips.filter((t) => t.id !== id),
            cloudTripIds: s.cloudTripIds.filter((v) => v !== id),
            dirtyTripIds: s.dirtyTripIds.filter((v) => v !== id),
          }));
          return;
        }
        const row = payload.new;
        try {
          useTripStore.getState().mergeRemote(validateTrip(row.data), Number(row.revision));
        } catch {
          toast('نسخه دریافت‌شده معتبر نبود؛ نسخه فعلی محفوظ است.', 'error');
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_memberships' }, () => {
        void listCloudTrips()
          .then((records) => {
            if (!alive || useTripStore.getState().cloudUser?.id !== user.id) return;
            records.forEach((r) => useTripStore.getState().mergeRemote(r.data, r.revision));
            const ids = records.map((r) => r.id);
            useTripStore.getState().reconcileCloudIds(ids);
          })
          .catch(() => {});
      })
      .subscribe();
    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, [user?.id, toast]);
  useEffect(() => {
    Object.entries(queued).forEach(([id, value]) => {
      if (syncing.includes(id)) return;
      useTripStore.setState((s) => {
        const next = { ...s.remoteQueue };
        delete next[id];
        return { remoteQueue: next };
      });
      useTripStore.getState().mergeRemote(value.trip, value.revision);
    });
  }, [queued, syncing]);
  useEffect(() => {
    if (!user || !dirty.length || !navigator.onLine) return;
    const timer = setTimeout(() => {
      dirty
        .filter((id) => !syncing.includes(id) && !errors[id])
        .forEach((id) => {
          void syncTrip(id);
        });
    }, 650);
    return () => clearTimeout(timer);
  }, [user, trips, dirty, syncing, errors]);
  useEffect(() => {
    const retry = () => {
      if (useTripStore.getState().cloudUser)
        useTripStore.getState().dirtyTripIds.forEach((id) => {
          if (
            !useTripStore.getState().syncErrors[id]?.includes('تداخل') &&
            !useTripStore.getState().syncErrors[id]?.includes('نسخه')
          ) {
            useTripStore.getState().setSyncError(id, '');
            void syncTrip(id);
          }
        });
    };
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, []);
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !user || !cloudIds.includes(active)) return;
    const channel = supabase
      .channel(`trip:${active}`, { config: { private: true, presence: { key: user.id } } })
      .on('presence', { event: 'sync' }, () => {
        useTripStore.getState().setOnline(active, Object.keys(channel.presenceState()));
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED')
          void channel.track({ user_id: user.id, online_at: new Date().toISOString() });
      });
    return () => {
      useTripStore.getState().setOnline(active, []);
      void supabase.removeChannel(channel);
    };
  }, [user?.id, active, cloudIds.join(',')]);
  return null;
}
