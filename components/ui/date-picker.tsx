'use client';
import * as Popover from '@radix-ui/react-popover';
import { useEffect, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, X } from 'lucide-react';
import { jalaaliMonthLength } from 'jalaali-js';
import {
  dateToJalali,
  formatDate,
  fullDate,
  JALALI_MONTHS,
  jalaliToISO,
  parseISO,
  todayISO,
  WEEK_DAYS,
} from '@/lib/dates';
import { cn, fa, normalizeDigits } from '@/lib/utils';
import { Button, Select } from './primitives';
export function DatePicker({
  value,
  onChange,
  min,
  max,
  id,
  placeholder = 'انتخاب تاریخ',
  error,
  'aria-describedby': description,
  'aria-invalid': invalid,
}: {
  value: string;
  onChange: (date: string) => void;
  min?: string;
  max?: string;
  id?: string;
  placeholder?: string;
  error?: boolean;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}) {
  const initial = dateToJalali(value || min || todayISO());
  const [month, setMonth] = useState(initial.jm),
    [year, setYear] = useState(initial.jy),
    [open, setOpen] = useState(false);
  useEffect(() => {
    if (open) {
      const j = dateToJalali(value || min || todayISO());
      setMonth(j.jm);
      setYear(j.jy);
    }
  }, [open, value, min]);
  const offset = (parseISO(jalaliToISO(year, month, 1)).getDay() + 1) % 7,
    count = jalaaliMonthLength(year, month);
  const move = (delta: number) => {
    const m = month + delta;
    if (m < 1) {
      setMonth(12);
      setYear(year - 1);
    } else if (m > 12) {
      setMonth(1);
      setYear(year + 1);
    } else setMonth(m);
  };
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          id={id}
          type="button"
          aria-labelledby={id ? `${id}-label ${id}-value` : undefined}
          aria-label={
            !id
              ? value
                ? `${formatDate(value, { year: 'numeric' })}، ${fullDate(value)}`
                : placeholder
              : undefined
          }
          aria-describedby={description || (error && id ? `${id}-error` : undefined)}
          aria-invalid={error || invalid}
          className={cn('input picker-trigger', !value && 'muted', error && 'input-error')}
        >
          <span id={id ? `${id}-value` : undefined}>
            {value ? formatDate(value, { year: 'numeric' }) : placeholder}
          </span>
          <CalendarDays size={18} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="calendar-popover" sideOffset={8} align="start" dir="rtl">
          <div className="calendar-toolbar">
            <Button size="icon" variant="ghost" onClick={() => move(-1)} aria-label="ماه قبل">
              <ChevronRight size={18} />
            </Button>
            <div className="calendar-selects">
              <select
                aria-label="ماه"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {JALALI_MONTHS.map((m, i) => (
                  <option value={i + 1} key={m}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                aria-label="سال"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {Array.from({ length: 41 }, (_, i) => year - 20 + i).map((y) => (
                  <option key={y} value={y}>
                    {fa(y)}
                  </option>
                ))}
              </select>
            </div>
            <Button size="icon" variant="ghost" onClick={() => move(1)} aria-label="ماه بعد">
              <ChevronLeft size={18} />
            </Button>
          </div>
          <div className="calendar-grid">
            {WEEK_DAYS.map((d, i) => (
              <span key={i} className="calendar-weekday">
                {d}
              </span>
            ))}
            {Array.from({ length: offset }, (_, i) => (
              <span key={`blank${i}`} />
            ))}
            {Array.from({ length: count }, (_, i) => {
              const date = jalaliToISO(year, month, i + 1);
              return (
                <button
                  type="button"
                  key={date}
                  disabled={!!((min && date < min) || (max && date > max))}
                  onClick={() => {
                    onChange(date);
                    setOpen(false);
                  }}
                  aria-label={fullDate(date)}
                  aria-pressed={date === value}
                  className={cn(
                    'calendar-day',
                    date === value && 'selected',
                    date === todayISO() && 'today',
                  )}
                >
                  {fa(i + 1)}
                </button>
              );
            })}
          </div>
          <div className="calendar-bottom">
            <button
              type="button"
              disabled={!!((min && todayISO() < min) || (max && todayISO() > max))}
              onClick={() => {
                onChange(todayISO());
                setOpen(false);
              }}
            >
              امروز
            </button>
            <span>گاه‌شمار خورشیدی</span>
          </div>
          <Popover.Arrow className="popover-arrow" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
export function TimePicker({
  value,
  onChange,
  id,
}: {
  value?: string;
  onChange: (value: string) => void;
  id?: string;
}) {
  const [open, setOpen] = useState(false),
    [hour, setHour] = useState(value?.slice(0, 2) || '08'),
    [minute, setMinute] = useState(value?.slice(3, 5) || '00');
  useEffect(() => {
    if (open && value) {
      setHour(value.slice(0, 2));
      setMinute(value.slice(3, 5));
    }
  }, [open, value]);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button id={id} type="button" className={cn('input picker-trigger', !value && 'muted')}>
          <span dir="ltr">{value ? fa(value) : 'انتخاب ساعت'}</span>
          <Clock3 size={18} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={8} className="time-popover" dir="rtl">
          <p>ساعت ۲۴ ساعته</p>
          <div className="time-picker-row" dir="ltr">
            <Select
              value={hour}
              aria-label="ساعت"
              onChange={(e) => setHour(normalizeDigits(e.target.value))}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option value={String(h).padStart(2, '0')} key={h}>
                  {fa(String(h).padStart(2, '0'))}
                </option>
              ))}
            </Select>
            <span>:</span>
            <Select
              value={minute}
              aria-label="دقیقه"
              onChange={(e) => setMinute(normalizeDigits(e.target.value))}
            >
              {Array.from({ length: 60 }, (_, m) => (
                <option value={String(m).padStart(2, '0')} key={m}>
                  {fa(String(m).padStart(2, '0'))}
                </option>
              ))}
            </Select>
          </div>
          <div className="time-actions">
            <Button
              size="small"
              variant="ghost"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
            >
              <X size={14} />
              بدون ساعت
            </Button>
            <Button
              size="small"
              variant="primary"
              onClick={() => {
                onChange(`${hour}:${minute}`);
                setOpen(false);
              }}
            >
              انتخاب
            </Button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
