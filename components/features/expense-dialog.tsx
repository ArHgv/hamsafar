'use client';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Wallet, Users } from 'lucide-react';
import type { Expense, ExpenseShare, SplitMode, Trip } from '@/lib/types';
import { expenseSchema } from '@/lib/schemas';
import { CURRENCY_LABELS, EXPENSE_LABELS } from '@/lib/constants';
import { todayISO } from '@/lib/dates';
import { amountInput, equalSplit, money, parseMoney, percentageSplit } from '@/lib/money';
import { cn, fa, normalizeDigits, uid } from '@/lib/utils';
import { useTripStore } from '@/store/use-trip-store';
import { useToast } from '@/store/use-ui-store';
import { Dialog } from '../ui/dialog';
import { Avatar, Button, Field, Input, Select, Textarea } from '../ui/primitives';
import { DatePicker } from '../ui/date-picker';
import { FilePicker } from '../ui/file-picker';
export function ExpenseDialog({
  trip,
  expense,
  open,
  onOpenChange,
}: {
  trip: Trip;
  expense?: Expense;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const toast = useToast(),
    [amount, setAmount] = useState(''),
    [selected, setSelected] = useState<string[]>([]),
    [custom, setCustom] = useState<Record<string, string>>({}),
    [percentages, setPercentages] = useState<Record<string, string>>({}),
    [issue, setIssue] = useState('');
  const {
    register,
    control,
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<Expense>({ resolver: zodResolver(expenseSchema), mode: 'onTouched' });
  const values = watch(),
    mode = values.splitMode || 'equal',
    total = values.amount || 0;
  useEffect(() => {
    if (!open) return;
    const ids =
      expense?.shares.map((s) => s.memberId) ||
      trip.members.filter((m) => m.attendance !== 'declined').map((m) => m.id);
    const now = new Date().toISOString();
    reset(
      expense || {
        id: uid(),
        title: '',
        amount: 0,
        payerId: trip.members[0].id,
        category: 'food',
        date: todayISO(),
        notes: '',
        splitMode: 'equal',
        shares: equalSplit(0, ids.length ? ids : [trip.members[0].id]),
        createdAt: now,
      },
    );
    setAmount(expense ? amountInput(expense.amount, trip.currency) : '');
    setSelected(ids.length ? ids : [trip.members[0].id]);
    setCustom(
      Object.fromEntries(
        (expense?.shares || []).map((s) => [s.memberId, amountInput(s.amount, trip.currency)]),
      ),
    );
    setPercentages(
      Object.fromEntries(
        (expense?.shares || []).map((s) => [s.memberId, String(s.percentage ?? 0)]),
      ),
    );
    setIssue('');
  }, [open, expense, trip.id, reset]);
  const calculated = useMemo(() => {
    const validAmount = Number.isSafeInteger(total) && total >= 0;
    let shares: ExpenseShare[] = [],
      error = '';
    if (!selected.length) return { shares, error: 'حداقل یک هم‌سفر را انتخاب کن.' };
    if (!validAmount) return { shares, error: 'مبلغ هزینه را درست وارد کن.' };
    if (mode === 'equal') shares = equalSplit(total, selected);
    if (mode === 'custom') {
      shares = selected.map((memberId) => ({
        memberId,
        amount: parseMoney(custom[memberId] || '0', trip.currency),
      }));
      if (shares.some((s) => !Number.isSafeInteger(s.amount) || s.amount < 0))
        error = 'مبلغ سهم‌ها معتبر نیست.';
      else if (shares.reduce((n, s) => n + s.amount, 0) !== total)
        error = 'مجموع سهم‌ها باید دقیقاً برابر مبلغ هزینه باشد.';
    }
    if (mode === 'percentage') {
      const inputs = selected.map((memberId) => ({
        memberId,
        percentage: Number(normalizeDigits(percentages[memberId] || '0')),
      }));
      try {
        shares = percentageSplit(total, inputs);
      } catch {
        error = 'درصدها باید بین صفر و صد باشند و مجموعشان ۱۰۰ شود.';
        shares = inputs.map((s) => ({ ...s, amount: 0 }));
      }
    }
    return { shares, error };
  }, [total, selected, mode, custom, percentages, trip.currency]);
  useEffect(() => {
    setValue('shares', calculated.shares);
  }, [calculated, setValue]);
  const changeMode = (next: SplitMode) => {
    setValue('splitMode', next);
    if (next === 'custom' && selected.length)
      setCustom(
        Object.fromEntries(
          equalSplit(Number.isSafeInteger(total) && total > 0 ? total : 0, selected).map((s) => [
            s.memberId,
            amountInput(s.amount, trip.currency),
          ]),
        ),
      );
    if (next === 'percentage' && selected.length)
      setPercentages(
        Object.fromEntries(
          equalSplit(10000, selected).map((s) => [s.memberId, String(s.amount / 100)]),
        ),
      );
  };
  const sum =
    mode === 'percentage'
      ? selected.reduce((n, id) => n + Number(normalizeDigits(percentages[id] || '0')), 0)
      : calculated.shares.reduce((n, s) => n + (Number.isFinite(s.amount) ? s.amount : 0), 0);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={expense ? 'ویرایش هزینه' : 'یک هزینه تازه'}
      description="شفاف ثبت کن؛ حساب‌ها خودشان مرتب می‌شوند."
      wide
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>انصراف</Button>
          <Button form="expense-form" type="submit" variant="primary">
            {expense ? 'ذخیره تغییرات' : 'ثبت هزینه'}
          </Button>
        </>
      }
    >
      <form
        id="expense-form"
        onSubmit={handleSubmit(
          (value) => {
            if (calculated.error) {
              setIssue(calculated.error);
              return;
            }
            try {
              useTripStore
                .getState()
                .saveEntity(trip.id, 'expenses', { ...value, shares: calculated.shares });
              toast(expense ? 'هزینه و سهم‌ها به‌روز شدند.' : 'هزینه ثبت شد و سهم‌ها حساب شدند.');
              onOpenChange(false);
            } catch {
              setIssue('هزینه ذخیره نشد. اعضا، مبلغ و دسترسی را بررسی کن.');
            }
          },
          () => setIssue(calculated.error || 'فیلدهای مشخص‌شده را بررسی کن.'),
        )}
      >
        <div className="form-stack">
          <div className="expense-amount-field">
            <label htmlFor="expense-amount">
              مبلغ هزینه <span className="required">*</span>
            </label>
            <div>
              <input
                id="expense-amount"
                autoFocus
                inputMode="decimal"
                placeholder="۰"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setValue(
                    'amount',
                    e.target.value ? parseMoney(e.target.value, trip.currency) : 0,
                    { shouldValidate: true },
                  );
                }}
                aria-invalid={!!errors.amount}
              />
              <span>{CURRENCY_LABELS[trip.currency]}</span>
            </div>
            {errors.amount && <p className="field-error">{errors.amount.message}</p>}
          </div>
          <div className="form-grid">
            <Field label="بابت چی؟" required id="expense-title" error={errors.title?.message}>
              <Input
                id="expense-title"
                placeholder="مثلاً رزرو کلبه جنگلی"
                {...register('title')}
                maxLength={150}
              />
            </Field>
            <Field
              label="چه کسی پرداخت کرد؟"
              required
              id="expense-payer"
              error={errors.payerId?.message}
            >
              <Select id="expense-payer" {...register('payerId')}>
                {trip.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="دسته‌بندی" id="expense-category">
              <Select id="expense-category" {...register('category')}>
                {Object.entries(EXPENSE_LABELS).map(([v, label]) => (
                  <option value={v} key={v}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="تاریخ هزینه" required id="expense-date" error={errors.date?.message}>
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <DatePicker id="expense-date" value={field.value} onChange={field.onChange} />
                )}
              />
            </Field>
          </div>
          <div className="split-section">
            <div className="split-heading">
              <h3>
                <Users size={16} />
                چطور تقسیم کنیم؟
              </h3>
              <div className="segmented">
                {[
                  { key: 'equal', label: 'برابر' },
                  { key: 'custom', label: 'مبلغ دلخواه' },
                  { key: 'percentage', label: 'درصدی' },
                ].map((s) => (
                  <button
                    type="button"
                    key={s.key}
                    className={mode === s.key ? 'active' : ''}
                    onClick={() => changeMode(s.key as SplitMode)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="split-members">
              {trip.members.map((m) => {
                const included = selected.includes(m.id),
                  share = calculated.shares.find((s) => s.memberId === m.id);
                return (
                  <div key={m.id} className={cn('split-member-row', !included && 'excluded')}>
                    <label>
                      <input
                        type="checkbox"
                        checked={included}
                        aria-label={`تقسیم بین ${m.name}`}
                        onChange={(e) =>
                          setSelected((ids) =>
                            e.target.checked ? [...ids, m.id] : ids.filter((id) => id !== m.id),
                          )
                        }
                      />
                      <Avatar member={m} size={29} />
                      <span>{m.name}</span>
                    </label>
                    {mode === 'equal' ? (
                      <strong>
                        {included ? money(share?.amount || 0, trip.currency) : 'بدون سهم'}
                      </strong>
                    ) : (
                      <div className="split-input">
                        <Input
                          aria-label={`سهم ${m.name}`}
                          inputMode="decimal"
                          disabled={!included}
                          placeholder="۰"
                          value={mode === 'custom' ? custom[m.id] || '' : percentages[m.id] || ''}
                          onChange={(e) =>
                            mode === 'custom'
                              ? setCustom((c) => ({ ...c, [m.id]: e.target.value }))
                              : setPercentages((p) => ({ ...p, [m.id]: e.target.value }))
                          }
                        />
                        <span>{mode === 'percentage' ? '٪' : CURRENCY_LABELS[trip.currency]}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div
              className={cn('split-summary', calculated.error && total > 0 ? 'invalid' : 'valid')}
            >
              <span>
                {calculated.error && total > 0 ? (
                  calculated.error
                ) : (
                  <>
                    <Check size={14} />
                    {mode === 'equal'
                      ? `بین ${fa(selected.length)} نفر تقسیم می‌شود`
                      : 'تقسیم هزینه کامل است'}
                  </>
                )}
              </span>
              <strong>
                {mode === 'percentage'
                  ? `${fa(Number.isFinite(sum) ? sum.toFixed(2).replace(/\.00$/, '') : '۰')}٪ از ۱۰۰٪`
                  : money(sum, trip.currency)}
              </strong>
            </div>
            {errors.shares?.message && <p className="field-error">{errors.shares.message}</p>}
          </div>
          <div className="form-grid">
            <Field label="توضیحات" optional id="expense-notes">
              <Textarea
                id="expense-notes"
                placeholder="جزئیات بیشتر این هزینه…"
                {...register('notes')}
                maxLength={3000}
              />
            </Field>
            <Field label="رسید" optional>
              <Controller
                name="receipt"
                control={control}
                render={({ field }) => (
                  <FilePicker value={field.value} onChange={field.onChange} label="پیوست رسید" />
                )}
              />
            </Field>
          </div>
          {issue && (
            <p className="field-error" role="alert">
              {issue}
            </p>
          )}
        </div>
      </form>
    </Dialog>
  );
}
