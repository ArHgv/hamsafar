import { describe, expect, it } from 'vitest';
import {
  balances,
  equalSplit,
  parseMoney,
  percentageSplit,
  suggestSettlements,
} from '../lib/money';
import { tripSchema } from '../lib/schemas';
import { addDays, dateToJalali, jalaliToISO } from '../lib/dates';
import type { Trip } from '../lib/types';
describe('integer currency splitting', () => {
  it('allocates the remainder without losing money', () => {
    expect(equalSplit(100, ['a', 'b', 'c']).map((s) => s.amount)).toEqual([34, 33, 33]);
  });
  it('uses largest remainders for percentage splits', () => {
    const s = percentageSplit(101, [
      { memberId: 'a', percentage: 33.33 },
      { memberId: 'b', percentage: 33.33 },
      { memberId: 'c', percentage: 33.34 },
    ]);
    expect(s.reduce((n, x) => n + x.amount, 0)).toBe(101);
    expect(s[2].amount).toBe(34);
  });
  it('rejects percentages that do not total 100', () =>
    expect(() => percentageSplit(500, [{ memberId: 'a', percentage: 99 }])).toThrow());
  it('accepts Persian numbers and currency precision', () => {
    expect(parseMoney('۱٬۲۵۰٬۰۰۰', 'IRT')).toBe(1250000);
    expect(parseMoney('۱۲٫۵۰', 'USD')).toBe(1250);
    expect(parseMoney('12.5', 'IRT')).toBeNaN();
  });
  it('rejects duplicate participants', () => expect(() => equalSplit(100, ['a', 'a'])).toThrow());
  it('settles all balances after suggested transfers', () => {
    const t = {
      members: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      expenses: [{ amount: 301, payerId: 'a', shares: equalSplit(301, ['a', 'b', 'c']) }],
      settlements: [],
    } as unknown as Trip;
    expect(Object.values(balances(t)).reduce((a, b) => a + b, 0)).toBe(0);
    t.settlements = suggestSettlements(t).map((s, i) => ({
      ...s,
      id: String(i),
      date: '2026-10-13',
    }));
    expect(Object.values(balances(t))).toEqual([0, 0, 0]);
  });
});
describe('Jalali dates', () => {
  it('round trips a date across year boundaries', () => {
    const j = dateToJalali('2026-03-21');
    expect(j).toEqual({ jy: 1405, jm: 1, jd: 1 });
    expect(jalaliToISO(j.jy, j.jm, j.jd)).toBe('2026-03-21');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('rejects invalid imported trips', () =>
    expect(tripSchema.safeParse({ title: 'bad' }).success).toBe(false));
});
