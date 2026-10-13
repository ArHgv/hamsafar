# راهنمای انتشار روی Vercel

## حالت پیشنهادی: Vercel + Supabase

هم‌سفر همین حالا با حالت محلی بدون سرویس کار می‌کند و برای همکاری بین چند دستگاه، آداپتر ابری موجود آن **Supabase** است. Supabase برای این پروژه عملاً همان نقش Firebase را دارد: ورود، PostgreSQL، Storage خصوصی و Realtime. بنابراین برای راه‌اندازی فعلی، Firebase لازم نیست و اضافه‌کردن هم‌زمان هر دو سرویس باعث دو منبع داده و خطاهای همگام‌سازی می‌شود.

1. محتوای پوشه `hamsafar` را در یک مخزن GitHub قرار بده؛ `node_modules`، `.next` و `.env.local` را آپلود نکن.
2. در Vercel یک پروژه جدید بساز و همان مخزن را انتخاب کن. فایل `vercel.json` تنظیمات build را آماده کرده است.
3. در Supabase پروژه بساز و کل `supabase/schema.sql` را در SQL Editor اجرا کن.
4. در Vercel از مسیر **Project Settings → Environment Variables** این دو مقدار عمومی را اضافه کن:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=کلید_anon_یا_publishable
```

5. در Supabase از بخش **Authentication → URL Configuration**، دامنه واقعی Vercel و مسیر زیر را اضافه کن:

```text
https://YOUR_APP.vercel.app/auth/callback**
```

6. بعد از ذخیره متغیرها، در Vercel گزینه **Redeploy** را بزن؛ چون متغیرهای `NEXT_PUBLIC_` هنگام build داخل برنامه قرار می‌گیرند.

## نکات امنیتی

- فقط `anon`/`publishable` را در Vercel بگذار؛ `service_role`، رمز پایگاه‌داده و کلیدهای secret هرگز نباید در مرورگر باشند.
- Bucket فایل `trip-files` باید خصوصی بماند و دسترسی آن با RLS/Storage Policy فایل SQL کنترل شود.
- دامنه‌های Redirect را محدود به دامنه‌های خودت کن، نه یک wildcard عمومی.
- سهمیه رایگان Vercel و Supabase ثابت و تضمین‌شده نیست؛ وضعیت آن‌ها را پیش از استفاده جدی بررسی کن.

## آیا می‌شود Firebase استفاده کرد؟

بله، اما تبدیل Supabase به Firebase یک مهاجرت معماری است، نه فقط افزودن چند کلید محیطی. باید لایه `lib/cloud.ts`، ورود، Realtime، Storage، مدل داده و Rules به Firebase Auth/Firestore/Storage منتقل شوند و سپس با دو حساب واقعی تست شوند. سورس فعلی عمداً این دو مسیر را با هم مخلوط نمی‌کند تا داده‌ها دو نسخه نشوند. اگر Firebase الزام پروژه است، این سند نقطه شروع مهاجرت است؛ برای نسخه فعلی، Supabase مسیر پشتیبانی‌شده و آماده انتشار است.

## تست قبل از انتشار

در پوشه پروژه اجرا کن:

```bash
npm ci
npm run check
npm run build
npm run format:check
```

پس از انتشار، ورود، ساخت سفر، افزودن وسیله، تغییر تم و همگام‌سازی دو حساب را در دو مرورگر جدا امتحان کن. فهرست کامل سناریوهای ابری در `docs/CLOUD.md` است.
