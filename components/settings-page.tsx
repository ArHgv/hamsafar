'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { z } from 'zod';
import {
  Settings,
  UserRound,
  Moon,
  Sun,
  Monitor,
  Cloud,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  Check,
  ShieldCheck,
  LogOut,
  Sparkles,
  ArrowUpLeft,
  Archive,
  RefreshCw,
  CircleHelp,
  Smartphone,
  WifiOff,
  Copy,
  ChevronDown,
} from 'lucide-react';
import type { Trip } from '@/lib/types';
import { backupSchema } from '@/lib/schemas';
import { cloudConfigured, getSupabase } from '@/lib/supabase';
import { publishTrip, resolveConflict, syncTrip } from '@/lib/cloud';
import { canEdit, roleFor } from '@/lib/permissions';
import { cn, copyText, downloadJSON, fa, readableError, readLocalStorage } from '@/lib/utils';
import { useTripStore } from '@/store/use-trip-store';
import { useToast } from '@/store/use-ui-store';
import { Avatar, Badge, Button, Card, Field, Input, Select, SectionHeading } from './ui/primitives';
import { ConfirmDialog, Dialog } from './ui/dialog';
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
export function SettingsPage() {
  const state = useTripStore(),
    { trips, cloudUser, localProfile, cloudTripIds, syncErrors, syncingIds, dirtyTripIds } = state,
    profile = cloudUser || localProfile,
    toast = useToast();
  const [name, setName] = useState(profile.name),
    [saving, setSaving] = useState(false),
    [guide, setGuide] = useState(false),
    [clearing, setClearing] = useState(false),
    [reset, setReset] = useState(false),
    [logout, setLogout] = useState(false),
    [install, setInstall] = useState<InstallEvent | null>(null),
    [installHelp, setInstallHelp] = useState(false),
    [imported, setImported] = useState<Trip[] | null>(null),
    [conflict, setConflict] = useState<string | null>(null),
    [choiceBusy, setChoiceBusy] = useState(false),
    [publishId, setPublishId] = useState(''),
    [publishing, setPublishing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null),
    localTrips = trips.filter((t) => !cloudTripIds.includes(t.id));
  useEffect(() => setName(profile.name), [profile.name]);
  useEffect(() => {
    const listener = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallEvent);
    };
    window.addEventListener('beforeinstallprompt', listener);
    return () => window.removeEventListener('beforeinstallprompt', listener);
  }, []);
  const backup = () => {
    downloadJSON(
      { version: 1, trips, exportedAt: new Date().toISOString() },
      'hamsafar-backup.json',
    );
    toast('نسخه پشتیبان اطلاعات آماده شد؛ پیوست‌های محلی در آن نیستند.', 'info');
  };
  const resolve = async (choice: 'local' | 'remote') => {
    if (!conflict) return;
    setChoiceBusy(true);
    try {
      backup();
      await resolveConflict(conflict, choice);
      toast('نسخه‌های سفر هماهنگ شدند.');
      setConflict(null);
    } catch (e) {
      toast(readableError(e), 'error');
    } finally {
      setChoiceBusy(false);
    }
  };
  return (
    <>
      <div className="page-intro small-heading">
        <div>
          <h1>به سلیقه‌ی تو.</h1>
          <p>حساب، ظاهر و خیالِ راحت برای اطلاعات سفر.</p>
        </div>
        <Settings size={24} className="muted" />
      </div>
      <div className="settings-layout">
        <div className="settings-main">
          <Card className="settings-card">
            <SectionHeading title="فضای شخصی" />
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!name.trim() || name.length > 150) {
                  toast('نام را بین یک تا ۱۵۰ نویسه بنویس.', 'error');
                  return;
                }
                setSaving(true);
                try {
                  if (cloudUser) {
                    const { error } = await getSupabase()!.auth.updateUser({
                      data: { name: name.trim() },
                    });
                    if (error) throw error;
                    useTripStore.getState().setCloudUser({ ...cloudUser, name: name.trim() });
                  } else state.setLocalProfile(name.trim());
                  toast('نامت به‌روز شد.');
                } catch (e) {
                  toast(readableError(e), 'error');
                } finally {
                  setSaving(false);
                }
              }}
            >
              <div className="settings-profile">
                <Avatar member={{ name: profile.name, color: '#b9c6a3' }} size={59} />
                <div>
                  <strong>{profile.name}</strong>
                  <small>{cloudUser?.email || 'حساب محلی · بدون نیاز به ورود'}</small>
                </div>
                <Badge tone={cloudUser ? 'accent' : 'neutral'}>
                  {cloudUser ? 'حساب ابری' : 'این دستگاه'}
                </Badge>
              </div>
              <div className="settings-name-row">
                <Field label="دوست داری چه صدایت کنیم؟" id="profile-name">
                  <Input
                    id="profile-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={150}
                  />
                </Field>
                <Button type="submit" loading={saving}>
                  ذخیره نام
                </Button>
              </div>
            </form>
          </Card>
          <Card className="settings-card">
            <SectionHeading
              title="ظاهر و آرامش"
              subtitle="مثل خودت؛ روشن، تاریک یا هماهنگ با دستگاه."
            />
            <div className="appearance-options">
              {[
                { key: 'dark', label: 'تیره', icon: Moon },
                { key: 'light', label: 'روشن', icon: Sun },
                { key: 'black-gold', label: 'مشکی / طلایی', icon: Moon },
                { key: 'white-gold', label: 'سفید / طلایی', icon: Sun },
                { key: 'system', label: 'دستگاه', icon: Monitor },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  className={cn('appearance-option', state.theme === key && 'selected')}
                  onClick={() =>
                    state.setTheme(key as 'dark' | 'light' | 'system' | 'black-gold' | 'white-gold')
                  }
                  aria-pressed={state.theme === key}
                >
                  <span className={`theme-preview theme-preview-${key}`}>
                    <i />
                    <i />
                    <i />
                  </span>
                  <span>
                    <Icon size={15} />
                    {label}
                    {state.theme === key && <Check size={13} />}
                  </span>
                </button>
              ))}
            </div>
            <div className="setting-toggle-row">
              <div>
                <strong>کاهش شفافیت</strong>
                <p>پس‌زمینه‌های یکدست‌تر برای خوانایی بیشتر و دستگاه‌های ضعیف‌تر.</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={state.reduceTransparency}
                  aria-label="کاهش شفافیت"
                  onChange={(e) => state.setTransparency(e.target.checked)}
                />
                <span />
              </label>
            </div>
            <p className="field-hint">انیمیشن‌ها از تنظیم «کاهش حرکت» دستگاه پیروی می‌کنند.</p>
          </Card>
          <Card className="settings-card" id="cloud-settings">
            <SectionHeading
              title="همکاری ابری"
              subtitle="ورود امن، دعوت اعضا و اطلاعات مشترک بین دستگاه‌ها."
              action={
                <Badge tone={cloudUser ? 'accent' : 'neutral'}>
                  <Cloud size={12} />
                  {cloudUser ? 'متصل' : cloudConfigured ? 'آماده ورود' : 'نیازمند تنظیم'}
                </Badge>
              }
            />
            {!cloudConfigured ? (
              <>
                <div className="cloud-settings-copy">
                  <span className="settings-cloud-icon">
                    <Cloud size={26} />
                  </span>
                  <div>
                    <h3>فعلاً همه‌چیز روی همین دستگاه است.</h3>
                    <p>
                      نسخه محلی کامل کار می‌کند. برای دعوت واقعی و همگام‌سازی گروه، کلیدهای Supabase
                      را هنگام استقرار وارد کن.
                    </p>
                  </div>
                </div>
                <Button onClick={() => setGuide(true)}>
                  <CircleHelp size={16} />
                  راهنمای ساده اتصال ابری
                </Button>
              </>
            ) : !cloudUser ? (
              <div className="cloud-settings-copy">
                <div>
                  <h3>فضای ابری آماده‌ست.</h3>
                  <p>وارد شو و سفرهای دلخواهت را ابری کن؛ سفرهای محلی خودکار بارگذاری نمی‌شوند.</p>
                  <Link
                    href="/login?next=/settings"
                    className="button button-primary"
                    style={{ marginTop: 15 }}
                  >
                    ورود یا ساخت حساب
                    <ArrowUpLeft size={15} />
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="cloud-settings-copy">
                  <span className="settings-cloud-icon">
                    <ShieldCheck size={26} />
                  </span>
                  <div>
                    <h3>{fa(cloudTripIds.length)} سفر در فضای مشترک تو</h3>
                    <p>
                      تغییرات سفرهای ابری خودکار همگام می‌شوند؛ اطلاعات محلی مستقل باقی می‌ماند.
                    </p>
                  </div>
                </div>
                {localTrips.length > 0 && (
                  <div className="publish-trip-row">
                    <Select
                      aria-label="انتخاب سفر برای انتقال به فضای ابری"
                      value={publishId}
                      onChange={(e) => setPublishId(e.target.value)}
                    >
                      <option value="">یک سفر محلی را انتخاب کن</option>
                      {localTrips.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                    </Select>
                    <Button
                      variant="primary"
                      disabled={!publishId}
                      loading={publishing}
                      onClick={async () => {
                        const trip = localTrips.find((t) => t.id === publishId);
                        if (!trip) return;
                        setPublishing(true);
                        try {
                          await publishTrip(trip);
                          toast('سفر به فضای ابری منتقل شد.');
                          setPublishId('');
                        } catch (e) {
                          toast(readableError(e), 'error');
                        } finally {
                          setPublishing(false);
                        }
                      }}
                    >
                      <Cloud size={15} />
                      ابری کن
                    </Button>
                  </div>
                )}
                {cloudTripIds.map((id) => {
                  const t = trips.find((t) => t.id === id);
                  if (!t) return null;
                  return (
                    <div className="sync-trip-row" key={id}>
                      <div>
                        <strong>{t.title}</strong>
                        <small className={syncErrors[id] ? 'danger' : ''}>
                          {syncErrors[id] ||
                            (syncingIds.includes(id)
                              ? 'در حال همگام‌سازی…'
                              : dirtyTripIds.includes(id)
                                ? 'تغییرات در انتظار ارسال'
                                : 'همگام با فضای ابری')}
                        </small>
                      </div>
                      {syncErrors[id] ? (
                        <Button size="small" onClick={() => setConflict(id)}>
                          بررسی نسخه‌ها
                        </Button>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="همگام‌سازی دوباره"
                          disabled={syncingIds.includes(id)}
                          onClick={() => {
                            state.setSyncError(id, '');
                            void syncTrip(id);
                          }}
                        >
                          <RefreshCw size={15} />
                        </Button>
                      )}
                    </div>
                  );
                })}
                <Button
                  variant="ghost"
                  onClick={() => setLogout(true)}
                  className="danger"
                  style={{ marginTop: 12 }}
                >
                  <LogOut size={15} />
                  خروج از حساب
                </Button>
              </>
            )}
          </Card>
          <Card className="settings-card">
            <SectionHeading
              title="اطلاعات تو، در اختیار تو"
              subtitle="پشتیبان بگیر؛ یک نسخه آرام برای روز مبادا."
            />
            <div className="backup-actions">
              <Button onClick={backup}>
                <Download size={16} />
                دریافت نسخه پشتیبان
              </Button>
              <Button onClick={() => fileRef.current?.click()}>
                <Upload size={16} />
                بازیابی اطلاعات
              </Button>
              <input
                ref={fileRef}
                className="sr-only"
                type="file"
                accept="application/json,.json"
                aria-label="انتخاب فایل پشتیبان"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    if (file.size > 12 * 1024 * 1024)
                      throw new Error('فایل باید کمتر از ۱۲ مگابایت باشد.');
                    const result = backupSchema.safeParse(JSON.parse(await file.text()));
                    if (!result.success) {
                      toast(`فایل پشتیبان معتبر نیست: ${result.error.issues[0].message}`, 'error');
                      return;
                    }
                    setImported(result.data.trips as Trip[]);
                  } catch {
                    toast('فایل JSON معتبر هم‌سفر را انتخاب کن.', 'error');
                  } finally {
                    e.target.value = '';
                  }
                }}
              />
            </div>
            <div className="backup-notice">
              <ShieldCheck size={15} />
              <p>
                خروجی شامل داده‌ها و کاور سفر است؛ فایل بلیط و رسید محلی در آن نیست. پیوست‌ها در
                حافظه این دستگاه یا فضای ابری نگه‌داری می‌شوند.
              </p>
            </div>
            {state.storageError &&
              typeof window !== 'undefined' &&
              readLocalStorage('hamsafar-recovery') && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    const raw = readLocalStorage('hamsafar-recovery');
                    downloadJSON({ raw }, 'hamsafar-recovery.json');
                  }}
                >
                  دریافت داده خامِ بازیابی
                </Button>
              )}
            <div className="data-summary">
              <span>{fa(localTrips.length)} سفر محلی</span>
              <span>{fa(cloudTripIds.length)} سفر ابری</span>
              <span>{fa(trips.reduce((n, t) => n + t.expenses.length, 0))} هزینه ثبت‌شده</span>
            </div>
            <div className="data-danger-actions">
              <Button size="small" variant="ghost" onClick={() => setReset(true)}>
                <RotateCcw size={14} />
                بازنشانی سفر شروع مشهد
              </Button>
              <Button
                size="small"
                variant="ghost"
                className="danger"
                onClick={() => setClearing(true)}
              >
                <Trash2 size={14} />
                پاک کردن سفرهای محلی
              </Button>
            </div>
          </Card>
          {trips.some((t) => t.archived) && (
            <Card className="settings-card">
              <SectionHeading title="یادگارهای بایگانی‌شده" />
              {trips
                .filter((t) => t.archived)
                .map((t) => {
                  const identity = cloudTripIds.includes(t.id)
                    ? cloudUser?.id || ''
                    : localProfile.id;
                  return (
                    <div className="archived-trip-row" key={t.id}>
                      <img src={t.cover} alt="" />
                      <Link href={`/trips/${t.id}`}>{t.title}</Link>
                      {canEdit(roleFor(t, identity), 'info') && (
                        <Button
                          size="small"
                          onClick={() => {
                            state.updateTrip(t.id, { archived: false }, ['info']);
                            toast('سفر به فهرست برگشت.');
                          }}
                        >
                          بازگرداندن
                        </Button>
                      )}
                    </div>
                  );
                })}
            </Card>
          )}
        </div>
        <aside className="settings-aside">
          <Card className="settings-install-card">
            <Smartphone size={29} />
            <h3>هم‌سفر، همیشه همراهت.</h3>
            <p>این وب‌اپ را روی صفحه اصلی گوشی یا رایانه نصب کن؛ مثل یک اپ، بی‌حاشیه و دم‌دست.</p>
            <Button
              variant="primary"
              onClick={async () => {
                if (!install) {
                  setInstallHelp(true);
                  return;
                }
                await install.prompt();
                const choice = await install.userChoice;
                if (choice.outcome === 'accepted') toast('هم‌سفر به دستگاهت اضافه شد.');
                setInstall(null);
              }}
            >
              <Download size={16} />
              نصب هم‌سفر
            </Button>
            <small>قابلیت نصب به مرورگر و اتصال امن بستگی دارد.</small>
          </Card>
          <Card className="settings-about">
            <Sparkles size={22} />
            <h3>کمی دورتر از روزمرگی.</h3>
            <p>هم‌سفر برای برنامه‌های سبک، حساب‌های روشن و خاطره‌های مشترک ساخته شده.</p>
            <Link href="/welcome">
              داستان هم‌سفر
              <ArrowUpLeft size={13} />
            </Link>
            <span className="latin">Hamsafar · v1.0.0</span>
          </Card>
        </aside>
      </div>
      <ConfirmDialog
        open={clearing}
        onOpenChange={setClearing}
        title="سفرهای محلی پاک شوند؟"
        description="همه سفرهای ذخیره‌شده روی این دستگاه حذف می‌شوند. سفرهای ابری تغییر نمی‌کنند."
        label="پاک کردن اطلاعات محلی"
        onConfirm={() => {
          state.clearLocal();
          toast('سفرهای محلی پاک شدند.');
        }}
      />
      <ConfirmDialog
        open={reset}
        onOpenChange={setReset}
        title="سفر شروع مشهد جایگزین شود؟"
        description="سفرهای محلی فعلی با سفر شروع مشهد جایگزین می‌شوند. سفرهای ابری حفظ می‌شوند."
        label="بازنشانی سفر شروع"
        onConfirm={() => {
          state.resetDemo();
          toast('سفر شروع مشهد آماده شد.');
        }}
      />
      <ConfirmDialog
        open={!!imported}
        onOpenChange={(v) => {
          if (!v) setImported(null);
        }}
        title="اطلاعات پشتیبان بازیابی شود؟"
        description={`${fa(imported?.length || 0)} سفر وارد فضای محلی می‌شود. سفرهای محلی هم‌شناسه جایگزین می‌شوند؛ نسخه ابری تغییر نمی‌کند.`}
        label="بازیابی اطلاعات"
        dangerous={false}
        onConfirm={() => {
          if (imported) {
            try {
              state.importTrips(imported);
              toast('سفرها از نسخه پشتیبان بازیابی شدند.');
            } catch (error) {
              toast(readableError(error), 'error');
            }
          }
        }}
      />
      <ConfirmDialog
        open={logout}
        onOpenChange={setLogout}
        title="از حساب ابری خارج می‌شوی؟"
        description={
          dirtyTripIds.length
            ? 'تغییرات همگام‌نشده وجود دارد. قبل از خروج یک خروجی اطلاعات دریافت می‌شود؛ پیوست‌ها را جداگانه نگه دار.'
            : 'نسخه محلی سفرهای ابری از این دستگاه پاک می‌شود؛ اصل اطلاعات در فضای ابری محفوظ است.'
        }
        label="خروج از حساب"
        dangerous={false}
        onConfirm={async () => {
          if (dirtyTripIds.length) backup();
          const { error } = await getSupabase()!.auth.signOut({ scope: 'local' });
          if (error) throw new Error(readableError(error));
          state.disconnectCloud();
          toast('از حساب خارج شدی؛ فضای محلی همچنان در دسترس است.');
        }}
      />
      <Dialog
        open={!!conflict}
        onOpenChange={(v) => {
          if (!choiceBusy && !v) setConflict(null);
        }}
        title="دو نسخه، یک تصمیم روشن"
        description="برای حفظ تغییرات محلی، پیش از عملیات یک خروجی اطلاعات دریافت می‌شود."
      >
        <div className="form-stack">
          <p className="muted" style={{ fontSize: 12 }}>
            می‌توانی نسخه ابری را دریافت کنی و تغییرات محلی این سفر را کنار بگذاری؛ یا بخش‌هایی که
            خودت تغییر داده‌ای را روی نسخه فعلی ابری بنویسی. گزینه دوم ممکن است تغییر هم‌زمان عضو
            دیگری در همان بخش را جایگزین کند.
          </p>
          <Button variant="primary" loading={choiceBusy} onClick={() => void resolve('remote')}>
            <Cloud size={16} />
            دریافت نسخه ابری
          </Button>
          <Button loading={choiceBusy} onClick={() => void resolve('local')}>
            <Upload size={16} />
            حفظ تغییرات محلی من
          </Button>
          <Button
            variant="ghost"
            loading={choiceBusy}
            onClick={async () => {
              if (!conflict) return;
              state.setSyncError(conflict, '');
              await syncTrip(conflict);
              if (!useTripStore.getState().syncErrors[conflict]) {
                toast('همگام‌سازی انجام شد.');
                setConflict(null);
              } else toast(useTripStore.getState().syncErrors[conflict], 'error');
            }}
          >
            <RefreshCw size={16} />
            فقط دوباره تلاش کن
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={guide}
        onOpenChange={setGuide}
        title="اتصال ابری، در سه قدم"
        description="نسخه محلی به هیچ تنظیمی نیاز ندارد. این مراحل فقط برای حساب و همکاری واقعی است."
      >
        <ol className="setup-steps">
          <li>
            <span>۱</span>
            <div>
              <h3>یک پروژه رایگان Supabase بساز.</h3>
              <p>
                در وب‌سایت Supabase، یک پروژه بساز. فایل{' '}
                <code className="latin">supabase/schema.sql</code> داخل پروژه هم‌سفر را در SQL
                Editor اجرا کن تا جدول‌ها، دسترسی‌ها، دعوت‌ها و محل فایل‌ها آماده شوند.
              </p>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                باز کردن Supabase
                <ArrowUpLeft size={13} />
              </a>
            </div>
          </li>
          <li>
            <span>۲</span>
            <div>
              <h3>دو کلید عمومی را وارد کن.</h3>
              <p>
                از بخش تنظیمات پروژه، نشانی پروژه و کلید عمومی anon یا publishable را کپی کن. در
                Vercel آن‌ها را با این نام‌ها در Environment Variables بگذار:
              </p>
              <pre className="config-code" dir="ltr">
                NEXT_PUBLIC_SUPABASE_URL{`\n`}NEXT_PUBLIC_SUPABASE_ANON_KEY
              </pre>
              <Button
                size="small"
                variant="ghost"
                onClick={() => {
                  void copyText('NEXT_PUBLIC_SUPABASE_URL\nNEXT_PUBLIC_SUPABASE_ANON_KEY')
                    .then(() => toast('نام متغیرها کپی شد.'))
                    .catch(() => toast('کپی خودکار ممکن نیست؛ نام‌ها را دستی کپی کن.', 'info'));
                }}
              >
                <Copy size={13} />
                کپی نام‌ها
              </Button>
              <p className="field-hint">
                هیچ‌وقت کلید service_role را در اپ یا متغیرهای عمومی قرار نده.
              </p>
            </div>
          </li>
          <li>
            <span>۳</span>
            <div>
              <h3>نشانی سایت را تأیید و دوباره مستقر کن.</h3>
              <p>
                در بخش Authentication → URL Configuration، دامنه سایتت را در Site URL و نشانی{' '}
                <code className="latin">https://your-domain/auth/callback**</code> را در Redirect
                URLs وارد کن. بعد در Vercel، Redeploy بزن. اکنون ورود و لینک دعوت فعال می‌شوند.
              </p>
            </div>
          </li>
        </ol>
        <p className="field-hint">
          راهنمای کامل اجرا، استقرار و محدودیت‌های سرویس رایگان در فایل README پروژه است.
        </p>
      </Dialog>
      <Dialog
        open={installHelp}
        onOpenChange={setInstallHelp}
        title="هم‌سفر روی صفحه اصلی"
        description="اگر دکمه نصب مرورگر هنوز ظاهر نشده، از منوی آن استفاده کن."
      >
        <div className="install-instructions">
          <div>
            <h3>در آیفون یا آیپد</h3>
            <p>
              سایت را در Safari باز کن؛ دکمه اشتراک‌گذاری را بزن و «افزودن به صفحه اصلی» را انتخاب
              کن.
            </p>
          </div>
          <div>
            <h3>در اندروید یا رایانه</h3>
            <p>
              در Chrome یا Edge، منوی مرورگر را باز کن و «نصب برنامه» یا «افزودن به صفحه اصلی» را
              بزن.
            </p>
          </div>
          <p className="field-hint">
            سایت باید با HTTPS باز شود. فایل‌های رابط پس از بارگیری ذخیره می‌شوند؛ نقشه آنلاین و
            همگام‌سازی به اینترنت نیاز دارند.
          </p>
        </div>
      </Dialog>
    </>
  );
}
