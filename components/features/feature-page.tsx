'use client';
import { MapPinned } from 'lucide-react';
import { useCurrentTrip } from '@/hooks/use-trip';
import { useTripStore } from '@/store/use-trip-store';
import { EmptyState, NewTripLink, Select } from '../ui/primitives';
import { PlanningBoard } from './planning-board';
import { ChecklistBoard } from './checklist-board';
import { ExpensesBoard } from './expenses-board';
import { SettlementBoard } from './settlement-board';
import { LocationsBoard } from './locations-board';
import { GroupBoard } from './group-board';
export type Feature =
  'planning' | 'checklist' | 'expenses' | 'settlements' | 'locations' | 'groups';
const meta: Record<Feature, { title: string; description: string }> = {
  planning: { title: 'برنامه‌ریزی سفر', description: 'روزها را با تجربه‌ها پر کن، نه با شلوغی.' },
  checklist: { title: 'کیف سفر', description: 'ضروری‌ها آماده؛ خیال تو آسوده.' },
  expenses: { title: 'هزینه‌های سفر', description: 'شفاف خرج کن، ساده تقسیم کن.' },
  settlements: { title: 'تسویه حساب', description: 'انتقال‌های کمتر، حساب‌های روشن‌تر.' },
  locations: {
    title: 'مکان‌ها و نشانی‌ها',
    description: 'از جایی که می‌مانی، تا جایی که کشف می‌کنی.',
  },
  groups: { title: 'هم‌سفرها', description: 'همراه‌های این راه؛ شریک‌های این خاطره.' },
};
export const FeatureComponents = {
  planning: PlanningBoard,
  checklist: ChecklistBoard,
  expenses: ExpensesBoard,
  settlements: SettlementBoard,
  locations: LocationsBoard,
  groups: GroupBoard,
};
export function FeaturePage({ feature }: { feature: Feature }) {
  const trip = useCurrentTrip(),
    trips = useTripStore((s) => s.trips).filter((t) => !t.archived),
    setActive = useTripStore((s) => s.setActiveTrip),
    Component = FeatureComponents[feature];
  return (
    <>
      <div className="page-intro small-heading">
        <div>
          <h1>{meta[feature].title}</h1>
          <p>{meta[feature].description}</p>
        </div>
        {trip && (
          <div className="trip-picker">
            <Select
              aria-label="انتخاب سفر"
              value={trip.id}
              onChange={(e) => setActive(e.target.value)}
            >
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>
      {trip ? (
        <Component key={trip.id} trip={trip} />
      ) : (
        <EmptyState
          icon={<MapPinned size={28} />}
          title="اول، یک سفر تازه بساز."
          description="با انتخاب مقصد، همه ابزارهای برنامه‌ریزی، وسایل و هزینه‌ها برایت آماده می‌شوند."
          action={<NewTripLink />}
        />
      )}
    </>
  );
}
