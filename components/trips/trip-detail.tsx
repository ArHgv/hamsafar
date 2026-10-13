'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  CalendarDays,
  MapPin,
  Users,
  Clock3,
  LayoutGrid,
  Backpack,
  Wallet,
  ArrowLeftRight,
  Map,
  Route,
  Pencil,
  Share2,
  Trash2,
  Archive,
  Download,
  MapPinned,
  ArrowUpLeft,
  Check,
  Car,
} from 'lucide-react';
import type { Trip } from '@/lib/types';
import { useCurrentTrip, useTripPermission } from '@/hooks/use-trip';
import { useTripStore } from '@/store/use-trip-store';
import { useToast } from '@/store/use-ui-store';
import { dateRange, fullDate, tripDays, tripStatus, statusLabel } from '@/lib/dates';
import { money, suggestSettlements, totalExpenses } from '@/lib/money';
import { cn, downloadJSON, fa } from '@/lib/utils';
import { deleteCloudTrip } from '@/lib/cloud';
import { FeatureComponents, type Feature } from '../features/feature-page';
import { ShareDialog } from '../features/group-board';
import { TransportBoard } from '../features/transport-board';
import { TransportIcons } from '../features/transport-fields';
import {
  AvatarGroup,
  Badge,
  Button,
  Card,
  EmptyState,
  NewTripLink,
  ProgressBar,
  ProgressRing,
  SectionHeading,
  TextLink,
} from '../ui/primitives';
import { ConfirmDialog } from '../ui/dialog';
import { ActionsMenu } from '../ui/actions-menu';
import { EditTripDialog } from './edit-trip';
const tabs = [
  { key: 'overview', title: 'نمای سفر', icon: LayoutGrid },
  { key: 'planning', title: 'برنامه', icon: CalendarDays },
  { key: 'checklist', title: 'کیف سفر', icon: Backpack },
  { key: 'expenses', title: 'هزینه‌ها', icon: Wallet },
  { key: 'settlements', title: 'تسویه', icon: ArrowLeftRight },
  { key: 'locations', title: 'مکان‌ها', icon: Map },
  { key: 'groups', title: 'هم‌سفرها', icon: Users },
  { key: 'transport', title: 'مسیر و بلیط', icon: Route },
];
export function TripDetail() {
  const { id } = useParams<{ id: string }>(),
    trip = useCurrentTrip(id),
    search = useSearchParams(),
    raw = search.get('tab') || 'overview',
    tab = tabs.some((t) => t.key === raw) ? raw : 'overview';
  const setActive = useTripStore((s) => s.setActiveTrip);
  useEffect(() => {
    if (trip) setActive(trip.id);
  }, [trip?.id, setActive]);
  if (!trip)
    return (
      <EmptyState
        icon={<MapPinned size={28} />}
        title="این سفر را پیدا نکردیم."
        description="ممکن است سفر حذف شده باشد یا در حساب دیگری ذخیره شده باشد."
        action={
          <Link className="button button-primary" href="/trips">
            دیدن سفرهای من
          </Link>
        }
      />
    );
  return <TripDetailContent trip={trip} tab={tab} />;
}
function TripDetailContent({ trip, tab }: { trip: Trip; tab: string }) {
  const router = useRouter(),
    toast = useToast(),
    editable = useTripPermission(trip, 'info'),
    [editing, setEditing] = useState(false),
    [sharing, setSharing] = useState(false),
    [deleting, setDeleting] = useState(false),
    cloudIds = useTripStore((s) => s.cloudTripIds);
  const Component = FeatureComponents[tab as Feature];
  return (
    <>
      <div className="trip-detail-hero">
        <img src={trip.cover} alt={`کاور ${trip.title}`} />
        <div className="detail-hero-top">
          <Link href="/trips" className="detail-back">
            <ArrowRight size={16} />
            سفرهای من
          </Link>
          {editable && (
            <ActionsMenu
              label="مدیریت سفر"
              items={[
                { label: 'ویرایش جزئیات', icon: Pencil, onClick: () => setEditing(true) },
                {
                  label: 'خروجی اطلاعات سفر',
                  icon: Download,
                  onClick: () => {
                    downloadJSON(
                      { version: 1, trips: [trip], exportedAt: new Date().toISOString() },
                      'hamsafar-trip.json',
                    );
                    toast('خروجی اطلاعات آماده شد؛ فایل‌های پیوست در خروجی نیستند.', 'info');
                  },
                },
                {
                  label: trip.archived ? 'بازگرداندن از بایگانی' : 'بایگانی سفر',
                  icon: Archive,
                  onClick: () => {
                    useTripStore
                      .getState()
                      .updateTrip(trip.id, { archived: !trip.archived }, ['info']);
                    toast(
                      trip.archived
                        ? 'سفر از بایگانی برگشت.'
                        : 'سفر بایگانی شد؛ در تنظیمات قابل دسترسی است.',
                    );
                    router.push('/trips');
                  },
                },
                {
                  label: 'حذف سفر',
                  icon: Trash2,
                  onClick: () => setDeleting(true),
                  destructive: true,
                },
              ]}
            />
          )}
        </div>
        <div className="detail-hero-bottom">
          <div>
            <div className="detail-hero-label">
              <Badge>{statusLabel[tripStatus(trip.startDate, trip.endDate)]}</Badge>
              <span>{trip.members.length > 1 ? 'یک سفر گروهی' : 'یک سفر برای خودت'}</span>
            </div>
            <h1>{trip.title}</h1>
            <p>
              <MapPin size={14} />
              {trip.destination}
              <span className="detail-meta-separator">·</span>
              <CalendarDays size={14} />
              {dateRange(trip.startDate, trip.endDate)}
              <span className="detail-meta-separator">·</span>
              {fa(tripDays(trip.startDate, trip.endDate))} روز
            </p>
          </div>
          <div className="detail-hero-actions">
            <AvatarGroup members={trip.members} size={33} />
            {editable && (
              <button className="photo-chip" onClick={() => setSharing(true)}>
                <Share2 size={14} />
                دعوت به سفر
              </button>
            )}
          </div>
        </div>
      </div>
      <nav className="trip-tabs" aria-label="بخش‌های این سفر">
        {tabs.map(({ key, title, icon: Icon }) => (
          <Link
            key={key}
            href={`/trips/${trip.id}?tab=${key}`}
            scroll={false}
            className={cn('trip-tab', tab === key && 'active')}
            aria-current={tab === key ? 'page' : undefined}
          >
            <Icon size={16} />
            {title}
          </Link>
        ))}
      </nav>
      <div className="trip-tab-content" key={tab}>
        {tab === 'overview' ? (
          <Overview trip={trip} onEdit={() => setEditing(true)} editable={editable} />
        ) : tab === 'transport' ? (
          <TransportBoard trip={trip} />
        ) : Component ? (
          <Component trip={trip} />
        ) : null}
      </div>
      <EditTripDialog trip={trip} open={editing} onOpenChange={setEditing} />
      <ShareDialog trip={trip} open={sharing} onOpenChange={setSharing} />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="این سفر حذف شود؟"
        description="برنامه‌ها، هزینه‌ها و اطلاعات این سفر حذف می‌شوند. در حالت ابری، دسترسی همه اعضا نیز قطع می‌شود."
        label="حذف کامل سفر"
        onConfirm={async () => {
          if (cloudIds.includes(trip.id)) await deleteCloudTrip(trip.id);
          useTripStore.getState().deleteTrip(trip.id);
          toast('سفر حذف شد.');
          router.push('/trips');
        }}
      />
    </>
  );
}
function Overview({
  trip,
  onEdit,
  editable,
}: {
  trip: Trip;
  onEdit: () => void;
  editable: boolean;
}) {
  const spent = totalExpenses(trip),
    ready = trip.checklist.length
      ? (trip.checklist.filter((i) => i.done).length / trip.checklist.length) * 100
      : 0,
    leg = trip.transport.outbound,
    Icon = TransportIcons[trip.transport.mode];
  return (
    <>
      <div className="overview-intro">
        <div>
          <h2>این سفر، در یک نگاه.</h2>
          <p>{trip.description || 'برای تجربه‌های خوب، لازم نیست همه‌چیز از قبل معلوم باشد.'}</p>
        </div>
        {editable && (
          <Button variant="ghost" size="small" onClick={onEdit}>
            <Pencil size={14} />
            ویرایش جزئیات
          </Button>
        )}
      </div>
      <div className="overview-quick-links">
        {[
          {
            label: 'برنامه‌های سفر',
            value: `${fa(trip.activities.length)} برنامه`,
            icon: CalendarDays,
            tab: 'planning',
          },
          {
            label: 'کیف سفر',
            value: `${fa(Math.round(ready))}٪ آماده`,
            icon: Backpack,
            tab: 'checklist',
          },
          {
            label: 'مکان‌های ذخیره‌شده',
            value: `${fa(trip.locations.length)} نشانی`,
            icon: MapPin,
            tab: 'locations',
          },
          {
            label: 'تسویه حساب',
            value: `${fa(suggestSettlements(trip).length)} پرداخت باقی‌مانده`,
            icon: ArrowLeftRight,
            tab: 'settlements',
          },
        ].map(({ label, value, icon: I, tab }) => (
          <Link key={tab} href={`/trips/${trip.id}?tab=${tab}`} className="overview-quick-link">
            <I size={20} />
            <div>
              <small>{label}</small>
              <strong>{value}</strong>
            </div>
            <ArrowUpLeft size={15} />
          </Link>
        ))}
      </div>
      <div className="trip-overview-grid">
        <Card className="overview-route">
          <SectionHeading
            title="راه می‌افتیم، به سمتِ خاطره."
            action={<TextLink href={`/trips/${trip.id}?tab=transport`}>جزئیات مسیر</TextLink>}
          />
          <p className="card-eyebrow">{fullDate(trip.startDate)}</p>
          <div className="overview-route-line">
            <div>
              <strong>{leg.origin || 'مبدأ مشخص نشده'}</strong>
              <span dir="ltr">{leg.departureTime ? fa(leg.departureTime) : 'ساعت اختیاری'}</span>
            </div>
            <div className="route-dashes">
              <span />
              <Icon size={24} />
              <span />
            </div>
            <div>
              <strong>{leg.destination || trip.destination}</strong>
              <span dir="ltr">{leg.arrivalTime ? fa(leg.arrivalTime) : 'ساعت اختیاری'}</span>
            </div>
          </div>
          <div className="overview-route-foot">
            <span>
              <Users size={14} />
              {fa(trip.members.length)} نفر، یک مقصد
            </span>
            <span>برگشت {dateRange(trip.endDate, trip.endDate).replace(/ تا \S+/, '')}</span>
          </div>
        </Card>
        <Card className="overview-budget">
          <SectionHeading
            title="کیف پولِ این سفر"
            action={<TextLink href={`/trips/${trip.id}?tab=expenses`}>هزینه‌ها</TextLink>}
          />
          <strong>{money(spent, trip.currency)}</strong>
          <p>هزینه‌های ثبت‌شده</p>
          <ProgressBar value={trip.budget ? (spent / trip.budget) * 100 : 0} label="بودجه سفر" />
          <div>
            <span>بودجه</span>
            <span>{trip.budget ? money(trip.budget, trip.currency) : 'هنوز تعیین نشده'}</span>
          </div>
        </Card>
        <Card className="overview-plan">
          <SectionHeading
            title="قرارهای نزدیک"
            action={<TextLink href={`/trips/${trip.id}?tab=planning`}>برنامه روزها</TextLink>}
          />
          {[...trip.activities]
            .filter((a) => a.status !== 'cancelled')
            .sort((a, b) => `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`))
            .slice(0, 3)
            .map((a) => (
              <Link href={`/trips/${trip.id}?tab=planning`} className="compact-activity" key={a.id}>
                <span className="activity-time">{a.time ? fa(a.time) : 'آزاد'}</span>
                <div>
                  <strong>{a.title}</strong>
                  <small>
                    {dateRange(a.date, a.date).replace(/ تا \S+/, '')} · {fa(a.duration)} دقیقه
                  </small>
                </div>
                <ArrowUpLeft
                  size={15}
                  style={{ marginInlineStart: 'auto', color: 'var(--soft)' }}
                />
              </Link>
            ))}
          {!trip.activities.length && (
            <div className="overview-empty">
              <CalendarDays size={24} />
              <p>اولین قرارِ این سفر را هنوز نچیده‌ای.</p>
              <TextLink href={`/trips/${trip.id}?tab=planning`}>برنامه اولین روز</TextLink>
            </div>
          )}
        </Card>
        <Card className="overview-packing">
          <SectionHeading
            title="کیف سفر، چقدر آماده‌ست؟"
            action={<TextLink href={`/trips/${trip.id}?tab=checklist`}>وسایل</TextLink>}
          />
          <div>
            <ProgressRing value={ready} size={91} />
            <div>
              <strong>{fa(trip.checklist.filter((i) => i.done).length)} وسیله آماده</strong>
              <small>{fa(trip.checklist.filter((i) => !i.done).length)} وسیله هنوز مانده</small>
              <p>سبک ببند، با خیال راحت برو.</p>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
