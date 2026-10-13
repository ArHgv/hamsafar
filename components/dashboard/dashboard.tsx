'use client';
import Link from 'next/link';
import {
  Sunrise,
  MapPinned,
  Wallet,
  Backpack,
  ArrowLeftRight,
  CalendarDays,
  MapPin,
  ArrowUpLeft,
  Clock3,
  Check,
  Users,
  ChevronLeft,
  Car,
  Utensils,
  Coffee,
} from 'lucide-react';
import type { Currency, Trip } from '@/lib/types';
import { useTripStore, useIdentity } from '@/store/use-trip-store';
import { useToast } from '@/store/use-ui-store';
import { countdown, dateRange, formatDate, tripDays, tripStatus } from '@/lib/dates';
import { compactMoney, money, suggestSettlements, totalExpenses } from '@/lib/money';
import { CURRENCY_LABELS } from '@/lib/constants';
import { canEdit, roleFor } from '@/lib/permissions';
import { cn, fa } from '@/lib/utils';
import {
  AvatarGroup,
  Card,
  NewTripLink,
  ProgressBar,
  ProgressRing,
  SectionHeading,
  TextLink,
  EmptyState,
} from '../ui/primitives';
import { DEMO_TRIP_IDS } from '@/lib/seed';
import { NewTripTile, TripCard } from '../trips/trip-card';
export function Dashboard() {
  const trips = useTripStore((s) => s.trips).filter((t) => !t.archived),
    local = useTripStore((s) => s.localProfile),
    cloud = useTripStore((s) => s.cloudUser),
    demo = trips.some((trip) => DEMO_TRIP_IDS.includes(trip.id));
  const future = trips
    .filter((t) => tripStatus(t.startDate, t.endDate) !== 'past')
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const featured = future.find((t) => tripStatus(t.startDate, t.endDate) === 'active') || future[0];
  const groups = future.filter((t) => t.members.length > 1),
    settlements = trips.reduce((n, t) => n + suggestSettlements(t).length, 0);
  const currencies = [...new Set(trips.map((t) => t.currency))],
    primary: Currency = currencies.includes('IRT') ? 'IRT' : currencies[0] || 'IRT';
  const amount = trips
    .filter((t) => t.currency === primary)
    .reduce((n, t) => n + totalExpenses(t), 0);
  const items = future.flatMap((t) => t.checklist),
    checked = items.filter((i) => i.done).length,
    percent = items.length ? Math.round((checked / items.length) * 100) : 0;
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">
            <Sunrise size={15} />
            سلام، {(cloud || local).name.split(' ')[0]}
            {demo && <span className="demo-label">با داده‌های نمونه</span>}
          </div>
          <h1 className="welcome-heading">
            سفر بعدی‌ات، <span>یک خاطره‌ی تازه.</span>
          </h1>
          <p>از اولین فکرِ رفتن، تا آخرین خاطره؛ همه‌چیز اینجاست.</p>
        </div>
        <NewTripLink compact />
      </div>
      <div className="dashboard-stats">
        <Stat
          icon={<MapPinned size={18} />}
          label="سفرهای پیش رو"
          value={fa(future.length)}
          caption={`${fa(groups.length)} سفر گروهی`}
        />
        <Stat
          icon={<Wallet size={18} />}
          label="هزینه‌های ثبت‌شده"
          value={compactMoney(amount, primary)}
          caption={
            currencies.length > 1
              ? `${CURRENCY_LABELS[primary]} · ${fa(currencies.length)} ارز جدا`
              : CURRENCY_LABELS[primary]
          }
        />
        <Stat
          icon={<Backpack size={18} />}
          label="آمادگی کیف سفر"
          value={`${fa(percent)}٪`}
          caption={`${fa(checked)} از ${fa(items.length)} وسیله`}
        />
        <Stat
          icon={<ArrowLeftRight size={18} />}
          label="تسویه‌های باقی‌مانده"
          value={fa(settlements)}
          caption={settlements ? 'تا حساب‌های صاف' : 'همه حساب‌ها صاف است'}
          highlight
        />
      </div>
      {featured ? (
        <div className="dashboard-featured">
          <FeaturedTrip trip={featured} />
          <Readiness trip={featured} />
        </div>
      ) : (
        <div style={{ marginBottom: 28 }}>
          <EmptyState
            icon={<MapPinned size={27} />}
            title="یک جای تازه منتظر توست"
            description="سفرت را بساز؛ مقصد، همراه‌ها و تمام فکرهای کوچکِ قبل از رفتن را اینجا جمع کن."
            action={<NewTripLink />}
          />
        </div>
      )}
      <SectionHeading
        title="سفرهای پیش رو"
        subtitle="قرارهای کوچکی با جهانِ بیرون"
        action={<TextLink href="/trips">همه سفرها</TextLink>}
      />
      <div className="trip-grid">
        {future.slice(0, 2).map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}
        <NewTripTile />
      </div>
      {featured && (
        <div className="dashboard-lower">
          <Card className="next-plan-card">
            <SectionHeading
              title="اولین روز، اولین خاطره‌ها"
              action={<TextLink href={`/trips/${featured.id}?tab=planning`}>برنامه کامل</TextLink>}
            />
            {featured.activities
              .filter((a) => a.date === featured.startDate && a.status !== 'cancelled')
              .slice(0, 3)
              .map((a, i) => (
                <Link
                  href={`/trips/${featured.id}?tab=planning`}
                  key={a.id}
                  className="compact-activity"
                >
                  <span className="activity-time">{a.time ? fa(a.time) : 'بدون ساعت'}</span>
                  <span className="activity-mini-icon">
                    {a.kind === 'transport' ? (
                      <Car size={17} />
                    ) : a.kind === 'food' ? (
                      <Utensils size={16} />
                    ) : (
                      <MapPin size={17} />
                    )}
                  </span>
                  <div>
                    <strong>{a.title}</strong>
                    <small>
                      {formatDate(a.date)} · {fa(a.duration)} دقیقه
                    </small>
                  </div>
                  <ChevronLeft
                    size={15}
                    style={{ marginInlineStart: 'auto', color: 'var(--soft)' }}
                  />
                </Link>
              ))}
            {!featured.activities.length && (
              <p className="muted" style={{ fontSize: 12 }}>
                هنوز برنامه‌ای ثبت نکردی. برای اولین روز یک قرار کوچک بگذار.
              </p>
            )}
          </Card>
          <Card className="wallet-card">
            <SectionHeading
              title="کیف پولِ سفر"
              action={<TextLink href={`/trips/${featured.id}?tab=expenses`}>جزئیات</TextLink>}
            />
            <div className="wallet-number">
              {money(totalExpenses(featured), featured.currency, false)}
              <small>{CURRENCY_LABELS[featured.currency]}</small>
            </div>
            <p className="card-eyebrow">هزینه ثبت‌شده برای {featured.title}</p>
            <div className="wallet-summary">
              <span>
                {featured.budget
                  ? `${fa(Math.round((totalExpenses(featured) / featured.budget) * 100))}٪ از بودجه`
                  : 'بودجه تعیین نشده'}
              </span>
              <span>
                {featured.budget
                  ? `${money(Math.max(0, featured.budget - totalExpenses(featured)), featured.currency)} باقی‌مانده`
                  : 'هر وقت خواستی بودجه تعیین کن'}
              </span>
            </div>
            <ProgressBar
              value={featured.budget ? (totalExpenses(featured) / featured.budget) * 100 : 0}
              label="مصرف بودجه"
            />
            <Link className="wallet-link" href={`/trips/${featured.id}?tab=settlements`}>
              <ArrowLeftRight size={16} />
              {suggestSettlements(featured).length
                ? `${fa(suggestSettlements(featured).length)} پیشنهاد برای تسویه حساب`
                : 'همه حساب‌ها صاف است'}
              <ArrowUpLeft size={14} style={{ marginInlineStart: 'auto' }} />
            </Link>
          </Card>
        </div>
      )}
    </>
  );
}
function Stat({
  icon,
  label,
  value,
  caption,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  caption: string;
  highlight?: boolean;
}) {
  return (
    <Card className={cn('stat-card', highlight && 'accent-stat')}>
      <div className="stat-card-top">
        <span>{label}</span>
        {icon}
      </div>
      <div className="stat-card-bottom">
        <strong>{value}</strong>
        <small>{caption}</small>
      </div>
    </Card>
  );
}
export function FeaturedTrip({ trip }: { trip: Trip }) {
  return (
    <div className="featured-trip">
      <img
        className="featured-trip-image"
        src={trip.cover}
        alt="منظره کاور سفر"
        fetchPriority="high"
      />
      <div className="featured-top">
        <div className="featured-label">
          <i />
          {tripStatus(trip.startDate, trip.endDate) === 'active'
            ? 'همین حالا در سفر'
            : 'نزدیک‌ترین سفر تو'}
        </div>
        <span className="photo-chip">
          <Clock3 size={12} />
          {countdown(trip.startDate)}
        </span>
      </div>
      <div className="featured-copy">
        <p className="photo-caption">کمی دورتر از روزمرگی</p>
        <h2>{trip.title}</h2>
        <p>
          <MapPin size={13} />
          {trip.destination}
        </p>
      </div>
      <div className="featured-details">
        <span className="featured-detail">
          <CalendarDays size={15} />
          {dateRange(trip.startDate, trip.endDate)}
        </span>
        <span className="featured-detail day-count">
          {fa(tripDays(trip.startDate, trip.endDate))} روز
        </span>
        <AvatarGroup members={trip.members} size={27} />
        <Link
          href={`/trips/${trip.id}`}
          className="featured-link"
          onClick={() => useTripStore.getState().setActiveTrip(trip.id)}
        >
          بریم سراغ سفر
          <ArrowUpLeft size={15} />
        </Link>
      </div>
    </div>
  );
}
function Readiness({ trip }: { trip: Trip }) {
  const items = trip.checklist,
    done = items.filter((i) => i.done).length,
    percent = items.length ? (done / items.length) * 100 : 0,
    identity = useIdentity(trip.id),
    editable = canEdit(roleFor(trip, identity.id), 'checklist'),
    toast = useToast();
  const quick = [...items.filter((i) => !i.done), ...items.filter((i) => i.done)].slice(0, 3);
  return (
    <Card className="readiness-card">
      <div className="readiness-heading">
        <h2>برای رفتن آماده‌ای؟</h2>
        <Backpack size={19} />
      </div>
      <div className="readiness-status">
        <ProgressRing value={percent} size={88} stroke={4} />
        <div>
          <strong>{percent === 100 ? 'همه‌چیز آماده‌ست!' : 'چند قدم تا راه افتادن'}</strong>
          <small>
            {fa(done)} از {fa(items.length)} وسیله آماده شده
          </small>
        </div>
      </div>
      <div className="quick-checklist">
        {quick.map((i) => (
          <div key={i.id} className={cn('quick-check-row', i.done && 'completed')}>
            <button
              className={cn('check-control', i.done && 'checked')}
              aria-label={`${i.done ? 'برداشتن تیک' : 'آماده کردن'} ${i.name}`}
              aria-pressed={i.done}
              disabled={!editable}
              onClick={() => {
                try {
                  useTripStore.getState().toggleChecklist(trip.id, i.id);
                } catch {
                  toast('اجازه ویرایش وسایل را ندارید.', 'error');
                }
              }}
            >
              {i.done && <Check size={13} strokeWidth={3} />}
            </button>
            <span>{i.name}</span>
          </div>
        ))}
      </div>
      <div className="readiness-bottom">
        <span>یک کیف سبک، خیالِ راحت.</span>
        <TextLink href={`/trips/${trip.id}?tab=checklist`}>کیف سفر</TextLink>
      </div>
    </Card>
  );
}
