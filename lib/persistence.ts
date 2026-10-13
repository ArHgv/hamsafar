import { z } from 'zod';
import { tripSchema } from './schemas';
const uuid = z.uuid().transform((id) => id.toLowerCase());
/** Only data fields are restored. Stored JSON can never overwrite store methods. */
export const cacheSchema = z.object({
  trips: z.array(tripSchema).max(100),
  localProfile: z
    .object({ id: z.literal('local-user'), name: z.string().trim().min(1).max(150) })
    .optional(),
  activeTripId: z.string().max(100).optional(),
  theme: z.enum(['dark', 'light', 'system', 'black-gold', 'white-gold']).optional(),
  reduceTransparency: z.boolean().optional(),
  demo: z.boolean().optional(),
  cloudTripIds: z.array(uuid).max(100).optional(),
  revisions: z.record(uuid, z.number().int().positive().max(Number.MAX_SAFE_INTEGER)).optional(),
  snapshots: z.record(uuid, tripSchema).optional(),
  dirtyTripIds: z.array(uuid).max(100).optional(),
});
export function parseCache(value: unknown) {
  const data = cacheSchema.parse(value),
    tripIds = new Set(data.trips.map((trip) => trip.id));
  const cloudTripIds = [...new Set(data.cloudTripIds?.filter((id) => tripIds.has(id)) || [])];
  const cloud = new Set(cloudTripIds);
  return {
    ...data,
    cloudTripIds,
    revisions: Object.fromEntries(
      Object.entries(data.revisions || {}).filter(([id]) => cloud.has(id)),
    ),
    snapshots: Object.fromEntries(
      Object.entries(data.snapshots || {}).filter(([id, trip]) => cloud.has(id) && trip.id === id),
    ),
    dirtyTripIds: [...new Set(data.dirtyTripIds?.filter((id) => cloud.has(id)) || [])],
  };
}
