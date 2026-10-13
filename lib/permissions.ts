import type { MemberRole, Trip, TripSection } from './types';
export function roleFor(trip: Trip, userId: string): MemberRole {
  if (trip.ownerId === userId) return 'admin';
  return trip.members.find((m) => m.userId === userId)?.role || 'viewer';
}
export function canEdit(role: MemberRole, section: TripSection): boolean {
  if (role === 'admin') return true;
  if (role === 'planner')
    return ['activities', 'checklist', 'locations', 'transport'].includes(section);
  if (role === 'treasurer') return ['expenses', 'settlements'].includes(section);
  return false;
}
