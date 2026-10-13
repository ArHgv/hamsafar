'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Mail,
  ShieldCheck,
  Cloud,
  CheckCircle2,
  LockKeyhole,
} from 'lucide-react';
import { cloudConfigured, getSupabase } from '@/lib/supabase';
import { readableError } from '@/lib/utils';
import { useToast } from '@/store/use-ui-store';
import { BrandMark } from './ui/brand';
import { Button, Card, Field, Input, LinkButton } from './ui/primitives';
import { safeNext } from '@/lib/navigation';
const schema = z.object({
  name: z.string().trim().max(150).optional(),
  email: z.email('ایمیل معتبر بنویس.'),
  password: z.string().min(1, 'رمز عبور را بنویس.').max(128, 'رمز عبور بیش از حد طولانی است.'),
});
export function AuthPage() {
  const router = useRouter(),
    search = useSearchParams(),
    toast = useToast(),
    [mode, setMode] = useState<'login' | 'signup' | 'recover' | 'reset'>(
      search.get('mode') === 'reset' ? 'reset' : 'login',
    ),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [issue, setIssue] = useState(''),
    [success, setSuccess] = useState('');
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(
      mode === 'signup'
        ? schema.safeExtend({
            password: z
              .string()
              .min(8, 'رمز عبور باید حداقل ۸ نویسه داشته باشد.')
              .max(128, 'رمز عبور بیش از حد طولانی است.'),
          })
        : schema,
    ),
    defaultValues: { name: '', email: '', password: '' },
    mode: 'onTouched',
  });
  const next = safeNext(search.get('next'));
  const submit = handleSubmit(async (values) => {
    if (!cloudConfigured) return;
    setBusy(true);
    setIssue('');
    setSuccess('');
    try {
      const client = getSupabase()!;
      if (mode === 'signup') {
        if (!values.name?.trim()) {
          setIssue('نامت را بنویس تا هم‌سفرها بشناسندت.');
          return;
        }
        const { data, error } = await client.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            data: { name: values.name.trim() },
            emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (error) throw new Error(error.message);
        if (data.session) {
          toast('حسابت ساخته شد؛ خوش آمدی.');
          router.replace(next);
        } else
          setSuccess(
            'لینک تأیید به ایمیلت فرستاده شد. پوشه اسپم را هم ببین و پس از تأیید، وارد شو.',
          );
      } else {
        const { error } = await client.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });
        if (error) throw new Error(error.message);
        toast('خوش آمدی؛ سفرها منتظرت هستند.');
        router.replace(next);
      }
    } catch (e) {
      setIssue(readableError(e));
    } finally {
      setBusy(false);
    }
  });
  const recover = async () => {
    const email = getValues('email');
    if (!z.email().safeParse(email).success) {
      setIssue('ایمیل حسابت را درست بنویس.');
      return;
    }
    setBusy(true);
    setIssue('');
    try {
      const { error } = await getSupabase()!.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/auth/callback?reset=1`,
      });
      if (error) throw new Error(error.message);
      setSuccess('اگر این ایمیل حسابی داشته باشد، لینک تغییر رمز برایش ارسال می‌شود.');
    } catch (e) {
      setIssue(readableError(e));
    } finally {
      setBusy(false);
    }
  };
  const updatePassword = async () => {
    const password = getValues('password');
    if (password.length < 8) {
      setIssue('رمز تازه باید حداقل ۸ نویسه باشد.');
      return;
    }
    setBusy(true);
    setIssue('');
    try {
      const { error } = await getSupabase()!.auth.updateUser({ password });
      if (error) throw new Error(error.message);
      toast('رمز عبور به‌روز شد.');
      router.replace('/');
    } catch (e) {
      setIssue(readableError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-layout">
      <div className="auth-art">
        <img src="/images/gilan-cover.jpg" alt="جاده‌ای آرام در جنگل" />
        <Link href="/welcome" className="auth-art-brand">
          <BrandMark />
          <strong>هم‌سفر</strong>
        </Link>
        <div className="auth-art-copy">
          <span>داستان بعدی، هنوز نوشته نشده.</span>
          <h2>
            کمی دورتر
            <br />
            از روزمرگی.
          </h2>
          <p>برای خاطره‌هایی که هنوز ساخته نشده‌اند.</p>
        </div>
      </div>
      <div className="auth-main">
        <Link href="/" className="auth-back">
          <ArrowRight size={15} />
          برگشت به فضای سفر
        </Link>
        <div className="auth-form-wrap">
          <BrandMark />
          <h1>
            {mode === 'signup'
              ? 'به داستان ما خوش آمدی.'
              : mode === 'recover'
                ? 'یک رمز تازه، یک شروع تازه.'
                : mode === 'reset'
                  ? 'رمز تازه‌ات را بنویس.'
                  : 'خوش برگشتی، هم‌سفر.'}
          </h1>
          <p>
            {mode === 'recover'
              ? 'ایمیل حسابت را بنویس تا لینک تغییر رمز را بفرستیم.'
              : 'سفرهای تو، همراه‌های تو؛ یک فضای شخصی و امن.'}
          </p>
          {!cloudConfigured ? (
            <Card className="auth-local-notice">
              <Cloud size={26} />
              <h3>حساب ابری هنوز پیکربندی نشده.</h3>
              <p>
                برای استفاده از اپ نیازی به ورود نیست. ساخت سفر، برنامه، وسایل و حساب‌ها همین حالا
                روی دستگاه تو کار می‌کنند.
              </p>
              <LinkButton href="/" variant="primary">
                ادامه روی این دستگاه
                <ArrowLeft size={16} />
              </LinkButton>
              <Link href="/settings" className="text-link">
                راهنمای فعال‌سازی ورود
                <ArrowLeft size={14} />
              </Link>
            </Card>
          ) : (
            <>
              <Card className="auth-local-notice">
                <h3>ورود گروه چهارنفره</h3>
                <p>
                  هر نفر با ایمیل و رمز حساب خودش وارد شود. چهار همراهِ ثبت‌شده در سفر، به‌تنهایی
                  حساب ورود نیستند؛ مدیر باید حساب‌ها را در Supabase بسازد یا هر نفر ثبت‌نام و
                  ایمیلش را تأیید کند.
                </p>
                <p>
                  رمز پیش‌فرضی وجود ندارد. رمز موقت را خودتان تعیین کنید و خصوصی به صاحب حساب بدهید؛
                  سپس از «رمز عبورت را فراموش کردی؟» برای انتخاب رمز شخصی استفاده کنید. برای دیدن
                  سفر مشترک، لینک دعوت مدیر را با همان ایمیل باز کنید.
                </p>
              </Card>
              <div className="segmented auth-segmented">
                {['login', 'signup'].map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setMode(m as 'login' | 'signup');
                      setIssue('');
                      setSuccess('');
                    }}
                    className={mode === m ? 'active' : ''}
                  >
                    {m === 'login' ? 'ورود' : 'ساخت حساب'}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  if (mode === 'recover' || mode === 'reset') {
                    e.preventDefault();
                    void (mode === 'recover' ? recover() : updatePassword());
                  } else void submit(e);
                }}
                className="form-stack"
              >
                {mode === 'signup' && (
                  <Field label="نام تو" required id="auth-name" error={errors.name?.message}>
                    <Input
                      id="auth-name"
                      autoComplete="name"
                      placeholder="نامی که هم‌سفرها می‌شناسند"
                      {...register('name')}
                      maxLength={150}
                    />
                  </Field>
                )}
                {mode !== 'reset' && (
                  <Field label="ایمیل" required id="auth-email" error={errors.email?.message}>
                    <Input
                      id="auth-email"
                      type="email"
                      dir="ltr"
                      autoComplete="email"
                      placeholder="ایمیل تو"
                      {...register('email')}
                    />
                  </Field>
                )}
                {mode !== 'recover' && (
                  <Field
                    label={mode === 'reset' ? 'رمز عبور تازه' : 'رمز عبور'}
                    required
                    id="auth-password"
                    error={errors.password?.message}
                  >
                    <div className="password-input">
                      <Input
                        id="auth-password"
                        type={show ? 'text' : 'password'}
                        autoComplete={
                          mode === 'signup' || mode === 'reset'
                            ? 'new-password'
                            : 'current-password'
                        }
                        placeholder="حداقل ۸ نویسه"
                        dir="ltr"
                        {...register('password')}
                        maxLength={128}
                      />
                      <button
                        type="button"
                        aria-label={show ? 'پنهان کردن رمز' : 'نمایش رمز'}
                        onClick={() => setShow(!show)}
                      >
                        {show ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </Field>
                )}
                {mode === 'login' && (
                  <button
                    type="button"
                    className="forgot-password"
                    onClick={() => {
                      setMode('recover');
                      setIssue('');
                      setSuccess('');
                    }}
                  >
                    رمز عبورت را فراموش کردی؟
                  </button>
                )}
                {issue && (
                  <p className="field-error" role="alert">
                    {issue}
                  </p>
                )}
                {success && (
                  <div className="auth-success" role="status">
                    <CheckCircle2 size={20} />
                    <p>{success}</p>
                  </div>
                )}
                <Button type="submit" variant="primary" loading={busy}>
                  {mode === 'signup'
                    ? 'ساخت حساب هم‌سفر'
                    : mode === 'recover'
                      ? 'ارسال لینک تغییر رمز'
                      : mode === 'reset'
                        ? 'ذخیره رمز تازه'
                        : 'ورود به فضای سفر'}
                  <ArrowLeft size={16} />
                </Button>
              </form>
            </>
          )}
          <div className="auth-privacy">
            <ShieldCheck size={14} />
            <span>
              {cloudConfigured
                ? 'دسترسی ابری فقط برای اعضای مجاز سفر است؛ در دستگاه عمومی خارج شو.'
                : 'اطلاعات محلی روی همین مرورگر نگه‌داری می‌شود؛ از دستگاه شخصی استفاده کن.'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
