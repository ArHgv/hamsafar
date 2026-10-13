import type { Currency, ExpenseShare, SuggestedSettlement, Trip } from './types';
import { CURRENCY_LABELS } from './constants';
import { normalizeDigits } from './utils';
export const currencyScale = (currency: Currency) =>
  currency === 'USD' || currency === 'EUR' ? 100 : 1;
export function parseMoney(value: string, currency: Currency): number {
  const normalized = normalizeDigits(value);
  if (!/^(?:\d+)(?:\.\d{1,2})?$/.test(normalized)) return NaN;
  const n = Number(normalized) * currencyScale(currency);
  if (currencyScale(currency) === 1 && !Number.isInteger(n)) return NaN;
  return Math.round(n);
}
export function money(amount: number, currency: Currency, withUnit = true): string {
  const n = new Intl.NumberFormat('fa-IR', {
    maximumFractionDigits: currencyScale(currency) === 1 ? 0 : 2,
  }).format(amount / currencyScale(currency));
  return withUnit ? `${n} ${CURRENCY_LABELS[currency]}` : n;
}
export function compactMoney(amount: number, currency: Currency): string {
  const major = amount / currencyScale(currency);
  const unit =
    major >= 1e12
      ? { divisor: 1e12, label: 'تریلیون' }
      : major >= 1e9
        ? { divisor: 1e9, label: 'میلیارد' }
        : major >= 1e6
          ? { divisor: 1e6, label: 'میلیون' }
          : null;
  if (unit)
    return `${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 }).format(major / unit.divisor)} ${unit.label}`;
  return money(amount, currency, false);
}
export function amountInput(amount: number, currency: Currency) {
  return String(amount / currencyScale(currency));
}
export function equalSplit(amount: number, ids: string[]): ExpenseShare[] {
  if (
    !Number.isSafeInteger(amount) ||
    amount < 0 ||
    ids.length === 0 ||
    new Set(ids).size !== ids.length
  )
    throw new Error('INVALID_SPLIT');
  const base = Math.floor(amount / ids.length),
    remainder = amount % ids.length;
  return ids.map((memberId, i) => ({ memberId, amount: base + (i < remainder ? 1 : 0) }));
}
export function percentageSplit(
  amount: number,
  values: { memberId: string; percentage: number }[],
): ExpenseShare[] {
  if (
    !Number.isSafeInteger(amount) ||
    amount < 0 ||
    values.length === 0 ||
    new Set(values.map((v) => v.memberId)).size !== values.length
  )
    throw new Error('INVALID_SPLIT');
  const points = values.map((v) => Math.round(v.percentage * 100));
  if (
    values.some(
      (v, i) =>
        !Number.isFinite(v.percentage) ||
        v.percentage < 0 ||
        v.percentage > 100 ||
        Math.abs(v.percentage * 100 - points[i]) > 1e-7,
    ) ||
    points.reduce((a, b) => a + b, 0) !== 10000
  )
    throw new Error('INVALID_PERCENTAGES');
  const products = points.map((p) => BigInt(amount) * BigInt(p)),
    shares = products.map((p) => Number(p / 10000n));
  const remaining = amount - shares.reduce((a, b) => a + b, 0);
  const order = products
    .map((p, i) => ({ i, fraction: Number(p % 10000n) }))
    .sort((a, b) => b.fraction - a.fraction || a.i - b.i);
  for (let i = 0; i < remaining; i++) shares[order[i % order.length].i]++;
  return values.map((v, i) => ({
    memberId: v.memberId,
    percentage: v.percentage,
    amount: shares[i],
  }));
}
export function totalExpenses(trip: Trip) {
  return trip.expenses.reduce((sum, e) => sum + e.amount, 0);
}
export function balances(trip: Trip): Record<string, number> {
  const result: Record<string, number> = Object.fromEntries(trip.members.map((m) => [m.id, 0]));
  trip.expenses.forEach((e) => {
    result[e.payerId] = (result[e.payerId] || 0) + e.amount;
    e.shares.forEach((s) => {
      result[s.memberId] = (result[s.memberId] || 0) - s.amount;
    });
  });
  trip.settlements.forEach((s) => {
    result[s.fromId] = (result[s.fromId] || 0) + s.amount;
    result[s.toId] = (result[s.toId] || 0) - s.amount;
  });
  return result;
}
export function suggestSettlements(trip: Trip): SuggestedSettlement[] {
  const b = balances(trip),
    debtors = Object.entries(b)
      .filter(([, v]) => v < 0)
      .map(([id, n]) => ({ id, amount: -n }))
      .sort((a, b) => b.amount - a.amount || a.id.localeCompare(b.id));
  const creditors = Object.entries(b)
    .filter(([, v]) => v > 0)
    .map(([id, amount]) => ({ id, amount }))
    .sort((a, b) => b.amount - a.amount || a.id.localeCompare(b.id));
  const suggestions: SuggestedSettlement[] = [];
  let i = 0,
    j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount);
    if (amount > 0) suggestions.push({ fromId: debtors[i].id, toId: creditors[j].id, amount });
    debtors[i].amount -= amount;
    creditors[j].amount -= amount;
    if (debtors[i].amount === 0) i++;
    if (creditors[j].amount === 0) j++;
  }
  return suggestions;
}
export function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const rad = (v: number) => (v * Math.PI) / 180;
  const dlat = rad(b.latitude - a.latitude),
    dlon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dlon / 2) ** 2;
  const clamped = Math.min(1, Math.max(0, h));
  return 6371 * 2 * Math.atan2(Math.sqrt(clamped), Math.sqrt(1 - clamped));
}
