'use client';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  ArrowLeftRight,
  Check,
  CheckCircle2,
  Plus,
  Trash2,
  Wallet,
  Info,
  LockKeyhole,
} from 'lucide-react';
import type { Settlement, SuggestedSettlement, Trip } from '@/lib/types';
import { settlementSchema } from '@/lib/schemas';
import { balances, money, parseMoney, amountInput, suggestSettlements } from '@/lib/money';
import { formatDate, todayISO } from '@/lib/dates';
import { CURRENCY_LABELS } from '@/lib/constants';
import { fa, uid } from '@/lib/utils';
import { useTripPermission } from '@/hooks/use-trip';
import { useTripStore } from '@/store/use-trip-store';
import { useToast } from '@/store/use-ui-store';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Select,
  SectionHeading,
  Textarea,
} from '../ui/primitives';
import { Dialog, ConfirmDialog } from '../ui/dialog';
import { DatePicker } from '../ui/date-picker';
export function SettlementBoard({ trip }: { trip: Trip }) {
  const b = balances(trip),
    suggestions = suggestSettlements(trip),
    editable = useTripPermission(trip, 'settlements'),
    toast = useToast();
  const [selected, setSelected] = useState<SuggestedSettlement | null>(null),
    [adding, setAdding] = useState(false),
    [deleting, setDeleting] = useState<Settlement | null>(null);
  const totalOwed = Object.values(b)
    .filter((v) => v < 0)
    .reduce((n, v) => n - v, 0);
  return (
    <>
      <div className="feature-toolbar">
        <div className="feature-header">
          <ArrowLeftRight size={19} className="accent" />
          <div>
            <h2>حساب‌های صاف، دوستی‌های ماندگار.</h2>
            <p className="card-eyebrow">
              {suggestions.length
                ? `${money(totalOwed, trip.currency)} برای تسویه باقی مانده`
                : 'همه حساب‌ها تسویه شده‌اند'}
            </p>
          </div>
        </div>
        {editable && suggestions.length > 0 ? (
          <Button onClick={() => setAdding(true)}>
            <Plus size={16} />
            ثبت یک پرداخت
          </Button>
        ) : (
          !editable && (
            <span className="readonly-note">
              <LockKeyhole size={13} />
              دسترسی مشاهده
            </span>
          )
        )}
      </div>
      <div className="member-balances">
        {trip.members.map((m) => {
          const paid = trip.expenses
            .filter((e) => e.payerId === m.id)
            .reduce((n, e) => n + e.amount, 0);
          return (
            <Card className="member-balance-card" key={m.id}>
              <div className="member-balance-heading">
                <Avatar member={m} size={36} />
                <strong>{m.name}</strong>
                <Badge tone={b[m.id] > 0 ? 'accent' : b[m.id] < 0 ? 'warning' : 'neutral'}>
                  {b[m.id] > 0 ? 'بستانکار' : b[m.id] < 0 ? 'بدهکار' : 'حساب صاف'}
                </Badge>
              </div>
              <div
                className={b[m.id] > 0 ? 'member-balance-amount accent' : 'member-balance-amount'}
              >
                {money(Math.abs(b[m.id]), trip.currency, false)}
                <small>{CURRENCY_LABELS[trip.currency]}</small>
              </div>
              <p>{money(paid, trip.currency)} پرداخت کرده</p>
            </Card>
          );
        })}
      </div>
      <div className="settlement-layout">
        <div>
          <SectionHeading
            title="پیشنهادهای تسویه"
            subtitle="با کاهش انتقال‌های اضافه؛ هر پرداخت را پس از انجام واقعی ثبت کن."
          />
          {suggestions.length ? (
            <div className="settlement-suggestions">
              {suggestions.map((s) => {
                const from = trip.members.find((m) => m.id === s.fromId)!,
                  to = trip.members.find((m) => m.id === s.toId)!;
                return (
                  <Card key={`${s.fromId}-${s.toId}`} className="settlement-suggestion">
                    <div className="transfer-people">
                      <Avatar member={from} size={37} />
                      <div>
                        <strong>{from.name}</strong>
                        <small>پرداخت می‌کند</small>
                      </div>
                      <ArrowLeft size={20} />
                      <Avatar member={to} size={37} />
                      <div>
                        <strong>{to.name}</strong>
                        <small>دریافت می‌کند</small>
                      </div>
                    </div>
                    <div className="transfer-amount">
                      <strong>{money(s.amount, trip.currency)}</strong>
                      {editable && (
                        <Button size="small" onClick={() => setSelected(s)}>
                          ثبت پرداخت
                          <Check size={14} />
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<CheckCircle2 size={30} />}
              title="همه‌چیز صاف و ساده است."
              description={
                trip.expenses.length
                  ? 'بدهی باقی‌مانده‌ای بین هم‌سفرها نیست. حالا فقط خاطره‌ها می‌مانند.'
                  : 'پس از ثبت هزینه‌های مشترک، سهم‌ها و پیشنهادهای تسویه اینجا نمایش داده می‌شوند.'
              }
            />
          )}
          <div className="payment-notice">
            <Info size={15} />
            <span>
              این بخش پرداخت بانکی انجام نمی‌دهد؛ فقط انتقالِ انجام‌شده را در حساب سفر ثبت می‌کند.
            </span>
          </div>
          {trip.settlements.length > 0 && (
            <div className="settlement-history">
              <SectionHeading
                title="پرداخت‌های ثبت‌شده"
                subtitle={`${fa(trip.settlements.length)} پرداخت`}
              />
              <Card className="expense-list">
                {[...trip.settlements]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((s) => (
                    <div className="settlement-history-row" key={s.id}>
                      <span className="history-check">
                        <Check size={17} />
                      </span>
                      <div>
                        <strong>
                          {trip.members.find((m) => m.id === s.fromId)?.name}
                          <ArrowLeft size={12} />
                          {trip.members.find((m) => m.id === s.toId)?.name}
                        </strong>
                        <small>
                          {formatDate(s.date)}
                          {s.notes ? ` · ${s.notes}` : ''}
                        </small>
                      </div>
                      <span>{money(s.amount, trip.currency)}</span>
                      {editable && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="حذف پرداخت ثبت‌شده"
                          onClick={() => setDeleting(s)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </div>
                  ))}
              </Card>
            </div>
          )}
        </div>
        <Card className="settlement-explainer">
          <Wallet size={23} />
          <h3>این حساب چطور محاسبه شده؟</h3>
          <p>
            مبلغ پرداختی هر نفر، منهای سهم او از هزینه‌ها، به‌اضافه پرداخت‌های تسویه‌شده؛ نتیجه
            دقیقاً همان طلب یا بدهی باقی‌مانده است.
          </p>
          <div>
            <span>جمع بدهی‌ها</span>
            <strong>{money(totalOwed, trip.currency)}</strong>
          </div>
          <div>
            <span>جمع طلب‌ها</span>
            <strong>
              {money(
                Object.values(b)
                  .filter((v) => v > 0)
                  .reduce((n, v) => n + v, 0),
                trip.currency,
              )}
            </strong>
          </div>
          <p className="settlement-rounding">
            در تقسیم برابر و درصدی، باقی‌مانده کوچکِ گرد کردن بین اعضا توزیع می‌شود؛ هیچ واحد پولی
            گم نمی‌شود.
          </p>
        </Card>
      </div>
      <SettlementDialog
        trip={trip}
        suggestion={selected || undefined}
        open={adding || !!selected}
        onOpenChange={(v) => {
          if (!v) {
            setAdding(false);
            setSelected(null);
          }
        }}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => {
          if (!v) setDeleting(null);
        }}
        title="ثبت این پرداخت حذف شود؟"
        description="حساب‌ها دوباره محاسبه می‌شوند. این کار انتقال بانکی قبلی را برنمی‌گرداند."
        onConfirm={() => {
          if (deleting) {
            useTripStore.getState().removeEntity(trip.id, 'settlements', deleting.id);
            toast('ثبت پرداخت حذف شد.');
          }
        }}
      />
    </>
  );
}
function SettlementDialog({
  trip,
  suggestion,
  open,
  onOpenChange,
}: {
  trip: Trip;
  suggestion?: SuggestedSettlement;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const toast = useToast(),
    [amount, setAmount] = useState(''),
    [issue, setIssue] = useState('');
  const {
    register,
    control,
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<Settlement>({ resolver: zodResolver(settlementSchema) });
  const values = watch(),
    b = balances(trip),
    max = Math.max(0, Math.min(-(b[values.fromId] || 0), b[values.toId] || 0));
  useEffect(() => {
    if (open) {
      const s = suggestion || suggestSettlements(trip)[0];
      reset({
        id: uid(),
        fromId: s?.fromId || '',
        toId: s?.toId || '',
        amount: s?.amount || 0,
        date: todayISO(),
        notes: '',
      });
      setAmount(s ? amountInput(s.amount, trip.currency) : '');
      setIssue('');
    }
  }, [open, suggestion, trip.id, reset]);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="این پرداخت انجام شده؟"
      description="فقط پرداختی را ثبت کن که واقعاً بین هم‌سفرها انجام شده است."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>انصراف</Button>
          <Button variant="primary" form="settlement-form" type="submit">
            تأیید و ثبت پرداخت
          </Button>
        </>
      }
    >
      <form
        id="settlement-form"
        onSubmit={handleSubmit((value) => {
          const current = useTripStore.getState().trips.find((t) => t.id === trip.id)!;
          const bb = balances(current);
          const limit = Math.max(0, Math.min(-(bb[value.fromId] || 0), bb[value.toId] || 0));
          if (value.amount > limit || limit === 0) {
            setIssue('مبلغ از بدهی یا طلب باقی‌مانده بیشتر است. حساب‌های تازه را بررسی کن.');
            return;
          }
          try {
            useTripStore.getState().saveEntity(trip.id, 'settlements', value);
            toast('پرداخت ثبت شد و حساب‌ها به‌روز شدند.');
            onOpenChange(false);
          } catch {
            setIssue('پرداخت ثبت نشد؛ دسترسی و اطلاعات را بررسی کن.');
          }
        })}
      >
        <div className="form-grid">
          <Field label="پرداخت‌کننده" required id="settlement-from" error={errors.fromId?.message}>
            <Select id="settlement-from" {...register('fromId')}>
              {trip.members
                .filter((m) => b[m.id] < 0)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="دریافت‌کننده" required id="settlement-to" error={errors.toId?.message}>
            <Select id="settlement-to" {...register('toId')}>
              {trip.members
                .filter((m) => b[m.id] > 0)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </Select>
          </Field>
          <Field
            label={`مبلغ (${CURRENCY_LABELS[trip.currency]})`}
            required
            id="settlement-amount"
            error={errors.amount?.message}
            hint={`حداکثر قابل ثبت: ${money(max, trip.currency)}`}
          >
            <Input
              id="settlement-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setValue('amount', parseMoney(e.target.value, trip.currency), {
                  shouldValidate: true,
                });
              }}
            />
          </Field>
          <Field label="تاریخ پرداخت" required id="settlement-date">
            <Controller
              control={control}
              name="date"
              render={({ field }) => (
                <DatePicker id="settlement-date" value={field.value} onChange={field.onChange} />
              )}
            />
          </Field>
          <Field label="یادداشت" optional id="settlement-notes" className="full">
            <Textarea
              id="settlement-notes"
              placeholder="مثلاً انتقال به کارت در پایان سفر"
              {...register('notes')}
              maxLength={3000}
            />
          </Field>
        </div>
        {issue && (
          <p className="field-error" role="alert" style={{ marginTop: 15 }}>
            {issue}
          </p>
        )}
      </form>
    </Dialog>
  );
}
