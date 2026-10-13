import type { Trip } from './types';
export function threeWayMerge(
  base: Trip,
  local: Trip,
  remote: Trip,
): { trip: Trip; conflicts: string[] } {
  const conflicts: string[] = [];
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  const merge = (b: unknown, l: unknown, r: unknown, path: string): unknown => {
    if (same(l, b)) return r;
    if (same(r, b) || same(l, r)) return l;
    if (path === 'updatedAt') return r;
    if (Array.isArray(b) && Array.isArray(l) && Array.isArray(r)) {
      const all = [...b, ...l, ...r];
      if (all.every((v) => v && typeof v === 'object' && typeof v.id === 'string')) {
        const bm = new Map(b.map((v) => [v.id, v])),
          lm = new Map(l.map((v) => [v.id, v])),
          rm = new Map(r.map((v) => [v.id, v]));
        return [...new Set([...rm.keys(), ...lm.keys(), ...bm.keys()])]
          .map((id) => merge(bm.get(id), lm.get(id), rm.get(id), `${path}.${id}`))
          .filter((v) => v !== undefined);
      }
    }
    if (
      b &&
      l &&
      r &&
      typeof b === 'object' &&
      typeof l === 'object' &&
      typeof r === 'object' &&
      !Array.isArray(b)
    ) {
      const bb = b as Record<string, unknown>,
        ll = l as Record<string, unknown>,
        rr = r as Record<string, unknown>;
      return Object.fromEntries(
        [...new Set([...Object.keys(bb), ...Object.keys(ll), ...Object.keys(rr)])].map((k) => [
          k,
          merge(bb[k], ll[k], rr[k], path ? `${path}.${k}` : k),
        ]),
      );
    }
    conflicts.push(path);
    return l;
  };
  return { trip: merge(base, local, remote, '') as Trip, conflicts };
}
