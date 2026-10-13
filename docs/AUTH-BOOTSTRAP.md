# ورود اجباری ابری و چهار حساب مستقل

وقتی هر دو `NEXT_PUBLIC_SUPABASE_URL` و `NEXT_PUBLIC_SUPABASE_ANON_KEY` تنظیم باشند،
رابط داشبورد و سفر تا پایان بررسی session نمایش داده نمی‌شود و کاربر بدون session به
`/login?next=...` می‌رود. پس از ورود به مسیر قبلی برمی‌گردد. مسیرهای `/login`، `/auth`،
`/invite` و `/welcome` و زیرمسیرهای آن‌ها عمومی هستند. جست‌وجوی سفر روی صفحات عمومی
نمایش داده نمی‌شود. بدون تنظیم Supabase، حالت محلی برای توسعه همچنان فعال است.

این guard در سمت مرورگر است؛ دادهٔ واقعی ابری با RLS در `supabase/schema.sql` محافظت
می‌شود. guard جایگزین RLS نیست و حافظه محلی مرورگر را رمزگذاری یا پاک نمی‌کند.
اعضای نمونهٔ سفر، حساب Supabase نیستند و ساخت حساب نیز خودکار عضویت سفر ایجاد نمی‌کند.

## ایمیل‌های پیشنهادی و credentials

| نفر | ایمیل پیشنهادی (فقط الگو) | رمز               |
| --- | ------------------------- | ----------------- |
| ۱   | `hamsafar1@example.com`   | خودتان تعیین کنید |
| ۲   | `hamsafar2@example.com`   | خودتان تعیین کنید |
| ۳   | `hamsafar3@example.com`   | خودتان تعیین کنید |
| ۴   | `hamsafar4@example.com`   | خودتان تعیین کنید |

`example.com` فقط نمونه است؛ برای حساب واقعی، از چهار ایمیل قابل دسترس و تحت کنترل
اعضا استفاده کنید. هیچ رمز پیش‌فرض یا حساب واقعی در سورس وجود ندارد. برای هر نفر
یک رمز موقت مستقل و قوی (۱۲ تا ۱۲۸ نویسه) خودتان انتخاب کنید؛ اسکریپت رمز را چاپ نمی‌کند.

## روش مدیریت‌شده با اسکریپت

۱. schema را طبق `docs/CLOUD.md` در پروژه خودتان اجرا کنید و URLهای callback/SMTP را
تنظیم کنید. مالکیت چهار ایمیل را پیش از provisioning جداگانه احراز کنید؛ این اسکریپت
مدیریتی حساب‌ها را با `email_confirm: true` می‌سازد و ایمیل تأیید نمی‌فرستد.

۲. روی رایانه مورد اعتماد مدیر، کلید **service_role** همان پروژه را فقط در محیط همان
فرآیند قرار دهید. این کلید هیچ‌وقت نباید `NEXT_PUBLIC_`، تنظیم کلاینت، سورس، log یا
commit باشد. کلید عمومی anon اجازهٔ `admin.createUser` ندارد.

۳. نمونهٔ PowerShell زیر ورودی کلید و رمزها را مخفی می‌گیرد؛ هیچ مقدار واقعی را در
متن فرمان ننویسید. از پوشه پروژه، بعد از `npm ci` اجرا کنید:

```powershell
function Read-PrivateValue($Prompt) {
  $secret = Read-Host $Prompt -AsSecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}
try {
  $env:SUPABASE_URL = Read-Host 'Supabase HTTPS project URL'
  $env:SUPABASE_SERVICE_ROLE_KEY = Read-PrivateValue 'Service role key (hidden)'
  foreach ($i in 1..4) {
    [Environment]::SetEnvironmentVariable("BOOTSTRAP_USER_${i}_EMAIL", (Read-Host "User $i real email"), 'Process')
    [Environment]::SetEnvironmentVariable("BOOTSTRAP_USER_${i}_PASSWORD", (Read-PrivateValue "Choose user $i temporary password (hidden)"), 'Process')
  }
  node supabase/bootstrap-four-users.mjs
} finally {
  [Environment]::SetEnvironmentVariable('SUPABASE_SERVICE_ROLE_KEY', $null, 'Process')
  [Environment]::SetEnvironmentVariable('SUPABASE_URL', $null, 'Process')
  foreach ($i in 1..4) {
    [Environment]::SetEnvironmentVariable("BOOTSTRAP_USER_${i}_EMAIL", $null, 'Process')
    [Environment]::SetEnvironmentVariable("BOOTSTRAP_USER_${i}_PASSWORD", $null, 'Process')
  }
}
```

۴. خروجی موفق فقط شماره حساب و ایمیل را نشان می‌دهد؛ **رمز همان مقداری است که خودتان
تعیین کردید**. رمز را خصوصی به صاحب حساب بدهید، نه در مخزن یا گروه عمومی. صاحب حساب
با بازیابی رمز در login و لینک ایمیل، رمز شخصی انتخاب کند. این اسکریپت الزام خودکار
تغییر رمز در اولین ورود ایجاد نمی‌کند.

۵. در خطا، حساب‌های قبلی ممکن است ساخته شده باشند. قبل از اجرای مجدد فهرست
Authentication → Users را بررسی کنید؛ اسکریپت حساب موجود را بازنویسی یا رمز آن را
reset نمی‌کند. به‌خصوص پس از خطای شبکه، نتیجهٔ ایجاد آخرین حساب نامطمئن است.

۶. مدیر سفر را ابری کند، ایمیل صحیح همراه‌ها را وارد و برای هر نفر لینک دعوت ایجاد
کند. هر نفر با ایمیل خودش وارد شود و لینک را بپذیرد؛ سپس دسترسی را با دو مرورگر مستقل
آزمایش کنید.

## بدون service_role

ساخت مدیریت‌شدهٔ چهار کاربر از این اسکریپت بدون دسترسی مدیریتی ممکن نیست. در این
محیط هیچ حساب واقعی ساخته یا اتصال واقعی آزمایش نشده است. جایگزین، ساخت دستی در
داشبورد Supabase با دسترسی مالک، یا ثبت‌نام جداگانهٔ هر عضو از خود اپ و تأیید ایمیل
است (اگر signup در پروژه فعال باشد). برای این مسیر نیازی به ارائهٔ service_role
به اپ نیست. حساب خودکارِ ازقبل‌ساخته‌شده یا رمز آماده‌ای وعده داده نمی‌شود.
