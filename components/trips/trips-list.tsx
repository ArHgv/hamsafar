'use client';
import { useState } from 'react';
import { Search, MapPinned } from 'lucide-react';
import { useTripStore } from '@/store/use-trip-store';
import { tripStatus } from '@/lib/dates';
import { fa, cn } from '@/lib/utils';
import { Input, EmptyState, NewTripLink } from '../ui/primitives';
import { NewTripTile, TripCard } from './trip-card';
const filters = [
  { key: 'all', label: 'همه سفرها' },
  { key: 'upcoming', label: 'پیش رو' },
  { key: 'active', label: 'در سفر' },
  { key: 'past', label: 'خاطره‌ها' },
] as const;
export function TripsList() {
  const trips = useTripStore((s) => s.trips).filter((t) => !t.archived),
    [filter, setFilter] = useState<string>('all'),
    [search, setSearch] = useState('');
  const result = trips
    .filter(
      (t) =>
        (filter === 'all' || tripStatus(t.startDate, t.endDate) === filter) &&
        `${t.title} ${t.destination}`.includes(search.trim()),
    )
    .sort((a, b) =>
      filter === 'past'
        ? b.startDate.localeCompare(a.startDate)
        : a.startDate.localeCompare(b.startDate),
    );
  return (
    <>
      <div className="page-intro small-heading">
        <div>
          <h1>سفرهای من</h1>
          <p>راه‌هایی که می‌رویم، خاطره‌هایی که می‌مانند.</p>
        </div>
        <NewTripLink compact />
      </div>
      <div className="filters-row">
        <div className="segmented" aria-label="فیلتر سفرها">
          {filters.map((f) => (
            <button
              key={f.key}
              className={cn(filter === f.key && 'active')}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              <small>
                {fa(
                  trips.filter(
                    (t) => f.key === 'all' || tripStatus(t.startDate, t.endDate) === f.key,
                  ).length,
                )}
              </small>
            </button>
          ))}
        </div>
        <div className="filter-search">
          <Search size={16} />
          <Input
            placeholder="جست‌وجوی سفر یا مقصد…"
            aria-label="جست‌وجوی سفر"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      {result.length ? (
        <div className="trip-grid">
          {result.map((t) => (
            <TripCard key={t.id} trip={t} />
          ))}
          <NewTripTile />
        </div>
      ) : (
        <EmptyState
          icon={<MapPinned size={26} />}
          title={search ? 'این سفر را پیدا نکردیم' : 'اینجا جا برای یک سفر تازه هست'}
          description={
            search
              ? 'نام یا مقصد دیگری را جست‌وجو کن.'
              : 'یک مقصد انتخاب کن و داستان بعدی‌ات را از همین‌جا شروع کن.'
          }
          action={!search && <NewTripLink />}
        />
      )}
    </>
  );
}
