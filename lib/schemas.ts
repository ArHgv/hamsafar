import { z } from 'zod';
import type { Trip } from './types';
import { equalSplit, percentageSplit } from './money';
import { dayDifference } from './dates';
z.config(z.locales.fa());
const text = z.string().trim().min(1, 'این فیلد را تکمیل کنید').max(150, 'حداکثر ۱۵۰ نویسه');
const optionalText = z.string().max(3000, 'متن بیش از حد طولانی است').optional();
const id = z.string().min(1).max(100);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'تاریخ را انتخاب کنید')
  .refine((v) => {
    const d = new Date(`${v}T12:00:00Z`);
    return !isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === v;
  }, 'تاریخ معتبر نیست')
  .refine(
    (v) => v >= '1900-01-01' && v <= '2200-12-31',
    'تاریخ باید بین سال‌های ۱۹۰۰ و ۲۲۰۰ میلادی باشد',
  );
const time = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'ساعت معتبر وارد کنید')
  .optional()
  .or(z.literal(''));
const minorAmount = z
  .number()
  .int('مبلغ باید در واحد صحیح ارز باشد')
  .nonnegative('مبلغ نمی‌تواند منفی باشد')
  .max(1e12, 'مبلغ بیش از حد مجاز است');
export const attachmentSchema = z.object({
  id,
  name: text,
  mime: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  size: z
    .number()
    .int()
    .nonnegative()
    .max(10 * 1024 * 1024),
  localId: id.optional(),
  cloudPath: z.string().max(500).optional(),
});
export const memberSchema = z.object({
  id,
  name: text,
  email: z.email('ایمیل معتبر وارد کنید').optional().or(z.literal('')),
  userId: id.optional(),
  role: z.enum(['viewer', 'planner', 'treasurer', 'admin']),
  attendance: z.enum(['confirmed', 'invited', 'maybe', 'declined']),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
});
export const activitySchema = z.object({
  id,
  title: text,
  date,
  time,
  duration: z.number().int().min(5, 'حداقل ۵ دقیقه').max(1440, 'حداکثر یک روز'),
  period: z.enum(['morning', 'noon', 'afternoon', 'night']),
  kind: z.enum(['sight', 'food', 'experience', 'transport', 'rest']),
  status: z.enum(['pending', 'done', 'cancelled']),
  notes: optionalText,
  locationId: id.optional().or(z.literal('')),
});
export const checklistSchema = z.object({
  id,
  name: text,
  category: z.enum([
    'documents',
    'clothing',
    'electronics',
    'medicine',
    'food',
    'hygiene',
    'camping',
    'photography',
    'child',
    'other',
  ]),
  done: z.boolean(),
  priority: z.enum(['low', 'normal', 'high']),
  quantity: z.number().int().min(1, 'تعداد حداقل یک است').max(999),
  weight: z.number().nonnegative().max(100000).optional(),
  shared: z.boolean(),
  assignedTo: id.optional().or(z.literal('')),
});
export const expenseSchema = z
  .object({
    id,
    title: text,
    amount: minorAmount.refine((v) => v > 0, 'مبلغ باید بیشتر از صفر باشد'),
    payerId: id,
    category: z.enum([
      'transport',
      'food',
      'hotel',
      'ticket',
      'shopping',
      'entertainment',
      'fuel',
      'other',
    ]),
    date,
    notes: optionalText,
    splitMode: z.enum(['equal', 'custom', 'percentage']),
    shares: z
      .array(
        z.object({
          memberId: id,
          amount: minorAmount,
          percentage: z
            .number()
            .min(0)
            .max(100)
            .multipleOf(0.01, 'درصد را با حداکثر دو رقم اعشار وارد کنید')
            .optional(),
        }),
      )
      .min(1, 'حداقل یک نفر را انتخاب کنید'),
    receipt: attachmentSchema.optional(),
    createdAt: z.string(),
  })
  .superRefine((e, ctx) => {
    if (e.splitMode !== 'custom') {
      try {
        const expected =
          e.splitMode === 'equal'
            ? equalSplit(
                e.amount,
                e.shares.map((s) => s.memberId),
              )
            : percentageSplit(
                e.amount,
                e.shares.map((s) => ({ memberId: s.memberId, percentage: s.percentage ?? NaN })),
              );
        if (expected.some((share, i) => share.amount !== e.shares[i].amount))
          ctx.addIssue({
            code: 'custom',
            message: 'سهم‌ها با روش تقسیم هزینه همخوانی ندارند',
            path: ['shares'],
          });
      } catch {
        ctx.addIssue({
          code: 'custom',
          message: 'درصدها و اعضای تقسیم هزینه را بررسی کنید',
          path: ['shares'],
        });
      }
    }
    if (e.shares.reduce((a, b) => a + b.amount, 0) !== e.amount)
      ctx.addIssue({
        code: 'custom',
        message: 'مجموع سهم‌ها باید برابر مبلغ هزینه باشد',
        path: ['shares'],
      });
    if (new Set(e.shares.map((s) => s.memberId)).size !== e.shares.length)
      ctx.addIssue({ code: 'custom', message: 'عضو تکراری در تقسیم هزینه', path: ['shares'] });
    if (
      e.splitMode === 'percentage' &&
      e.shares.reduce((a, s) => a + Math.round((s.percentage ?? 0) * 100), 0) !== 10000
    )
      ctx.addIssue({ code: 'custom', message: 'مجموع درصدها باید ۱۰۰ باشد', path: ['shares'] });
  });
