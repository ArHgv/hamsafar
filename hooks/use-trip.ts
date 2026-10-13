'use client';
import { useTripStore, useIdentity } from '@/store/use-trip-store';
import { canEdit, roleFor } from '@/lib/permissions';
import type { Trip, TripSection } from '@/lib/types';
export function useCurrentTrip(id?: string) {
  const trips = useTripStore((s) => s.trips),
    active = useTripStore((s) => s.activeTripId);
  return id
    ? trips.find((t) => t.id === id)
    : trips.find((t) => t.id === active && !t.archived) || trips.find((t) => !t.archived);
}
export function useTripPermission(trip: Trip, section: TripSection) {
  const identity = useIdentity(trip.id);
  return canEdit(roleFor(trip, identity.id), section);
}
