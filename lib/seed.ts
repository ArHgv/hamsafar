import type { ChecklistItem, Member, Trip } from './types';
import { jalaliToISO } from './dates';
import { MEMBER_COLORS } from './constants';

const id = (n: number) => `a81d2000-2f64-47b1-9c12-${String(n).padStart(12, '0')}`;

export const DEMO_TRIP_ID = id(1);
export const DEMO_TRIP_IDS = [DEMO_TRIP_ID];

const startDate = jalaliToISO(1405, 7, 23);
const endDate = jalaliToISO(1405, 7, 28);

export function seedTrips(): Trip[] {
  const createdAt = new Date().toISOString();
  const members: Member[] = ['آرین', 'عارف', 'ساج', 'دلارام'].map((name, i) => ({
    id: id(10 + i),
    name,
    role: i === 0 ? 'admin' : i === 1 ? 'treasurer' : 'planner',
    attendance: 'confirmed',
    color: MEMBER_COLORS[i],
    ...(i === 0 ? { userId: 'local-user' } : {}),
  }));

  const checklistNames: Array<{
    name: string;
    category: ChecklistItem['category'];
    priority?: ChecklistItem['priority'];
    shared?: boolean;
    quantity?: number;
  }> = [
    { name: 'کارت ملی و مدارک شناسایی', category: 'documents', priority: 'high' },
    {
      name: 'بلیط قطار و کد رزرو رفت و برگشت',
      category: 'documents',
      priority: 'high',
      shared: true,
    },
    { name: 'رزرو و کد تأیید هتل', category: 'documents', priority: 'high', shared: true },
    { name: 'کارت بانکی و مقداری وجه نقد', category: 'documents', priority: 'high' },
    { name: 'لباس مناسب هوای مهر مشهد', category: 'clothing' },
    { name: 'کفش راحت پیاده‌روی', category: 'clothing' },
    { name: 'لباس اضافه برای پنج روز', category: 'clothing', quantity: 2 },
    { name: 'شارژر گوشی و کابل اضافه', category: 'electronics' },
    { name: 'پاوربانک مشترک', category: 'electronics', shared: true },
    { name: 'هدفون و سرگرمی مسیر قطار', category: 'electronics' },
    { name: 'داروهای شخصی', category: 'medicine', priority: 'high' },
    { name: 'جعبه کمک‌های اولیه', category: 'medicine', priority: 'high', shared: true },
    { name: 'مسواک، خمیردندان و لوازم بهداشتی', category: 'hygiene' },
    { name: 'حوله و دمپایی هتل', category: 'hygiene' },
    { name: 'بطری آب قابل‌استفاده مجدد', category: 'food', priority: 'high' },
    { name: 'خوراکی و تنقلات مسیر قطار', category: 'food', shared: true },
    { name: 'کیسه لباس dirty و کیسه زباله', category: 'other', shared: true },
    { name: 'کیف کوچک روزانه و چتر سبک', category: 'other' },
  ];
  const checklist = checklistNames.map((item, i) => ({
    id: id(100 + i),
    name: item.name,
    category: item.category,
    done: i === 0,
    priority: item.priority ?? 'normal',
    quantity: item.quantity ?? 1,
    shared: item.shared ?? false,
    assignedTo: members[i % members.length].id,
  }));

  const locations = [
    {
      id: id(401),
      name: 'هتل نزدیک حرم مطهر',
      category: 'stay' as const,
      latitude: 36.2872,
      longitude: 59.6157,
      address: 'مشهد، محدوده خیابان امام رضا',
      notes: 'نام و نشانی دقیق هتل پیش از حرکت با رزرو تأیید شود.',
    },
    {
      id: id(402),
      name: 'ایستگاه راه‌آهن مشهد',
      category: 'station' as const,
      latitude: 36.2335,
      longitude: 59.6106,
      address: 'مشهد، میدان راه‌آهن',
    },
    {
      id: id(403),
      name: 'حرم مطهر امام رضا (ع)',
      category: 'sight' as const,
      latitude: 36.2883,
      longitude: 59.6168,
      address: 'مشهد، حرم مطهر رضوی',
    },
  ];

  const trip: Trip = {
    id: DEMO_TRIP_ID,
    title: 'پنج روز زیارت و آرامش در مشهد',
    destination: 'مشهد',
    startDate,
    endDate,
    budget: 30000000,
    currency: 'IRT',
    description: 'سفر چهار نفره با قطار و اقامت در هتل؛ از ۲۳ تا ۲۸ مهر ۱۴۰۵.',
    cover: '/images/mashhad-cover.jpg',
    ownerId: 'local-user',
    members,
    checklist,
    activities: [
      {
        id: id(201),
        title: 'حرکت با قطار به مشهد',
        date: startDate,
        time: '07:00',
        duration: 600,
        period: 'morning',
        kind: 'transport',
        status: 'pending',
        locationId: locations[1].id,
        notes: 'یک ساعت پیش از حرکت در ایستگاه حاضر شوید.',
      },
      {
        id: id(202),
        title: 'تحویل اتاق هتل',
        date: jalaliToISO(1405, 7, 24),
        time: '15:00',
        duration: 60,
        period: 'afternoon',
        kind: 'rest',
        status: 'pending',
        locationId: locations[0].id,
      },
      {
        id: id(203),
        title: 'زیارت حرم مطهر',
        date: jalaliToISO(1405, 7, 25),
        time: '09:00',
        duration: 180,
        period: 'morning',
        kind: 'sight',
        status: 'pending',
        locationId: locations[2].id,
      },
      {
        id: id(204),
        title: 'بازگشت با قطار',
        date: endDate,
        time: '16:00',
        duration: 600,
        period: 'afternoon',
        kind: 'transport',
        status: 'pending',
        locationId: locations[1].id,
      },
    ],
    expenses: [],
    settlements: [],
    locations,
    transport: {
      mode: 'train',
      outbound: {
        origin: 'تهران',
        destination: 'مشهد',
        departureTime: '07:00',
        arrivalTime: '17:00',
        terminal: 'ایستگاه راه‌آهن تهران',
        notes: 'بلیط و شماره واگن پیش از حرکت تکمیل شود.',
      },
      return: {
        origin: 'مشهد',
        destination: 'تهران',
        departureTime: '16:00',
        arrivalTime: '02:00',
        terminal: 'ایستگاه راه‌آهن مشهد',
      },
      route: 'تهران ← مشهد ← تهران',
      stops: 'ایستگاه‌های بین‌راهی طبق بلیط قطار',
    },
    createdAt,
    updatedAt: createdAt,
  };

  return [trip];
}