export const settlementSchema = z
  .object({
    id,
    fromId: id,
    toId: id,
    amount: minorAmount.refine((v) => v > 0, 'مبلغ باید بیشتر از صفر باشد'),
    date,
    notes: optionalText,
  })
  .refine((v) => v.fromId !== v.toId, {
    message: 'پرداخت‌کننده و دریافت‌کننده باید متفاوت باشند',
    path: ['toId'],
  });
export const locationSchema = z.object({
  id,
  name: text,
  category: z.enum([
    'stay',
    'restaurant',
    'airport',
    'station',
    'terminal',
    'fuel',
    'parking',
    'hospital',
    'atm',
    'sight',
  ]),
  latitude: z.number().min(-90, 'عرض جغرافیایی معتبر نیست').max(90),
  longitude: z.number().min(-180, 'طول جغرافیایی معتبر نیست').max(180),
  address: optionalText,
  notes: optionalText,
});
export const legSchema = z.object({
  origin: optionalText,
  destination: optionalText,
  departureTime: time,
  arrivalTime: time,
  routeNumber: optionalText,
  terminal: optionalText,
  platform: optionalText,
  checkinTime: time,
  ticket: attachmentSchema.optional(),
  notes: optionalText,
});
export const transportSchema = z.object({
  mode: z.enum(['car', 'plane', 'train', 'bus', 'mixed']),
  outbound: legSchema,
  return: legSchema,
  vehiclePlate: optionalText,
  fuelEstimate: z.number().min(0).max(10000).optional(),
  route: optionalText,
  stops: optionalText,
});
export const tripInfoSchema = z
  .object({
    title: text,
    destination: text,
    startDate: date,
    endDate: date,
    budget: minorAmount,
    currency: z.enum(['IRT', 'IRR', 'USD', 'EUR']),
    description: optionalText,
    cover: z
      .string()
      .max(650000)
      .refine(
        (v) =>
          /^\/images\/[a-z0-9-]+\.(?:jpg|png|webp)$/.test(v) ||
          /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v),
        'عکس کاور معتبر نیست',
      ),
  })
  .superRefine((v, ctx) => {
    if (v.endDate < v.startDate)
      ctx.addIssue({
        code: 'custom',
        message: 'تاریخ برگشت نمی‌تواند قبل از رفت باشد',
        path: ['endDate'],
      });
    if (dayDifference(v.startDate, v.endDate) > 365)
      ctx.addIssue({ code: 'custom', message: 'مدت سفر حداکثر یک سال است', path: ['endDate'] });
  });
