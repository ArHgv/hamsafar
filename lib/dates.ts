import { toJalaali, toGregorian } from 'jalaali-js';
import { fa } from './utils';
export const JALALI_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];
export const WEEK_DAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
export function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
export function parseISO(date: string): Date {
  return new Date(`${date}T12:00:00`);
}
export function addDays(date: string, days: number): string {
  const d = parseISO(date);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function dateToJalali(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return toJalaali(y, m, d);
}
export function jalaliToISO(y: number, m: number, d: number): string {
  const g = toGregorian(y, m, d);
  return `${g.gy}-${String(g.gm).padStart(2, '0')}-${String(g.gd).padStart(2, '0')}`;
}
export function formatDate(date: string, options: Intl.DateTimeFormatOptions = {}): string {
  if (!date) return 'تاریخ مشخص نشده';
  return new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long', ...options }).format(
    parseISO(date),
  );
}
export function fullDate(date: string) {
  return formatDate(date, { year: 'numeric', weekday: 'long' });
}
export function dateRange(start: string, end: string) {
  const a = dateToJalali(start),
    b = dateToJalali(end);
  return a.jy === b.jy && a.jm === b.jm
    ? `${fa(a.jd)} تا ${fa(b.jd)} ${JALALI_MONTHS[a.jm - 1]}`
    : `${formatDate(start)} تا ${formatDate(end)}`;
}
export function dayDifference(a: string, b: string) {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000);
}
export function tripDays(start: string, end: string) {
  return Math.max(1, dayDifference(start, end) + 1);
}
export function enumerateDays(start: string, end: string) {
  return Array.from({ length: Math.min(366, tripDays(start, end)) }, (_, i) => addDays(start, i));
}
export function tripStatus(
  start: string,
  end: string,
  today = todayISO(),
): 'upcoming' | 'active' | 'past' {
  return start > today ? 'upcoming' : end < today ? 'past' : 'active';
}
export const statusLabel = { upcoming: 'پیش رو', active: 'در سفر', past: 'خاطره‌شده' };
export function countdown(start: string): string {
  const n = dayDifference(todayISO(), start);
  return n > 0 ? `${fa(n)} روز تا سفر` : n === 0 ? 'امروز راه می‌افتیم' : 'وقت ساختن خاطره';
}
