import type {
  ActivityKind,
  Attendance,
  ChecklistCategory,
  Currency,
  DayPeriod,
  ExpenseCategory,
  LocationCategory,
  MemberRole,
  TransportMode,
} from './types';
export const TRANSPORT_LABELS: Record<TransportMode, string> = {
  car: 'ماشین',
  plane: 'هواپیما',
  train: 'قطار',
  bus: 'اتوبوس',
  mixed: 'ترکیبی',
};
export const ROLE_LABELS: Record<MemberRole, string> = {
  viewer: 'فقط مشاهده',
  planner: 'ویرایش برنامه',
  treasurer: 'ویرایش هزینه‌ها',
  admin: 'مدیریت کامل',
};
export const ROLE_HINTS: Record<MemberRole, string> = {
  viewer: 'مشاهده تمام جزئیات سفر',
  planner: 'ویرایش برنامه، وسایل، مکان‌ها و مسیر',
  treasurer: 'ثبت و ویرایش هزینه‌ها و تسویه',
  admin: 'مدیریت سفر، اعضا و همه اطلاعات',
};
export const ATTENDANCE_LABELS: Record<Attendance, string> = {
  confirmed: 'همراه سفر',
  invited: 'دعوت‌شده',
  maybe: 'هنوز قطعی نیست',
  declined: 'نمی‌آید',
};
export const CURRENCY_LABELS: Record<Currency, string> = {
  IRT: 'تومان',
  IRR: 'ریال',
  USD: 'دلار',
  EUR: 'یورو',
};
export const PERIOD_LABELS: Record<DayPeriod, string> = {
  morning: 'صبح',
  noon: 'ظهر',
  afternoon: 'عصر',
  night: 'شب',
};
export const ACTIVITY_LABELS: Record<ActivityKind, string> = {
  sight: 'دیدنی',
  food: 'رستوران',
  experience: 'تفریح',
  transport: 'مسیر',
  rest: 'استراحت',
};
export const CHECKLIST_LABELS: Record<ChecklistCategory, string> = {
  documents: 'مدارک',
  clothing: 'لباس',
  electronics: 'لوازم الکترونیکی',
  medicine: 'دارو',
  food: 'خوراکی',
  hygiene: 'بهداشت',
  camping: 'کمپینگ',
  photography: 'عکاسی',
  child: 'کودک',
  other: 'سایر',
};
export const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  transport: 'حمل‌ونقل',
  food: 'غذا',
  hotel: 'اقامت',
  ticket: 'بلیط',
  shopping: 'خرید',
  entertainment: 'تفریح',
  fuel: 'سوخت',
  other: 'متفرقه',
};
export const LOCATION_LABELS: Record<LocationCategory, string> = {
  stay: 'اقامتگاه',
  restaurant: 'رستوران',
  airport: 'فرودگاه',
  station: 'ایستگاه قطار',
  terminal: 'ترمینال',
  fuel: 'پمپ‌بنزین',
  parking: 'پارکینگ',
  hospital: 'بیمارستان',
  atm: 'خودپرداز',
  sight: 'جاذبه گردشگری',
};
export const MEMBER_COLORS = ['#b9c6a3', '#cead98', '#9bb6c6', '#c1aed0', '#c9bf88', '#8bb9a4'];
export const COVER_OPTIONS = [
  { url: '/images/gilan-cover.jpg', name: 'جنگل' },
  { url: '/images/kashan-cover.jpg', name: 'شهر' },
  { url: '/images/desert-cover.jpg', name: 'کویر' },
];
