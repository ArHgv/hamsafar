'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  MapPinned,
  MapPin,
  Plus,
  Navigation,
  LocateFixed,
  Pencil,
  Trash2,
  Search,
  ArrowUpLeft,
  Hotel,
  Utensils,
  Plane,
  TrainFront,
  Bus,
  Fuel,
  ParkingCircle,
  Hospital,
  Landmark,
  Compass,
  Info,
  X,
  LockKeyhole,
} from 'lucide-react';
import type { SavedLocation, Trip } from '@/lib/types';
import { LOCATION_LABELS } from '@/lib/constants';
import { locationSchema } from '@/lib/schemas';
import { haversineKm } from '@/lib/money';
import { cn, fa, normalizeDigits, uid } from '@/lib/utils';
import { useTripPermission } from '@/hooks/use-trip';
import { useTripStore } from '@/store/use-trip-store';
import { useToast } from '@/store/use-ui-store';
import { Badge, Button, Card, EmptyState, Field, Input, Select, Textarea } from '../ui/primitives';
import { ConfirmDialog, Dialog } from '../ui/dialog';
import { NumericInput } from '../ui/numeric-input';
import { ActionsMenu } from '../ui/actions-menu';
const MapView = dynamic(() => import('./map-view').then((m) => m.MapView), {
  ssr: false,
  loading: () => (
    <div className="map-loading">
      <MapPinned size={25} />
      <p>آماده‌سازی نقشه…</p>
    </div>
  ),
});
const locationIcons = {
  stay: Hotel,
  restaurant: Utensils,
  airport: Plane,
  station: TrainFront,
  terminal: Bus,
  fuel: Fuel,
  parking: ParkingCircle,
  hospital: Hospital,
  atm: Landmark,
  sight: Compass,
};
export function LocationsBoard({ trip }: { trip: Trip }) {
  const [selectedId, setSelected] = useState<string | undefined>(undefined),
    [adding, setAdding] = useState(false),
    [editing, setEditing] = useState<SavedLocation | null>(null),
    [draft, setDraft] = useState<SavedLocation | undefined>(undefined),
    [deleting, setDeleting] = useState<SavedLocation | null>(null),
    [picking, setPicking] = useState(false),
    [query, setQuery] = useState(''),
    [category, setCategory] = useState('all'),
    [geo, setGeo] = useState<{ latitude: number; longitude: number } | null>(null),
    [locating, setLocating] = useState(false),
    [travelMode, setTravelMode] = useState('driving');
  const editable = useTripPermission(trip, 'locations'),
    toast = useToast(),
    selected = trip.locations.find((l) => l.id === selectedId);
  useEffect(() => {
    setSelected(undefined);
    setCategory('all');
    setQuery('');
    setGeo(null);
    setPicking(false);
    setDraft(undefined);
  }, [trip.id]);
  const items = trip.locations.filter(
    (l) =>
      (category === 'all' || l.category === category) &&
      `${l.name} ${l.address || ''}`.includes(query.trim()),
  );
  const origin =
    geo ||
    trip.locations.find((l) => l.category === 'stay' && l.id !== selectedId) ||
    trip.locations.find((l) => l.id !== selectedId);
  const distance = selected && origin ? haversineKm(origin, selected) : 0,
    estimate = Math.max(1, Math.ceil((distance / (travelMode === 'walking' ? 4.5 : 40)) * 60));
  const directions = selected
    ? origin
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${selected.latitude},${selected.longitude}&travelmode=${travelMode}`
      : selected.googleMapsUrl ||
        `https://www.google.com/maps/search/?api=1&query=${selected.latitude},${selected.longitude}`
    : '';
  const locate = () => {
    if (!navigator.geolocation) {
      toast('این مرورگر از تعیین موقعیت پشتیبانی نمی‌کند.', 'error');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setGeo({ latitude: p.coords.latitude, longitude: p.coords.longitude });
        setLocating(false);
        toast('مبدأ مسیریابی، موقعیت فعلی تو شد.');
      },
      (e) => {
        setLocating(false);
        toast(
          e.code === 1
            ? 'اجازه موقعیت داده نشده؛ می‌توانی از نشانی اقامتگاه استفاده کنی.'
            : 'موقعیت دریافت نشد؛ دوباره تلاش کن.',
          'error',
        );
      },
      { timeout: 12000, maximumAge: 60000 },
    );
  };
  return (
    <>
      <div className="feature-toolbar">
        <div className="feature-header">
          <MapPinned size={19} className="accent" />
          <div>
            <h2>نشانی‌های خوب را گم نکن.</h2>
            <p className="card-eyebrow">{fa(trip.locations.length)} مکان، برای راه‌های تازه</p>
          </div>
        </div>
        {editable ? (
          <Button
            variant="primary"
            onClick={() => {
              setDraft(undefined);
              setAdding(true);
            }}
          >
            <Plus size={17} />
            ثبت مکان
          </Button>
        ) : (
          <span className="readonly-note">
            <LockKeyhole size={13} />
            دسترسی مشاهده
          </span>
        )}
      </div>
      <div className="locations-layout">
        <Card className="map-card">
          <MapView
            key={trip.id}
            locations={items}
            selectedId={selectedId}
            onSelect={setSelected}
            picking={picking}
            onPick={(latitude, longitude) => {
              setDraft({
                id: draft?.id || uid(),
                name: draft?.name || '',
                category: draft?.category || 'sight',
                address: draft?.address,
                notes: draft?.notes,
                latitude,
                longitude,
              });
              setPicking(false);
              setAdding(true);
            }}
          />
          <div className="map-top-controls">
            <span className="map-place-label">
              <MapPin size={13} />
              {trip.destination}
            </span>
            <Button
              size="icon"
              aria-label="مسیریابی از موقعیت فعلی من"
              onClick={locate}
              loading={locating}
            >
              <LocateFixed size={18} />
            </Button>
          </div>
          {picking && (
            <div className="map-picking-banner">
              <MapPin size={16} />
              <span>برای انتخاب نشانی، روی نقشه بزن.</span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setPicking(false)}
                aria-label="لغو انتخاب روی نقشه"
              >
                <X size={16} />
              </Button>
            </div>
          )}
          {selected && !picking && (
            <div className="map-info-card">
              <button
                className="map-info-close"
                onClick={() => setSelected(undefined)}
                aria-label="بستن جزئیات مکان"
              >
                <X size={15} />
              </button>
              <Badge tone="accent">{LOCATION_LABELS[selected.category]}</Badge>
              <h3>{selected.name}</h3>
              <p>{selected.address || 'نشانی متنی ثبت نشده'}</p>
              {origin && (
                <div className="route-estimate">
                  <span>{fa(distance.toFixed(1))} کیلومتر فاصله مستقیم</span>
                  <span>حدود {fa(estimate)} دقیقه</span>
                </div>
              )}
              <div className="map-directions-row">
                <a
                  className="button button-primary button-small"
                  href={directions}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Navigation size={15} />
                  مسیریابی در گوگل‌مپ
                  <ArrowUpLeft size={13} />
                </a>
                <select
                  aria-label="روش مسیریابی"
                  value={travelMode}
                  onChange={(e) => setTravelMode(e.target.value)}
                >
                  <option value="driving">با ماشین</option>
                  <option value="walking">پیاده</option>
                </select>
              </div>
              {origin && (
                <small>
                  مبدأ: {geo ? 'موقعیت فعلی تو' : (origin as SavedLocation).name} · زمان، برآورد
                  مسیر مستقیم است؛ نه مسیر واقعی.
                </small>
              )}
              {selected.notes && <p className="map-location-note">{selected.notes}</p>}
            </div>
          )}
        </Card>
        <aside className="locations-list" aria-label="فهرست مکان‌ها">
          <div className="location-list-filters">
            <div className="filter-search">
              <Search size={15} />
              <Input
                aria-label="جست‌وجوی مکان"
                placeholder="نام یا نشانی یک مکان…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Select
              aria-label="دسته مکان‌ها"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">همه نشانی‌ها</option>
              {Object.entries(LOCATION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          {items.map((l) => {
            const Icon = locationIcons[l.category];
            return (
              <Card className={cn('location-card', l.id === selectedId && 'selected')} key={l.id}>
                <button className="location-card-main" onClick={() => setSelected(l.id)}>
                  <span className="location-card-icon">
                    <Icon size={18} />
                  </span>
                  <div>
                    <strong>{l.name}</strong>
                    <small>{LOCATION_LABELS[l.category]}</small>
                  </div>
                </button>
                {editable && (
                  <ActionsMenu
                    label={`گزینه‌های ${l.name}`}
                    items={[
                      {
                        label: 'ویرایش مکان',
                        icon: Pencil,
                        onClick: () => {
                          setDraft(undefined);
                          setEditing(l);
                        },
                      },
                      {
                        label: 'حذف مکان',
                        icon: Trash2,
                        onClick: () => setDeleting(l),
                        destructive: true,
                      },
                    ]}
                  />
                )}
                {l.address && <p>{l.address}</p>}
                <div className="location-quick-links">
                  <a
                    className="location-quick-link"
                    target="_blank"
                    rel="noopener noreferrer"
                    href={`https://www.google.com/maps/dir/?api=1&destination=${l.latitude},${l.longitude}`}
                  >
                    <Navigation size={12} />
                    مسیریابی در گوگل‌مپ
                    <ArrowUpLeft size={12} />
                  </a>
                  <a
                    className="location-quick-link"
                    target="_blank"
                    rel="noopener noreferrer"
                    href={`https://neshan.org/maps/@${l.latitude},${l.longitude},16z`}
                  >
                    باز کردن در نشان
                    <ArrowUpLeft size={12} />
                  </a>
                </div>
              </Card>
            );
          })}
          {!items.length && (
            <Card className="no-locations">
              <MapPin size={25} />
              <h3>هنوز نشانی‌ای اینجا نیست.</h3>
              <p>
                {query || category !== 'all'
                  ? 'جست‌وجو یا دسته‌بندی را تغییر بده.'
                  : 'اقامتگاه یا اولین جایی که می‌خواهی ببینی را ذخیره کن.'}
              </p>
              {editable && !trip.locations.length && (
                <Button size="small" onClick={() => setAdding(true)}>
                  <Plus size={14} />
                  اولین نشانی
                </Button>
              )}
            </Card>
          )}
        </aside>
      </div>
      <div className="map-caption">
        <Info size={14} />
        <p>
          تصویر نقشه آنلاین است. فاصله‌ها مستقیم و زمان‌ها تقریبی‌اند؛ برای مسیر دقیق از مسیریابی
          استفاده کن. مختصات مکان‌های نمونه را پیش از سفر تأیید کن.
        </p>
      </div>
      <LocationDialog
        trip={trip}
        location={draft || editing || undefined}
        open={adding || !!editing}
        onOpenChange={(v) => {
          if (!v) {
            setAdding(false);
            setEditing(null);
            setDraft(undefined);
          }
        }}
        onPickRequest={(value) => {
          setDraft(value);
          setAdding(false);
          setEditing(null);
          setPicking(true);
          toast('روی نقطه موردنظر در نقشه بزن.', 'info');
        }}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => {
          if (!v) setDeleting(null);
        }}
        title="این نشانی حذف شود؟"
        description={deleting?.name || ''}
        onConfirm={() => {
          if (deleting) {
            useTripStore.getState().removeEntity(trip.id, 'locations', deleting.id);
            if (deleting.id === selectedId) setSelected(undefined);
            toast('نشانی حذف شد.');
          }
        }}
      />
    </>
  );
}
function LocationDialog({
  trip,
  location,
  open,
  onOpenChange,
  onPickRequest,
}: {
  trip: Trip;
  location?: SavedLocation;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPickRequest: (v: SavedLocation) => void;
}) {
  const toast = useToast();
  const {
    register,
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<SavedLocation>({ resolver: zodResolver(locationSchema) });
  useEffect(() => {
    if (open)
      reset(
        location || {
          id: uid(),
          name: '',
          category: 'sight',
          latitude: trip.locations[0]?.latitude || 35.6892,
          longitude: trip.locations[0]?.longitude || 51.389,
          address: '',
          notes: '',
        },
      );
  }, [open, location, trip.id, reset]);
  const values = watch(),
    isExisting = location && trip.locations.some((l) => l.id === location.id);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isExisting ? 'ویرایش نشانی' : 'یک نشانی تازه'}
      description="نشانی را روی نقشه انتخاب کن یا مختصات دقیقش را بنویس."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>انصراف</Button>
          <Button form="location-form" type="submit" variant="primary">
            {isExisting ? 'ذخیره تغییرات' : 'ذخیره مکان'}
          </Button>
        </>
      }
    >
      <form
        id="location-form"
        onSubmit={handleSubmit((value) => {
          try {
            useTripStore.getState().saveEntity(trip.id, 'locations', value);
            toast('نشانی روی نقشه ذخیره شد.');
            onOpenChange(false);
          } catch {
            toast('نشانی ذخیره نشد؛ مختصات و دسترسی را بررسی کن.', 'error');
          }
        })}
      >
        <div className="form-grid">
          <Field label="نام مکان" id="location-name" required error={errors.name?.message}>
            <Input
              id="location-name"
              autoFocus
              placeholder="مثلاً کلبه جنگلی"
              {...register('name')}
              maxLength={150}
            />
          </Field>
          <Field label="دسته‌بندی" id="location-category">
            <Select id="location-category" {...register('category')}>
              {Object.entries(LOCATION_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="عرض جغرافیایی"
            id="location-latitude"
            required
            error={errors.latitude?.message}
          >
            <NumericInput
              id="location-latitude"
              dir="ltr"
              value={values.latitude}
              onValueChange={(value) =>
                setValue('latitude', value ?? NaN, { shouldValidate: true })
              }
            />
          </Field>
          <Field
            label="طول جغرافیایی"
            id="location-longitude"
            required
            error={errors.longitude?.message}
          >
            <NumericInput
              id="location-longitude"
              dir="ltr"
              value={values.longitude}
              onValueChange={(value) =>
                setValue('longitude', value ?? NaN, { shouldValidate: true })
              }
            />
          </Field>
          <div className="full">
            <Button
              type="button"
              onClick={() =>
                onPickRequest({
                  ...values,
                  latitude: Number.isFinite(values.latitude) ? values.latitude : 35.6892,
                  longitude: Number.isFinite(values.longitude) ? values.longitude : 51.389,
                })
              }
            >
              <MapPinned size={16} />
              انتخاب روی نقشه
            </Button>
            <p className="field-hint" style={{ marginTop: 8 }}>
              بدون انتخاب نقطه، مختصات پیش‌فرض محل فعلی نقشه استفاده می‌شود؛ آن را تأیید یا اصلاح
              کن.
            </p>
          </div>
          <Field label="نشانی کامل" id="location-address" optional className="full">
            <Input
              id="location-address"
              placeholder="شهر، خیابان و جزئیات دسترسی"
              {...register('address')}
              maxLength={3000}
            />
          </Field>
          <Field label="یادداشت" id="location-notes" optional className="full">
            <Textarea
              id="location-notes"
              placeholder="ساعت بازدید، رزرو یا نکته‌ای برای دسترسی…"
              {...register('notes')}
              maxLength={3000}
            />
          </Field>
        </div>
      </form>
    </Dialog>
  );
}
