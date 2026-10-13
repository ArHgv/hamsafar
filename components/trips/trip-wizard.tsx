'use client';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  CalendarDays,
  Minus,
  Plus,
  ChevronLeft,
  X,
  Users,
  Cloud,
  LockKeyhole,
  Sparkles,
} from 'lucide-react';
import { tripInfoSchema, transportSchema, validateTrip, memberSchema } from '@/lib/schemas';
import type { Member, MemberRole, Transport, Trip } from '@/lib/types';
import { CURRENCY_LABELS, MEMBER_COLORS, ROLE_LABELS } from '@/lib/constants';
import { todayISO, addDays, dateRange, tripDays } from '@/lib/dates';
import { amountInput, money, parseMoney } from '@/lib/money';
import { cn, fa, readableError, uid } from '@/lib/utils';
import { useTripStore } from '@/store/use-trip-store';
import { useToast } from '@/store/use-ui-store';
import { publishTrip } from '@/lib/cloud';
import { checklistTemplateForTransport, makeChecklistTemplate } from '@/lib/templates';
import { Button, Card, Field, Input, Select, Textarea, Avatar } from '../ui/primitives';
import { DatePicker } from '../ui/date-picker';
import { CoverPicker } from './cover-picker';
import { TransportFields, TransportModePicker, TransportIcons } from '../features/transport-fields';
type Info = z.infer<typeof tripInfoSchema>;
export function TripWizard() {
  const router = useRouter(),
    toast = useToast(),
    local = useTripStore((s) => s.localProfile),
    cloudUser = useTripStore((s) => s.cloudUser);
  const [step, setStep] = useState(0),
    [busy, setBusy] = useState(false),
    [issue, setIssue] = useState(''),
    [budgetInput, setBudgetInput] = useState(''),
    [template, setTemplate] = useState(true),
    [cloudSave, setCloudSave] = useState(true);
  const [members, setMembers] = useState<Member[]>(() => [
    {
      id: uid(),
      name: (cloudUser || local).name,
      userId: local.id,
      role: 'admin',
      attendance: 'confirmed',
      color: MEMBER_COLORS[0],
    },
  ]);
  const [transport, setTransport] = useState<Transport>({ mode: 'car', outbound: {}, return: {} });
  const {
    register,
    control,
    watch,
    trigger,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<Info>({
    resolver: zodResolver(tripInfoSchema),
    defaultValues: {
      title: '',
      destination: '',
      startDate: addDays(todayISO(), 7),
      endDate: addDays(todayISO(), 10),
      currency: 'IRT',
      budget: 0,
      cover: '/images/gilan-cover.jpg',
      description: '',
    },
    mode: 'onTouched',
  });
  const values = watch(),
    ModeIcon = TransportIcons[transport.mode];
  const setCount = (count: number) => {
    const n = Math.min(100, Math.max(1, count));
    setMembers((m) =>
      n < m.length
        ? m.slice(0, n)
        : [
            ...m,
            ...Array.from({ length: n - m.length }, (_, i) => ({
              id: uid(),
              name: '',
              role: 'planner' as const,
              attendance: 'invited' as const,
              color: MEMBER_COLORS[(m.length + i) % MEMBER_COLORS.length],
            })),
          ],
    );
  };
  const next = async () => {
    setIssue('');
    if (step === 0 && !(await trigger(['title', 'destination', 'startDate', 'endDate', 'cover'])))
      return;
    if (step === 1) {
      if (!(await trigger(['budget', 'currency', 'description']))) return;
      if (members.some((m) => !m.name.trim())) {
        setIssue('نام همه هم‌سفرها را بنویس. می‌توانی فعلاً از یک نام موقت استفاده کنی.');
        return;
      }
      if (members.some((m) => !memberSchema.safeParse(m).success)) {
        setIssue('نام یا اطلاعات یکی از اعضا معتبر نیست.');
        return;
      }
    }
    setStep((s) => s + 1);
  };
  const submit = handleSubmit(async (info) => {
    if (step !== 2) return;
    setIssue('');
    const t = transportSchema.safeParse(transport);
    if (!t.success) {
      setIssue(t.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const trip: Trip = validateTrip({
        ...info,
        id: uid(),
        members: members.map((m) => ({ ...m, name: m.name.trim() })),
        transport: {
          ...t.data,
          outbound: {
            ...t.data.outbound,
            destination: t.data.outbound.destination || info.destination,
          },
          return: t.data.return,
        },
        activities: [],
        checklist: template
          ? makeChecklistTemplate(checklistTemplateForTransport(t.data.mode))
          : [],
        expenses: [],
        settlements: [],
        locations: [],
        createdAt: now,
        updatedAt: now,
        ownerId: local.id,
      });
      useTripStore.getState().addTrip(trip);
      if (cloudUser && cloudSave) {
        try {
          await publishTrip(trip);
        } catch (e) {
          toast(`سفر ساخته شد؛ اتصال ابری کامل نشد. ${readableError(e)}`, 'error');
        }
      }
      toast('سفرت ساخته شد؛ حالا وقتِ فکر کردن به خاطره‌هاست.');
      router.push(`/trips/${trip.id}`);
    } catch (e) {
      setIssue(e instanceof z.ZodError ? e.issues[0].message : readableError(e));
    } finally {
      setBusy(false);
    }
  });
  return (
    <>
      <div className="page-intro small-heading">
        <div>
          <div className="eyebrow">
            <Sparkles size={14} />
            یک شروع کوچک
          </div>
          <h1>از یک فکر، به یک سفر.</h1>
          <p>چند جزئیات ساده، باقی‌اش را در مسیر می‌چینیم.</p>
        </div>
        <Link
          href="/trips"
          className="button button-ghost button-icon"
          aria-label="انصراف از ساخت سفر"
        >
          <X size={20} />
        </Link>
      </div>
      <div className="wizard-layout">
        <Card className="wizard-card">
          <div className="wizard-steps">
            {['مقصد و تاریخ', 'همراه‌ها و بودجه', 'جزئیات مسیر'].map((label, i) => (
              <div
                key={label}
                className={cn('wizard-step', i === step && 'current', i < step && 'complete')}
              >
                <span>{i < step ? <Check size={15} /> : fa(i + 1)}</span>
                <p>{label}</p>
              </div>
            ))}
          </div>
          <form
            onKeyDown={(event) => {
              const target = event.target;
              if (
                step < 2 &&
                event.key === 'Enter' &&
                !event.nativeEvent.isComposing &&
                event.nativeEvent.keyCode !== 229 &&
                target instanceof HTMLInputElement &&
                ['text', 'email', 'number'].includes(target.type)
              ) {
                event.preventDefault();
                void next();
              }
            }}
            onSubmit={
              step === 2
                ? submit
                : (event) => {
                    event.preventDefault();
                    void next();
                  }
            }
          >
            <div className="wizard-body" key={step}>
              {step === 0 && (
                <div className="form-stack">
                  <div className="wizard-section-title">
                    <h2>کجا می‌خواهی بروی؟</h2>
                    <p>هر سفر، از یک مقصد شروع می‌شود.</p>
                  </div>
                  <div className="form-grid">
                    <Field
                      label="اسم این سفر"
                      required
                      id="trip-title"
                      error={errors.title?.message}
                    >
                      <Input
                        id="trip-title"
                        placeholder="مثلاً چند روز آرام‌تر، در شمال"
                        autoFocus
                        maxLength={150}
                        {...register('title')}
                        aria-invalid={!!errors.title}
                      />
                    </Field>
                    <Field
                      label="مقصد"
                      required
                      id="trip-destination"
                      error={errors.destination?.message}
                    >
                      <Input
                        id="trip-destination"
                        placeholder="مثلاً گیلان، رشت و ماسال"
                        maxLength={150}
                        {...register('destination')}
                        aria-invalid={!!errors.destination}
                      />
                    </Field>
                    <Field
                      label="تاریخ رفت"
                      required
                      id="trip-start"
                      error={errors.startDate?.message}
                    >
                      <Controller
                        control={control}
                        name="startDate"
                        render={({ field }) => (
                          <DatePicker
                            id="trip-start"
                            value={field.value}
                            onChange={(v) => {
                              field.onChange(v);
                              if (values.endDate < v) setValue('endDate', v);
                            }}
                            error={!!errors.startDate}
                          />
                        )}
                      />
                    </Field>
                    <Field
                      label="تاریخ برگشت"
                      required
                      id="trip-end"
                      error={errors.endDate?.message}
                    >
                      <Controller
                        control={control}
                        name="endDate"
                        render={({ field }) => (
                          <DatePicker
                            id="trip-end"
                            min={values.startDate}
                            value={field.value}
                            onChange={field.onChange}
                            error={!!errors.endDate}
                          />
                        )}
                      />
                    </Field>
                    <Field label="با چه چیزی سفر می‌کنی؟" className="full">
                      <TransportModePicker
                        value={transport.mode}
                        onChange={(mode) => setTransport((t) => ({ ...t, mode }))}
                      />
                    </Field>
                    <Field
                      label="حال‌وهوای کاور"
                      optional
                      className="full"
                      hint="یکی را انتخاب کن یا عکس خودت را اضافه کن."
                    >
                      <Controller
                        name="cover"
                        control={control}
                        render={({ field }) => (
                          <CoverPicker value={field.value} onChange={field.onChange} />
                        )}
                      />
                    </Field>
                  </div>
                </div>
              )}
              {step === 1 && (
                <div className="form-stack">
                  <div className="wizard-section-title">
                    <h2>
                      {members.length === 1 ? 'تنها یا با هم‌سفرها؟' : 'خاطره‌ها با هم بهترند.'}
                    </h2>
                    <p>تک‌نفره هم می‌شود؛ هر وقت خواستی، کسی را اضافه کن.</p>
                  </div>
                  <div className="member-count">
                    <div>
                      <strong>تعداد نفرات</strong>
                      <small>با احتساب خودت</small>
                    </div>
                    <div className="count-stepper">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="افزایش نفرات"
                        onClick={() => setCount(members.length + 1)}
                        disabled={members.length >= 100}
                      >
                        <Plus size={17} />
                      </Button>
                      <span aria-live="polite">{fa(members.length)}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="کاهش نفرات"
                        onClick={() => setCount(members.length - 1)}
                        disabled={members.length <= 1}
                      >
                        <Minus size={17} />
                      </Button>
                    </div>
                  </div>
                  <div className="wizard-members">
                    {members.map((m, i) => (
                      <div className="wizard-member-row" key={m.id}>
                        <Avatar member={{ ...m, name: m.name || '؟' }} size={35} />
                        <Input
                          aria-label={`نام هم‌سفر ${fa(i + 1)}`}
                          placeholder={i === 0 ? 'نام تو' : `نام هم‌سفر ${fa(i + 1)}`}
                          value={m.name}
                          maxLength={150}
                          onChange={(e) =>
                            setMembers((a) =>
                              a.map((v) => (v.id === m.id ? { ...v, name: e.target.value } : v)),
                            )
                          }
                        />
                        {i === 0 ? (
                          <span className="owner-label">مدیر سفر</span>
                        ) : (
                          <Select
                            aria-label={`دسترسی هم‌سفر ${fa(i + 1)}`}
                            value={m.role}
                            onChange={(e) =>
                              setMembers((a) =>
                                a.map((v) =>
                                  v.id === m.id ? { ...v, role: e.target.value as MemberRole } : v,
                                ),
                              )
                            }
                          >
                            {Object.entries(ROLE_LABELS).map(([r, label]) => (
                              <option key={r} value={r}>
                                {label}
                              </option>
                            ))}
                          </Select>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="field-hint">
                    <LockKeyhole
                      size={12}
                      style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 5 }}
                    />
                    اینجا فقط فهرست همراه‌ها ساخته می‌شود. دعوت واقعی پس از اتصال ابری با لینک انجام
                    می‌شود.
                  </p>
                  <div className="form-grid">
                    <Field
                      label="بودجه کلی"
                      optional
                      id="trip-budget"
                      error={errors.budget?.message}
                    >
                      <Input
                        id="trip-budget"
                        inputMode="decimal"
                        placeholder="مثلاً ۱۶٬۰۰۰٬۰۰۰"
                        value={budgetInput}
                        onChange={(e) => {
                          setBudgetInput(e.target.value);
                          setValue(
                            'budget',
                            e.target.value.trim() ? parseMoney(e.target.value, values.currency) : 0,
                            { shouldValidate: true },
                          );
                        }}
                      />
                    </Field>
                    <Field label="واحد پول" id="trip-currency">
                      <Select
                        id="trip-currency"
                        {...register('currency')}
                        onChange={(e) => {
                          const c = e.target.value as Info['currency'];
                          setValue('currency', c);
                          setValue('budget', budgetInput ? parseMoney(budgetInput, c) : 0);
                        }}
                      >
                        {Object.entries(CURRENCY_LABELS).map(([k, label]) => (
                          <option key={k} value={k}>
                            {label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="درباره این سفر" optional className="full" id="trip-description">
                      <Textarea
                        id="trip-description"
                        placeholder="قرار است چه حال‌وهوایی داشته باشد؟"
                        maxLength={3000}
                        {...register('description')}
                      />
                    </Field>
                  </div>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={template}
                      onChange={(e) => setTemplate(e.target.checked)}
                    />
                    <span>با یک چک‌لیست سبک و پیشنهادی شروع کن</span>
                  </label>
                </div>
              )}
              {step === 2 && (
                <div className="form-stack">
                  <div className="wizard-section-title">
                    <h2>یک نگاه به مسیر.</h2>
                    <p>این مرحله کاملاً اختیاری است؛ بدون تکمیل آن هم سفرت ساخته می‌شود.</p>
                  </div>
                  <TransportFields value={transport} onChange={setTransport} />
                  {cloudUser && (
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={cloudSave}
                        onChange={(e) => setCloudSave(e.target.checked)}
                      />
                      <Cloud size={16} />
                      <span>این سفر را در فضای ابری هم ذخیره کن</span>
                    </label>
                  )}
                </div>
              )}
              {issue && (
                <p className="field-error" role="alert" style={{ marginTop: 18 }}>
                  {issue}
                </p>
              )}
            </div>
            <div className="wizard-footer">
              <span className="wizard-step-count">مرحله {fa(step + 1)} از ۳</span>
              <div>
                {step > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setStep((s) => s - 1);
                      setIssue('');
                    }}
                    disabled={busy}
                  >
                    <ArrowRight size={16} />
                    قبلی
                  </Button>
                )}
                {step < 2 ? (
                  <Button
                    key="wizard-next"
                    type="button"
                    variant="primary"
                    onClick={(event) => {
                      event.preventDefault();
                      void next();
                    }}
                  >
                    ادامه
                    <ArrowLeft size={16} />
                  </Button>
                ) : (
                  <Button key="wizard-save" type="submit" variant="primary" loading={busy}>
                    سفر را بساز
                    <Check size={16} />
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Card>
        <Card className="wizard-preview">
          <div className="wizard-preview-image">
            <img src={values.cover} alt="پیش‌نمایش کاور سفر" />
            <span>داستان بعدی تو</span>
          </div>
          <div className="wizard-preview-body">
            <h3>{values.title || 'اسمِ یک خاطره‌ی تازه'}</h3>
            <p>
              <MapPin size={13} />
              {values.destination || 'مقصد هنوز انتخاب نشده'}
            </p>
            <div className="preview-data">
              <span>
                <CalendarDays size={15} />
                {dateRange(values.startDate, values.endDate)}
              </span>
              <span>
                <ModeIcon size={15} />
                {fa(tripDays(values.startDate, values.endDate))} روز ماجراجویی
              </span>
              <span>
                <Users size={15} />
                {members.length === 1 ? 'یک سفر برای خودت' : `${fa(members.length)} هم‌سفر`}
              </span>
            </div>
            {values.budget > 0 && (
              <div className="preview-budget">
                <small>بودجه سفر</small>
                <strong>{money(values.budget, values.currency)}</strong>
              </div>
            )}
            <div className="preview-note">
              <Sparkles size={17} />
              <p>لازم نیست همه‌چیز از همین حالا معلوم باشد. برای اتفاق‌های خوب، جا بگذار.</p>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
