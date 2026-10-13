'use client';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { tripInfoSchema } from '@/lib/schemas';
import type { Currency, Trip } from '@/lib/types';
import { CURRENCY_LABELS } from '@/lib/constants';
import { parseMoney, amountInput } from '@/lib/money';
import { useTripStore } from '@/store/use-trip-store';
import { useToast } from '@/store/use-ui-store';
import { readableError } from '@/lib/utils';
import { Dialog } from '../ui/dialog';
import { Button, Field, Input, Select, Textarea } from '../ui/primitives';
import { DatePicker } from '../ui/date-picker';
import { CoverPicker } from './cover-picker';
type Info = z.infer<typeof tripInfoSchema>;
export function EditTripDialog({
  trip,
  open,
  onOpenChange,
}: {
  trip: Trip;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const toast = useToast(),
    [amount, setAmount] = useState(amountInput(trip.budget, trip.currency)),
    [issue, setIssue] = useState('');
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<Info>({ resolver: zodResolver(tripInfoSchema), defaultValues: trip });
  useEffect(() => {
    if (open) {
      reset(trip);
      setAmount(amountInput(trip.budget, trip.currency));
      setIssue('');
    }
  }, [open, trip.id, reset]);
  const values = watch();
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="جزئیات سفر"
      description="اسم، تاریخ، بودجه و حال‌وهوای این سفر."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>انصراف</Button>
          <Button type="submit" form="edit-trip-form" variant="primary">
            ذخیره تغییرات
          </Button>
        </>
      }
    >
      <form
        id="edit-trip-form"
        onSubmit={handleSubmit((info) => {
          try {
            useTripStore.getState().updateTrip(trip.id, info, ['info']);
            toast('جزئیات سفر به‌روز شد.');
            onOpenChange(false);
          } catch (e) {
            setIssue(e instanceof z.ZodError ? e.issues[0].message : readableError(e));
          }
        })}
      >
        <div className="form-grid">
          <Field label="نام سفر" id="edit-title" required error={errors.title?.message}>
            <Input id="edit-title" {...register('title')} />
          </Field>
          <Field label="مقصد" id="edit-destination" required error={errors.destination?.message}>
            <Input id="edit-destination" {...register('destination')} />
          </Field>
          <Field label="تاریخ رفت" required id="edit-start" error={errors.startDate?.message}>
            <Controller
              name="startDate"
              control={control}
              render={({ field }) => (
                <DatePicker id="edit-start" value={field.value} onChange={field.onChange} />
              )}
            />
          </Field>
          <Field label="تاریخ برگشت" required id="edit-end" error={errors.endDate?.message}>
            <Controller
              name="endDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  id="edit-end"
                  min={values.startDate}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </Field>
          <Field label="بودجه کلی" optional id="edit-budget" error={errors.budget?.message}>
            <Input
              id="edit-budget"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setValue(
                  'budget',
                  e.target.value ? parseMoney(e.target.value, values.currency) : 0,
                  { shouldValidate: true },
                );
              }}
            />
          </Field>
          <Field
            label="واحد پول"
            id="edit-currency"
            hint={
              trip.expenses.length
                ? 'برای حفظ حساب‌ها، ارز سفر هزینه‌دار تغییر نمی‌کند.'
                : undefined
            }
          >
            <Select
              id="edit-currency"
              disabled={trip.expenses.length > 0 || trip.settlements.length > 0}
              {...register('currency')}
              onChange={(e) => {
                const c = e.target.value as Currency;
                setValue('currency', c);
                setValue('budget', parseMoney(amount || '0', c));
              }}
            >
              {Object.entries(CURRENCY_LABELS).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="توضیحات" id="edit-description" optional className="full">
            <Textarea id="edit-description" {...register('description')} maxLength={3000} />
          </Field>
          <Field label="کاور سفر" className="full">
            <Controller
              name="cover"
              control={control}
              render={({ field }) => <CoverPicker value={field.value} onChange={field.onChange} />}
            />
          </Field>
        </div>
        {issue && (
          <p className="field-error" role="alert" style={{ marginTop: 17 }}>
            {issue}
          </p>
        )}
      </form>
    </Dialog>
  );
}
