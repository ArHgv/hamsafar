'use client';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CalendarDays,
  Plus,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  MapPin,
  Clock3,
  Check,
  Pencil,
  Trash2,
  Ban,
  Utensils,
  Car,
  Compass,
  Coffee,
  Circle,
  LockKeyhole,
  ArrowUpLeft,
} from 'lucide-react';
import type { Activity, DayPeriod, Trip } from '@/lib/types';
import { PERIOD_LABELS, ACTIVITY_LABELS } from '@/lib/constants';
import { activitySchema } from '@/lib/schemas';
import { enumerateDays, fullDate, formatDate, dateToJalali } from '@/lib/dates';
import { cn, fa, normalizeDigits, uid } from '@/lib/utils';
import { useTripPermission } from '@/hooks/use-trip';
import { useTripStore } from '@/store/use-trip-store';
import { useToast } from '@/store/use-ui-store';
import {
  Button,
  Card,
  Badge,
  Field,
  Input,
  Select,
  Textarea,
  EmptyState,
  SectionHeading,
} from '../ui/primitives';
import { DatePicker, TimePicker } from '../ui/date-picker';
import { ConfirmDialog, Dialog } from '../ui/dialog';
import { ActionsMenu } from '../ui/actions-menu';
const periodIcons = { morning: Sunrise, noon: Sun, afternoon: Sunset, night: Moon };
const kindIcons = {
  sight: MapPin,
  food: Utensils,
  experience: Compass,
  transport: Car,
  rest: Coffee,
};
export function PlanningBoard({ trip }: { trip: Trip }) {
  const [day, setDay] = useState(trip.startDate),
    [period, setPeriod] = useState('all'),
    [editing, setEditing] = useState<Activity | null>(null),
    [adding, setAdding] = useState(false),
    [deleting, setDeleting] = useState<Activity | null>(null),
    [viewing, setViewing] = useState<Activity | null>(null);
  const editable = useTripPermission(trip, 'activities'),
    toast = useToast(),
    days = enumerateDays(trip.startDate, trip.endDate);
  useEffect(() => {
    setDay(trip.startDate);
    setPeriod('all');
  }, [trip.id, trip.startDate]);
  const activities = trip.activities
    .filter((a) => a.date === day)
    .sort((a, b) => (a.time || '23:59').localeCompare(b.time || '23:59'));
  const changeStatus = (a: Activity, status: Activity['status']) => {
    try {
      useTripStore.getState().saveEntity(trip.id, 'activities', { ...a, status });
    } catch {
      toast('اجازه ویرایش برنامه را ندارید.', 'error');
    }
  };
  return (
    <>
      <div className="feature-toolbar">
        <div className="feature-header">
          <CalendarDays size={18} className="accent" />
          <div>
            <h2>برای لحظه‌های خوب، جا بگذار.</h2>
            <p className="card-eyebrow">
              {fa(trip.activities.length)} برنامه در {fa(days.length)} روز سفر
            </p>
          </div>
        </div>
        {editable ? (
          <Button variant="primary" onClick={() => setAdding(true)}>
            <Plus size={17} />
            افزودن برنامه
          </Button>
        ) : (
          <span className="readonly-note">
            <LockKeyhole size={13} />
            دسترسی مشاهده
          </span>
        )}
      </div>
      <div className="day-strip" aria-label="روزهای سفر">
        {days.map((d, i) => {
          const j = dateToJalali(d),
            n = trip.activities.filter((a) => a.date === d).length;
          return (
            <button
              key={d}
              onClick={() => setDay(d)}
              className={cn('day-tile', d === day && 'active')}
              aria-pressed={d === day}
            >
              <span>{formatDate(d, { weekday: 'short', day: undefined, month: undefined })}</span>
              <strong>{fa(j.jd)}</strong>
              <small>روز {fa(i + 1)}</small>
              <i className={n > 0 ? 'has-events' : ''} />
            </button>
          );
        })}
      </div>
      <div className="plan-layout">
        <div>
          <div className="day-heading">
            <div>
              <h2>{fullDate(day)}</h2>
              <p>
                {fa(activities.length)} برنامه ·{' '}
                {fa(activities.filter((a) => a.status === 'done').length)} انجام‌شده
              </p>
            </div>
            <div className="period-filters">
              <button
                className={cn('chip', period === 'all' && 'active')}
                onClick={() => setPeriod('all')}
              >
                کل روز
              </button>
              {Object.entries(PERIOD_LABELS).map(([k, label]) => (
                <button
                  key={k}
                  className={cn('chip', period === k && 'active')}
                  onClick={() => setPeriod(k)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {Object.entries(PERIOD_LABELS)
            .filter(([p]) => period === 'all' || period === p)
            .map(([p, label]) => {
              const items = activities.filter((a) => a.period === p);
              if (!items.length) return null;
              const Icon = periodIcons[p as DayPeriod];
              return (
                <section className="period-section" key={p}>
                  <div className="period-heading">
                    <Icon size={17} />
                    <h3>{label}</h3>
                    <span>{fa(items.length)} برنامه</span>
                    <div />
                  </div>
                  <div className="timeline">
                    {items.map((a) => {
                      const Kind = kindIcons[a.kind];
                      return (
                        <div
                          className={cn(
                            'timeline-item',
                            a.status === 'done' && 'done',
                            a.status === 'cancelled' && 'cancelled',
                          )}
                          key={a.id}
                        >
                          <div className="timeline-time">
                            <span dir="ltr">{a.time ? fa(a.time) : 'آزاد'}</span>
                            <i />
                          </div>
                          <Card className="activity-card">
                            <div className="activity-card-main">
                              <span className="activity-kind-icon">
                                <Kind size={19} />
                              </span>
                              <div className="activity-text">
                                <button
                                  className="activity-title"
                                  onClick={() => (editable ? setEditing(a) : setViewing(a))}
                                >
                                  {a.title}
                                </button>
                                <div className="activity-meta">
                                  <span>
                                    <Clock3 size={12} />
                                    {fa(a.duration)} دقیقه
                                  </span>
                                  <span>{ACTIVITY_LABELS[a.kind]}</span>
                                  {a.locationId && (
                                    <span>
                                      <MapPin size={12} />
                                      {trip.locations.find((l) => l.id === a.locationId)?.name}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="activity-controls">
                                {a.status === 'cancelled' ? (
                                  <Badge tone="danger">لغوشده</Badge>
                                ) : (
                                  <button
                                    className={cn(
                                      'activity-status-button',
                                      a.status === 'done' && 'completed',
                                    )}
                                    disabled={!editable}
                                    onClick={() =>
                                      changeStatus(a, a.status === 'done' ? 'pending' : 'done')
                                    }
                                    aria-label={`${a.status === 'done' ? 'در انتظار کردن' : 'انجام‌شده کردن'} ${a.title}`}
                                  >
                                    {a.status === 'done' ? (
                                      <Check size={16} />
                                    ) : (
                                      <Circle size={16} />
                                    )}
                                    <span>{a.status === 'done' ? 'انجام‌شده' : 'در انتظار'}</span>
                                  </button>
                                )}
                                {editable && (
                                  <ActionsMenu
                                    label={`گزینه‌های ${a.title}`}
                                    items={[
                                      {
                                        label: 'ویرایش برنامه',
                                        icon: Pencil,
                                        onClick: () => setEditing(a),
                                      },
                                      {
                                        label:
                                          a.status === 'cancelled'
                                            ? 'برگرداندن به برنامه'
                                            : 'لغو این برنامه',
                                        icon: Ban,
                                        onClick: () =>
                                          changeStatus(
                                            a,
                                            a.status === 'cancelled' ? 'pending' : 'cancelled',
                                          ),
                                      },
                                      {
                                        label: 'حذف برنامه',
                                        icon: Trash2,
                                        onClick: () => setDeleting(a),
                                        destructive: true,
                                      },
                                    ]}
                                  />
                                )}
                              </div>
                            </div>
                            {a.notes && <p className="activity-notes">{a.notes}</p>}
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          {!activities.filter((a) => period === 'all' || a.period === period).length && (
            <EmptyState
              icon={<Sunrise size={27} />}
              title="این بخش از روز، هنوز آزاد است"
              description="برای یک قهوه، یک مسیر تازه یا فقط کمی استراحت جا بگذار."
              action={
                editable && (
                  <Button onClick={() => setAdding(true)} variant="primary">
                    <Plus size={17} />
                    اولین برنامه این روز
                  </Button>
                )
              }
            />
          )}
        </div>
        <aside className="plan-aside">
          <Card className="travel-note">
            <span className="note-eyebrow">
              <Compass size={16} />
              حال‌وهوای سفر
            </span>
            <h3>{trip.title}</h3>
            <p>
              {trip.description ||
                'قرار نیست همه لحظه‌ها برنامه داشته باشند. گاهی بهترین خاطره، همان قرارِ از قبل نچیده است.'}
            </p>
            <div className="note-members">
              <span>{fa(trip.members.length)} هم‌سفر، یک داستان</span>
              <MapPin size={14} />
            </div>
          </Card>
          <Card className="plan-location-preview">
            <h3>نشانی‌های این روز</h3>
            {trip.locations
              .filter((l) => activities.some((a) => a.locationId === l.id))
              .map((l) => (
                <a
                  key={l.id}
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`https://www.google.com/maps/search/?api=1&query=${l.latitude},${l.longitude}`}
                >
                  <MapPin size={15} />
                  <span>{l.name}</span>
                  <ArrowUpLeft size={14} />
                </a>
              ))}
            {!activities.some((a) => a.locationId) && (
              <p>هنوز مکانی به برنامه‌های این روز پیوند نداده‌ای.</p>
            )}
          </Card>
        </aside>
      </div>
      <ActivityDialog
        open={adding || !!editing}
        onOpenChange={(v) => {
          if (!v) {
            setAdding(false);
            setEditing(null);
          }
        }}
        trip={trip}
        activity={editing || undefined}
        day={day}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => {
          if (!v) setDeleting(null);
        }}
        title="این برنامه حذف شود؟"
        description={deleting?.title || ''}
        onConfirm={() => {
          if (deleting) {
            useTripStore.getState().removeEntity(trip.id, 'activities', deleting.id);
            toast('برنامه حذف شد.');
          }
        }}
      />
      <Dialog
        open={!!viewing}
        onOpenChange={(v) => {
          if (!v) setViewing(null);
        }}
        title={viewing?.title || 'برنامه سفر'}
        description={
          viewing
            ? `${fullDate(viewing.date)} · ${viewing.time ? fa(viewing.time) : 'بدون ساعت مشخص'}`
            : ''
        }
      >
        <p className="muted">{viewing?.notes || 'برای این برنامه یادداشتی ثبت نشده.'}</p>
      </Dialog>
    </>
  );
}
function ActivityDialog({
  open,
  onOpenChange,
  trip,
  activity,
  day,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  trip: Trip;
  activity?: Activity;
  day: string;
}) {
  const toast = useToast();
  const {
    register,
    control,
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<Activity>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      id: '',
      title: '',
      date: day,
      duration: 60,
      kind: 'sight',
      period: 'morning',
      status: 'pending',
      notes: '',
      locationId: '',
      time: '',
    },
  });
  useEffect(() => {
    if (open)
      reset(
        activity || {
          id: uid(),
          title: '',
          date: day,
          duration: 60,
          kind: 'sight',
          period: 'morning',
          status: 'pending',
          notes: '',
          locationId: '',
          time: '',
        },
      );
  }, [open, activity, day, reset]);
  const values = watch();
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={activity ? 'ویرایش یک قرار' : 'یک قرار تازه برای سفر'}
      description="جزئیات کم، خاطره‌های زیاد."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>انصراف</Button>
          <Button form="activity-form" type="submit" variant="primary">
            {activity ? 'ذخیره تغییرات' : 'افزودن برنامه'}
          </Button>
        </>
      }
    >
      <form
        id="activity-form"
        onSubmit={handleSubmit((value) => {
          try {
            useTripStore.getState().saveEntity(trip.id, 'activities', value);
            toast(activity ? 'برنامه به‌روز شد.' : 'یک قرار تازه به سفر اضافه شد.');
            onOpenChange(false);
          } catch {
            toast('برنامه ذخیره نشد؛ تاریخ و دسترسی را بررسی کن.', 'error');
          }
        })}
      >
        <div className="form-grid">
          <Field
            label="نام برنامه"
            id="activity-title"
            required
            className="full"
            error={errors.title?.message}
          >
            <Input
              id="activity-title"
              autoFocus
              placeholder="مثلاً صبحانه با منظره جنگل"
              {...register('title')}
              maxLength={150}
            />
          </Field>
          <Field label="روز برنامه" id="activity-date" required error={errors.date?.message}>
            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <DatePicker
                  id="activity-date"
                  min={trip.startDate}
                  max={trip.endDate}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </Field>
          <Field label="ساعت شروع" id="activity-time" optional>
            <Controller
              name="time"
              control={control}
              render={({ field }) => (
                <TimePicker
                  id="activity-time"
                  value={field.value}
                  onChange={(v) => {
                    field.onChange(v);
                    if (v) {
                      const h = Number(v.slice(0, 2));
                      setValue(
                        'period',
                        h < 12 ? 'morning' : h < 15 ? 'noon' : h < 19 ? 'afternoon' : 'night',
                      );
                    }
                  }}
                />
              )}
            />
          </Field>
          <Field
            label="مدت تقریبی (دقیقه)"
            id="activity-duration"
            required
            error={errors.duration?.message}
          >
            <Input
              id="activity-duration"
              inputMode="numeric"
              value={Number.isFinite(values.duration) ? fa(values.duration) : ''}
              onChange={(e) =>
                setValue('duration', Number(normalizeDigits(e.target.value)), {
                  shouldValidate: true,
                })
              }
            />
          </Field>
          <Field label="بخش روز" id="activity-period">
            <Select id="activity-period" {...register('period')}>
              {Object.entries(PERIOD_LABELS).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="نوع برنامه" id="activity-kind">
            <Select id="activity-kind" {...register('kind')}>
              {Object.entries(ACTIVITY_LABELS).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="وضعیت" id="activity-status">
            <Select id="activity-status" {...register('status')}>
              <option value="pending">در انتظار</option>
              <option value="done">انجام‌شده</option>
              <option value="cancelled">لغوشده</option>
            </Select>
          </Field>
          <Field
            label="پیوند به مکان"
            id="activity-location"
            optional
            className="full"
            hint={
              trip.locations.length
                ? 'مکان‌های ذخیره‌شده این سفر'
                : 'از بخش مکان‌ها، یک نشانی ذخیره کن.'
            }
          >
            <Select id="activity-location" {...register('locationId')}>
              <option value="">بدون مکان مشخص</option>
              {trip.locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="یادداشت" id="activity-notes" optional className="full">
            <Textarea
              id="activity-notes"
              placeholder="رزرو، نکته یا چیزی که نباید فراموش شود…"
              {...register('notes')}
              maxLength={3000}
            />
          </Field>
        </div>
      </form>
    </Dialog>
  );
}
