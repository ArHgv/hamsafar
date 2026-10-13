import type { Attachment, CloudTripRecord, Invitation, MemberRole, Trip } from './types';
import { requireSupabase } from './supabase';
import { validateTrip } from './schemas';
import { getLocalFile } from './local-files';
import { threeWayMerge } from './merge';
import { readableError } from './utils';
import { useTripStore } from '@/store/use-trip-store';
function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}
function record(value: unknown): CloudTripRecord {
  const r = (Array.isArray(value) ? value[0] : value) as CloudTripRecord;
  if (!r) throw new Error('EMPTY_RECORD');
  return { ...r, data: validateTrip(r.data) };
}
export async function listCloudTrips(): Promise<CloudTripRecord[]> {
  const { data, error } = await requireSupabase()
    .from('trips')
    .select('id,data,revision,updated_at')
    .order('updated_at', { ascending: false });
  fail(error);
  return (data || []).map(record);
}
export async function getCloudTrip(id: string): Promise<CloudTripRecord> {
  const { data, error } = await requireSupabase()
    .from('trips')
    .select('id,data,revision,updated_at')
    .eq('id', id)
    .single();
  fail(error);
  return record(data);
}
async function uploadAttachment(
  tripId: string,
  attachment: Attachment,
  scope: 'plan' | 'expense',
): Promise<Attachment> {
  if (attachment.cloudPath) return attachment;
  const file = attachment.localId && (await getLocalFile(attachment.localId));
  if (!file) throw new Error('MISSING_FILE');
  const ext: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  const path = `${tripId}/${scope}/${attachment.id}.${ext[attachment.mime] || 'pdf'}`;
  const { error } = await requireSupabase()
    .storage.from('trip-files')
    .upload(path, file, { contentType: attachment.mime, cacheControl: '3600', upsert: true });
  fail(error);
  return { ...attachment, cloudPath: path };
}
async function migrateAttachments(trip: Trip): Promise<Trip> {
  const expenses = await Promise.all(
    trip.expenses.map(async (e) =>
      e.receipt && !e.receipt.cloudPath
        ? { ...e, receipt: await uploadAttachment(trip.id, e.receipt, 'expense') }
        : e,
    ),
  );
  const outbound =
    trip.transport.outbound.ticket && !trip.transport.outbound.ticket.cloudPath
      ? {
          ...trip.transport.outbound,
          ticket: await uploadAttachment(trip.id, trip.transport.outbound.ticket, 'plan'),
        }
      : trip.transport.outbound;
  const returnLeg =
    trip.transport.return.ticket && !trip.transport.return.ticket.cloudPath
      ? {
          ...trip.transport.return,
          ticket: await uploadAttachment(trip.id, trip.transport.return.ticket, 'plan'),
        }
      : trip.transport.return;
  return { ...trip, expenses, transport: { ...trip.transport, outbound, return: returnLeg } };
}
const SYNC_KEYS: (keyof Trip)[] = [
  'title',
  'destination',
  'startDate',
  'endDate',
  'budget',
  'currency',
  'description',
  'cover',
  'archived',
  'members',
  'activities',
  'checklist',
  'expenses',
  'settlements',
  'locations',
  'transport',
];
function diffTrip(base: Trip, next: Trip): Record<string, unknown> {
  return Object.fromEntries(
    SYNC_KEYS.filter((k) => JSON.stringify(base[k]) !== JSON.stringify(next[k])).map((k) => [
      k,
      next[k] === undefined ? null : next[k],
    ]),
  );
}
async function savePatch(
  id: string,
  revision: number,
  patch: Record<string, unknown>,
): Promise<CloudTripRecord> {
  const { data, error } = await requireSupabase().rpc('apply_trip_patch', {
    p_trip_id: id,
    p_expected_revision: revision,
    p_patch: patch,
  });
  fail(error);
  return record(data);
}
export async function publishTrip(trip: Trip): Promise<CloudTripRecord> {
  const supabase = requireSupabase(),
    {
      data: { user },
    } = await supabase.auth.getUser();
  if (!user) throw new Error('AUTH_REQUIRED');
  const localOwner = trip.members.find((m) => m.userId === trip.ownerId) || trip.members[0];
  const next: Trip = {
    ...trip,
    ownerId: user.id,
    members: trip.members.map((m) =>
      m.id === localOwner.id
        ? {
            ...m,
            userId: user.id,
            name:
              typeof user.user_metadata?.name === 'string' && user.user_metadata.name.trim()
                ? user.user_metadata.name.trim().slice(0, 150)
                : m.name,
            email: user.email,
            role: 'admin',
          }
        : { ...m, userId: undefined },
    ),
  };
  const { data, error } = await supabase.rpc('create_trip', { p_data: next });
  fail(error);
  let result = record(data);
  useTripStore.getState().markSynced(result.data, result.revision);
  try {
    const migrated = await migrateAttachments(result.data),
      patch = diffTrip(result.data, migrated);
    if (Object.keys(patch).length) result = await savePatch(trip.id, result.revision, patch);
    useTripStore.getState().markSynced(result.data, result.revision);
  } catch (e) {
    useTripStore.setState((s) => ({ dirtyTripIds: [...new Set([...s.dirtyTripIds, trip.id])] }));
    useTripStore.getState().setSyncError(trip.id, readableError(e));
    throw e;
  }
  return result;
}
export async function syncTrip(id: string): Promise<void> {
  const store = useTripStore.getState();
  if (!store.cloudUser || !store.cloudTripIds.includes(id) || store.syncingIds.includes(id)) return;
  const original = store.trips.find((t) => t.id === id),
    base = store.snapshots[id];
  if (!original || !base) return;
  store.setSyncing(id, true);
  try {
    const migrated = await migrateAttachments(original);
    const patch = diffTrip(base, migrated);
    let result: CloudTripRecord;
    if (!Object.keys(patch).length) {
      useTripStore.setState((s) => ({ dirtyTripIds: s.dirtyTripIds.filter((v) => v !== id) }));
      return;
    }
    try {
      result = await savePatch(id, store.revisions[id], patch);
    } catch (e) {
      if (!(e instanceof Error) || !e.message.includes('REVISION_CONFLICT')) throw e;
      const remote = await getCloudTrip(id),
        merged = threeWayMerge(base, migrated, remote.data);
      if (merged.conflicts.length) throw new Error('REVISION_CONFLICT');
      validateTrip(merged.trip);
      result = await savePatch(id, remote.revision, diffTrip(remote.data, merged.trip));
    }
    const latest = useTripStore.getState().trips.find((t) => t.id === id);
    if (JSON.stringify(latest) === JSON.stringify(original))
      useTripStore.getState().markSynced(result.data, result.revision);
    else {
      const merged = latest ? threeWayMerge(original, latest, result.data).trip : result.data;
      useTripStore.setState((s) => ({ trips: s.trips.map((t) => (t.id === id ? merged : t)) }));
      useTripStore.getState().markSynced(result.data, result.revision, false);
    }
  } catch (e) {
    useTripStore.getState().setSyncError(id, readableError(e));
  } finally {
    useTripStore.getState().setSyncing(id, false);
  }
}
export async function resolveConflict(id: string, choice: 'remote' | 'local'): Promise<void> {
  const remote = await getCloudTrip(id),
    state = useTripStore.getState(),
    local = state.trips.find((t) => t.id === id);
  if (!local) return;
  if (choice === 'remote') {
    state.markSynced(remote.data, remote.revision);
    return;
  }
  // Explicit overwrite only affects the sections changed locally, never unrelated cloud sections.
  const localPatch = diffTrip(state.snapshots[id] || remote.data, local);
  const migrated = await migrateAttachments({ ...remote.data, ...localPatch } as Trip);
  const result = await savePatch(id, remote.revision, diffTrip(remote.data, migrated));
  state.markSynced(result.data, result.revision);
}
export async function createInvitation(id: string, role: MemberRole): Promise<Invitation> {
  const { data, error } = await requireSupabase().rpc('create_invite', {
    p_trip_id: id,
    p_role: role,
  });
  fail(error);
  return Array.isArray(data) ? data[0] : data;
}
export async function revokeInvitation(token: string) {
  const { error } = await requireSupabase().rpc('revoke_invite', { p_token: token });
  fail(error);
}
export async function listInvitations(tripId: string): Promise<Invitation[]> {
  const { data, error } = await requireSupabase()
    .from('trip_invites')
    .select('token,role,expires_at')
    .eq('trip_id', tripId)
    .eq('revoked', false)
    .gt('expires_at', new Date().toISOString());
  fail(error);
  return data || [];
}
export async function invitePreview(token: string): Promise<{
  title: string;
  destination: string;
  role: MemberRole;
  inviter: string;
  start_date: string;
  end_date: string;
}> {
  const { data, error } = await requireSupabase().rpc('invite_preview', { p_token: token });
  fail(error);
  const value = Array.isArray(data) ? data[0] : data;
  if (!value) throw new Error('INVALID_INVITE');
  return value;
}
export async function joinInvitation(token: string): Promise<CloudTripRecord> {
  const { data, error } = await requireSupabase().rpc('join_trip', { p_token: token });
  fail(error);
  const r = record(data);
  useTripStore.getState().markSynced(r.data, r.revision);
  useTripStore.getState().setActiveTrip(r.id);
  return r;
}
export async function deleteCloudTrip(id: string) {
  const { error } = await requireSupabase().rpc('delete_trip', { p_trip_id: id });
  fail(error);
}
export async function fileURL(path: string) {
  const { data, error } = await requireSupabase()
    .storage.from('trip-files')
    .createSignedUrl(path, 60);
  fail(error);
  return data!.signedUrl;
}
