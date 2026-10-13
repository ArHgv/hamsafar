import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
export function fa(value: number | string): string {
  return String(value)
    .replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)])
    .replace(/\./g, '٫');
}
export function normalizeDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[٬,\s]/g, '')
    .replace(/٫/g, '.')
    .replace(/−/g, '-');
}
export const uid = () => crypto.randomUUID();
export function downloadJSON(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function copyText(value: string) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const input = document.createElement('textarea');
  input.value = value;
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand('copy');
  input.remove();
  if (!copied) throw new Error('COPY_FAILED');
}
export function readableError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('REVISION_CONFLICT'))
      return 'نسخه سفر تغییر کرده است. برای حفظ تغییرات دیگران، ابتدا نسخه جدید را دریافت کنید.';
    if (/fetch|network|Failed to fetch/i.test(error.message))
      return 'اتصال اینترنت برقرار نیست. اطلاعات روی این دستگاه محفوظ است؛ دوباره تلاش کنید.';
    if (/permission|denied|FORBIDDEN/i.test(error.message))
      return 'اجازه ویرایش این بخش را ندارید. از مدیر سفر بخواهید دسترسی شما را تغییر دهد.';
    if (/Invalid login credentials/i.test(error.message)) return 'ایمیل یا رمز عبور درست نیست.';
    if (/Email not confirmed|EMAIL_NOT_CONFIRMED/i.test(error.message))
      return 'ابتدا لینک تأیید ارسال‌شده به ایمیل را باز کنید.';
    if (/already registered/i.test(error.message))
      return 'این ایمیل قبلاً ثبت شده؛ وارد حساب شوید.';
    if (/rate limit/i.test(error.message))
      return 'درخواست‌ها بیش از حد مجاز است. چند دقیقه دیگر تلاش کنید.';
    if (/INVITE_EXPIRED|INVALID_INVITE/i.test(error.message))
      return 'لینک دعوت نامعتبر یا منقضی شده است. لینک تازه‌ای از مدیر سفر بخواهید.';
    if (/AUTH_CALLBACK|code verifier|code.*expired|otp.*expired/i.test(error.message))
      return 'لینک ورود کامل نشد یا منقضی شده است. در همان مرورگر درخواست‌دهنده دوباره وارد شوید یا لینک تازه بگیرید.';
    if (/AUTH_REQUIRED/i.test(error.message)) return 'برای ادامه، وارد حساب خود شوید.';
    if (/COPY_FAILED/i.test(error.message))
      return 'مرورگر اجازه کپی نداد. لینک را انتخاب و دستی کپی کنید.';
    if (/TRIP_LIMIT/i.test(error.message))
      return 'حداکثر ۱۰۰ سفر قابل نگه‌داری است. ابتدا از سفرهای قدیمی نسخه پشتیبان بگیرید.';
    if (/MEMBER_LIMIT|INVITE_LIMIT/i.test(error.message))
      return 'ظرفیت اعضا یا دعوت‌های فعال این سفر تکمیل شده است.';
    if (/CURRENCY_LOCKED/i.test(error.message))
      return 'ارز سفر دارای هزینه یا تسویه قابل تغییر نیست.';
    if (/MONEY_TOTAL_LIMIT/i.test(error.message))
      return 'مجموع مبالغ این سفر از حد محاسبه امن بیشتر است.';
    if (/QuotaExceeded|SecurityError|IndexedDB/i.test(error.name + error.message))
      return 'ذخیره‌سازی مرورگر در دسترس نیست یا فضای آن پر است. یک نسخه پشتیبان بگیرید.';
    if (/MISSING_FILE/i.test(error.message))
      return 'یکی از پیوست‌ها در این دستگاه پیدا نشد. دوباره آن را انتخاب کنید.';
    const issue = (error as Error & { issues?: { message: string }[] }).issues?.[0]?.message;
    if (issue && /[\u0600-\u06ff]/.test(issue)) return issue;
    if (error.message.length < 350 && /[\u0600-\u06ff]/.test(error.message)) return error.message;
  }
  return 'عملیات انجام نشد. اتصال و تنظیمات را بررسی کنید و دوباره تلاش کنید.';
}

export function readLocalStorage(key: string): string | null {
  try {
    return typeof window === 'undefined' ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}
