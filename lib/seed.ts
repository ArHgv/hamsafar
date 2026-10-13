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
      name: 'هتل مرآت',
      category: 'stay' as const,
      latitude: 36.2876,
      longitude: 59.6153,
      address: 'مشهد، محدوده خیابان امام رضا',
      notes:
        'مختصات تقریبی است؛ با لینک گوگل‌مپ تطبیق داده شود. نام و نشانی دقیق هتل پیش از حرکت با رزرو تأیید شود.',
      googleMapsUrl: 'https://maps.google.com/?q=7JG3%2BVQ5,+Mashhad',
    },
    {
      id: id(402),
      name: 'حرم امام رضا',
      category: 'sight' as const,
      latitude: 36.2883,
      longitude: 59.6168,
      address: 'مشهد، حرم مطهر رضوی',
      notes: 'مختصات تقریبی است؛ با لینک گوگل‌مپ تطبیق داده شود.',
      googleMapsUrl: 'https://maps.google.com/?q=7JQ8%2B67J,+Mashhad',
    },
    {
      id: id(403),
      name: 'بازار رضا',
      category: 'sight' as const,
      latitude: 36.2855,
      longitude: 59.6162,
      address: 'مشهد، خیابان امام رضا، بازار رضا',
      notes: 'مختصات تقریبی است؛ با لینک گوگل‌مپ تطبیق داده شود.',
      googleMapsUrl: 'https://maps.google.com/?q=District+Samen,+Mashhad',
    },
    {
      id: id(404),
      name: 'پارک کوهسنگی',
      category: 'sight' as const,
      latitude: 36.2773,
      longitude: 59.5488,
      address: 'مشهد، پارک کوهسنگی',
      notes: 'مختصات تقریبی است؛ با لینک گوگل‌مپ تطبیق داده شود.',
      googleMapsUrl: 'https://maps.google.com/?q=7HH5%2BQC7,+Mashhad',
    },
    {
      id: id(405),
      name: 'پارک ملت',
      category: 'sight' as const,
      latitude: 36.3167,
      longitude: 59.5327,
      address: 'مشهد، پارک ملت',
      notes: 'مختصات تقریبی است؛ با لینک گوگل‌مپ تطبیق داده شود.',
      googleMapsUrl: 'https://maps.google.com/?q=8GCQ%2B947,+Mashhad',
    },
    {
      id: id(406),
      name: 'مجتمع کوهسر',
      category: 'sight' as const,
      latitude: 36.3465,
      longitude: 59.5122,
      address: 'مشهد، مجتمع کوهسر',
      notes: 'مختصات تقریبی است؛ با لینک گوگل‌مپ تطبیق داده شود.',
      googleMapsUrl: 'https://maps.google.com/?q=8F2W%2B982,+Mashhad',
    },
    {
      id: id(407),
      name: 'سرزمین موج‌های آبی',
      category: 'sight' as const,
      latitude: 36.3658,
      longitude: 59.5054,
      address: 'مشهد، سرزمین موج‌های آبی',
      notes: 'مختصات تقریبی است؛ با لینک گوگل‌مپ تطبیق داده شود.',
      googleMapsUrl: 'https://maps.google.com/?q=9G4G%2BR27,+Mashhad',
    },
    {
      id: id(408),
      name: 'سرزمین موج‌های خروشان',
      category: 'sight' as const,
      latitude: 36.2525,
      longitude: 59.3835,
      address: 'مشهد، شاندیز، سرزمین موج‌های خروشان',
      notes: 'مختصات تقریبی است؛ با لینک گوگل‌مپ تطبیق داده شود.',
      googleMapsUrl: 'https://maps.google.com/?q=9C5F%2BMWM,+Mashhad',
    },
    {
      id: id(409),
      name: 'پایانه الغدیر یزد',
      category: 'terminal' as const,
      latitude: 31.8978,
      longitude: 54.3587,
      address: 'یزد، پایانه الغدیر',
      notes: 'مختصات تقریبی است؛ با لینک گوگل‌مپ تطبیق داده شود.',
      googleMapsUrl: 'https://maps.google.com/?q=V7GM%2BHRF,+Yazd',
    },
    {
      id: id(410),
      name: 'پایانه امام علی بافق یزد',
      category: 'terminal' as const,
      latitude: 31.6038,
      longitude: 55.4017,
      address: 'بافق، یزد، پایانه امام علی',
      notes: 'مختصات تقریبی است؛ با لینک گوگل‌مپ تطبیق داده شود.',
      googleMapsUrl: 'https://maps.google.com/?q=H9WJ%2BXJ9,+Bafq',
    },
    {
      id: id(411),
      name: 'ایستگاه قطار بافق',
      category: 'station' as const,
      latitude: 31.6121,
      longitude: 55.4085,
      address: 'بافق، ایستگاه راه‌آهن',
      notes: 'مختصات تقریبی است؛ با لینک گوگل‌مپ تطبیق داده شود.',
      googleMapsUrl: 'https://maps.google.com/?q=8H3QH9QX%2B4M,+Bafq',
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
        locationId: locations[1].id,
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
        locationId: locations[10].id,
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