export const tripSchema = tripInfoSchema
  .safeExtend({
    id: z.uuid('شناسه سفر معتبر نیست').transform((value) => value.toLowerCase()),
    members: z.array(memberSchema).min(1).max(100),
    activities: z.array(activitySchema).max(2000),
    checklist: z.array(checklistSchema).max(2000),
    expenses: z.array(expenseSchema).max(5000),
    settlements: z.array(settlementSchema).max(5000),
    locations: z.array(locationSchema).max(1000),
    transport: transportSchema,
    createdAt: z.string(),
    updatedAt: z.string(),
    ownerId: id,
    archived: z.boolean().optional(),
  })
  .superRefine((t, ctx) => {
    const members = new Set(t.members.map((m) => m.id));
    if (!t.members.some((m) => m.userId === t.ownerId && m.role === 'admin'))
      ctx.addIssue({
        code: 'custom',
        message: 'مدیر اصلی سفر باید در اعضا باقی بماند',
        path: ['members'],
      });
    for (const section of [
      'activities',
      'checklist',
      'expenses',
      'settlements',
      'locations',
    ] as const)
      if (new Set(t[section].map((item) => item.id)).size !== t[section].length)
        ctx.addIssue({ code: 'custom', message: 'شناسه تکراری در اطلاعات سفر', path: [section] });
    const locations = new Set(t.locations.map((location) => location.id));
    if (t.activities.some((activity) => activity.locationId && !locations.has(activity.locationId)))
      ctx.addIssue({
        code: 'custom',
        message: 'مکان برنامه در سفر وجود ندارد',
        path: ['activities'],
      });
    if (t.checklist.some((item) => item.assignedTo && !members.has(item.assignedTo)))
      ctx.addIssue({
        code: 'custom',
        message: 'مسئول وسیله در سفر وجود ندارد',
        path: ['checklist'],
      });
    const total = [...t.expenses, ...t.settlements].reduce((sum, entry) => sum + entry.amount, 0);
    if (total > 1e13)
      ctx.addIssue({
        code: 'custom',
        message: 'مجموع مبالغ این سفر از حد محاسبه امن بیشتر است',
        path: ['expenses'],
      });
    if (new TextEncoder().encode(JSON.stringify(t)).byteLength > 2097152)
      ctx.addIssue({
        code: 'custom',
        message: 'حجم اطلاعات سفر بیشتر از ۲ مگابایت است؛ عکس یا یادداشت‌ها را سبک‌تر کنید',
        path: ['description'],
      });
    if (members.size !== t.members.length)
      ctx.addIssue({ code: 'custom', message: 'اعضای تکراری در سفر', path: ['members'] });
    for (const e of t.expenses)
      if (!members.has(e.payerId) || e.shares.some((s) => !members.has(s.memberId)))
        ctx.addIssue({
          code: 'custom',
          message: 'عضو هزینه در سفر وجود ندارد',
          path: ['expenses'],
        });
    for (const s of t.settlements)
      if (!members.has(s.fromId) || !members.has(s.toId))
        ctx.addIssue({
          code: 'custom',
          message: 'عضو تسویه در سفر وجود ندارد',
          path: ['settlements'],
        });
    if (t.activities.some((a) => a.date < t.startDate || a.date > t.endDate))
      ctx.addIssue({
        code: 'custom',
        message: 'تاریخ برنامه باید در بازه سفر باشد',
        path: ['activities'],
      });
  });
export const backupSchema = z.object({
  version: z.literal(1),
  trips: z.array(tripSchema).max(100),
  exportedAt: z.string(),
});
export const validateTrip = (value: unknown): Trip => tripSchema.parse(value) as Trip;
