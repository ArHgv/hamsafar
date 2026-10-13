import type { ChecklistCategory, ChecklistItem } from './types';
import { uid } from './utils';
type TemplateItem = {
  name: string;
  category: ChecklistCategory;
  shared?: boolean;
  priority?: ChecklistItem['priority'];
  quantity?: number;
};
export type ChecklistTemplateKey =
  'car' | 'train' | 'plane' | 'public' | 'city' | 'nature' | 'family';
const essentials: TemplateItem[] = [
  { name: 'کارت ملی و مدارک سفر', category: 'documents', priority: 'high' },
  { name: 'بلیط و رزرو اقامتگاه', category: 'documents', shared: true, priority: 'high' },
  { name: 'لباس مناسب فصل', category: 'clothing' },
  { name: 'کفش راحت', category: 'clothing' },
  { name: 'شارژر گوشی', category: 'electronics' },
  { name: 'پاوربانک', category: 'electronics', shared: true },
  { name: 'داروهای شخصی', category: 'medicine', priority: 'high' },
  { name: 'مسواک و لوازم بهداشتی', category: 'hygiene' },
  { name: 'بطری آب', category: 'food', priority: 'high' },
];
export const CHECKLIST_TEMPLATES: Record<
  ChecklistTemplateKey,
  { label: string; description: string; items: TemplateItem[] }
> = {
  car: {
    label: 'سفر جاده‌ای با خودرو',
    description: 'مدارک خودرو، ایمنی مسیر و وسایل ضروری جاده',
    items: [
      ...essentials,
      { name: 'گواهینامه و مدارک خودرو', category: 'documents', priority: 'high' },
      { name: 'جعبه کمک‌های اولیه', category: 'medicine', shared: true, priority: 'high' },
      { name: 'مثلث خطر و جلیقه شب‌نما', category: 'other', shared: true, priority: 'high' },
      { name: 'ابزار و لاستیک زاپاس', category: 'other', shared: true },
      { name: 'نقشه یا مسیریاب آفلاین', category: 'electronics', shared: true },
    ],
  },
  train: {
    label: 'سفر با قطار',
    description: 'بلیط، مدارک و راحتی در مسیر ریلی',
    items: [
      ...essentials,
      { name: 'بلیط قطار و کد رزرو', category: 'documents', priority: 'high' },
      { name: 'بالش گردنی و چشم‌بند', category: 'other' },
      { name: 'هدفون', category: 'electronics' },
      { name: 'خوراکی مسیر', category: 'food', shared: true },
    ],
  },
  plane: {
    label: 'سفر با هواپیما',
    description: 'مدارک پرواز، بار و وسایل داخل کابین',
    items: [
      ...essentials,
      { name: 'گذرنامه یا کارت ملی', category: 'documents', priority: 'high' },
      { name: 'کارت پرواز و اطلاعات چک‌این', category: 'documents', priority: 'high' },
      { name: 'کیف دستی داخل کابین', category: 'other', priority: 'high' },
      { name: 'قفل چمدان', category: 'other' },
      { name: 'بالش گردنی و چشم‌بند', category: 'other' },
    ],
  },
  public: {
    label: 'حمل‌ونقل عمومی',
    description: 'بلیط، مسیر و وسایل سبک برای اتوبوس یا سفر ترکیبی',
    items: [
      ...essentials,
      { name: 'بلیط و کد رزرو مسیر', category: 'documents', priority: 'high' },
      { name: 'کارت یا اپلیکیشن پرداخت کرایه', category: 'electronics', priority: 'high' },
      { name: 'نقشه و مسیرهای جایگزین', category: 'other', shared: true },
      { name: 'کیف کوچک و سبک روزانه', category: 'other' },
      { name: 'قفل چمدان', category: 'other' },
    ],
  },
  city: {
    label: 'یک سفر شهری',
    description: 'ضروری‌ها، برای یک سفر سبک و کوتاه',
    items: essentials,
  },
  nature: {
    label: 'دلِ طبیعت',
    description: 'ضروری‌ها و وسایل طبیعت‌گردی',
    items: [
      ...essentials,
      { name: 'چادر', category: 'camping', shared: true },
      { name: 'کیسه خواب', category: 'camping' },
      { name: 'چراغ پیشانی', category: 'camping' },
      { name: 'جعبه کمک‌های اولیه', category: 'medicine', shared: true, priority: 'high' },
      { name: 'بارانی', category: 'clothing' },
      { name: 'کیسه جمع‌آوری زباله', category: 'camping', shared: true },
    ],
  },
  family: {
    label: 'سفر خانوادگی',
    description: 'ضروری‌ها و خیال راحت برای کوچک‌ترها',
    items: [
      ...essentials,
      { name: 'دارو و پرونده پزشکی کودک', category: 'child', priority: 'high' },
      { name: 'لباس اضافه کودک', category: 'child', quantity: 3 },
      { name: 'خوراکی و بطری کودک', category: 'child' },
      { name: 'اسباب‌بازی کوچک', category: 'child' },
      { name: 'پوشک و دستمال', category: 'child' },
    ],
  },
};
export function checklistTemplateForTransport(
  mode: 'car' | 'plane' | 'train' | 'bus' | 'mixed',
): ChecklistTemplateKey {
  if (mode === 'car' || mode === 'plane' || mode === 'train') return mode;
  return 'public';
}
export function makeChecklistTemplate(
  key: ChecklistTemplateKey,
  existing: ChecklistItem[] = [],
): ChecklistItem[] {
  return (CHECKLIST_TEMPLATES[key]?.items || [])
    .filter((i) => !existing.some((e) => e.name === i.name))
    .map((i) => ({
      ...i,
      id: uid(),
      done: false,
      shared: i.shared || false,
      priority: i.priority || 'normal',
      quantity: i.quantity || 1,
    }));
}
