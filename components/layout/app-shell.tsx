'use client';
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as Popover from '@radix-ui/react-popover';
import { motion } from 'framer-motion';
import {
  Home,
  MapPinned,
  CalendarDays,
  Backpack,
  Wallet,
  Users,
  Map,
  Settings,
  ChevronLeft,
  Search,
  Bell,
  MoreHorizontal,
  ArrowUpLeft,
  Sparkles,
  Cloud,
  Check,
  WifiOff,
  CircleHelp,
} from 'lucide-react';
import { useTripStore } from '@/store/use-trip-store';
import { useUIStore } from '@/store/use-ui-store';
import { countdown, fullDate, todayISO, tripStatus, formatDate } from '@/lib/dates';
import { cn, fa } from '@/lib/utils';
import { BrandMark } from '../ui/brand';
import { Avatar, Button, Card, Input, TextLink } from '../ui/primitives';
import { Dialog } from '../ui/dialog';
import { DatePicker } from '../ui/date-picker';
const navigation = [
  { href: '/', label: 'نمای کلی', icon: Home },
  { href: '/trips', label: 'سفرهای من', icon: MapPinned },
  { href: '/planning', label: 'برنامه‌ریزی', icon: CalendarDays },
  { href: '/checklist', label: 'کیف سفر', icon: Backpack },
  { href: '/expenses', label: 'هزینه‌ها و تسویه', icon: Wallet },
  { href: '/locations', label: 'مکان‌ها', icon: Map },
  { href: '/groups', label: 'هم‌سفرها', icon: Users },
];
const titles: Record<string, string> = {
  '/': 'نمای کلی',
  '/trips': 'سفرهای من',
  '/planning': 'برنامه‌ریزی',
  '/checklist': 'کیف سفر',
  '/expenses': 'هزینه‌ها',
  '/settlements': 'تسویه حساب',
  '/locations': 'مکان‌ها',
  '/groups': 'هم‌سفرها',
  '/settings': 'تنظیمات',
  '/trips/new': 'ساخت سفر تازه',
};
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname(),
    router = useRouter(),
    [more, setMore] = useState(false),
    [calendar, setCalendar] = useState(false),
    [day, setDay] = useState(todayISO()),
    [online, setOnline] = useState(true);
  const trips = useTripStore((s) => s.trips),
    hydrated = useTripStore((s) => s.hydrated),
    local = useTripStore((s) => s.localProfile),
    cloud = useTripStore((s) => s.cloudUser),
    storageError = useTripStore((s) => s.storageError),
    syncErrors = useTripStore((s) => s.syncErrors),
    dirty = useTripStore((s) => s.dirtyTripIds);
  const setSearch = useUIStore((s) => s.setSearchOpen),
    profile = cloud || local;
  const simple =
    pathname.startsWith('/welcome') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/invite') ||
    pathname.startsWith('/auth');
  const upcoming = trips
    .filter((t) => !t.archived && tripStatus(t.startDate, t.endDate) !== 'past')
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const active = (href: string) =>
    href === '/'
      ? pathname === '/'
      : pathname.startsWith(href) || (href === '/expenses' && pathname === '/settlements');
  useEffect(() => {
    const shortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearch(true);
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, [setSearch]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  useEffect(() => {
    setMore(false);
  }, [pathname]);
  if (simple)
    return (
      <>
        <main>{children}</main>
        <CommandSearch />
      </>
    );
  return (
    <>
      <a href="#main-content" className="skip-link">
        رفتن به محتوای اصلی
      </a>
      <aside className="app-sidebar" aria-label="ناوبری اصلی">
        <Link href="/" className="sidebar-brand">
          <BrandMark />
          <div>
            <strong>هم‌سفر</strong>
            <small>برنامه کمتر، زندگی بیشتر.</small>
          </div>
        </Link>
        <p className="sidebar-section-label">فضای سفر تو</p>
        <nav className="sidebar-nav">
          {navigation.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={cn('nav-item', active(href) && 'active')}
              aria-current={active(href) ? 'page' : undefined}
            >
              <Icon size={19} />
              <span>{label}</span>
              {href === '/trips' && hydrated && (
                <span className="nav-count">{fa(trips.filter((t) => !t.archived).length)}</span>
              )}
            </Link>
          ))}
        </nav>
        {upcoming.length > 0 && (
          <>
            <p className="sidebar-section-label">نزدیک‌ترین ماجراجویی‌ها</p>
            {upcoming.slice(0, 2).map((t) => (
              <Link href={`/trips/${t.id}`} key={t.id} className="sidebar-trip">
                <img src={t.cover} alt="" />
                <span>{t.title}</span>
              </Link>
            ))}
          </>
        )}
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <div className="note-title">
              <Sparkles size={14} />
              <span>سبک‌تر برنامه بریز.</span>
            </div>
            <p>چیزهای مهم اینجا؛ حواست به لحظه‌ها.</p>
          </div>
          <Link href="/settings" className={cn('nav-item', active('/settings') && 'active')}>
            <Settings size={18} />
            تنظیمات
          </Link>
          <Link href="/settings" className="sidebar-profile">
            <Avatar member={{ name: profile.name, color: '#b9c6a3' }} size={34} />
            <div>
              <strong>{profile.name}</strong>
              <small>{cloud ? 'حساب شخصی' : 'فضای شخصی · محلی'}</small>
            </div>
            <ChevronLeft size={15} />
          </Link>
        </div>
      </aside>
      <div className="app-main">
        <header className="app-topbar">
          <div className="breadcrumbs">
            <span>فضای شخصی</span>
            <ChevronLeft size={12} />
            <span className="current">{titles[pathname] || 'جزئیات سفر'}</span>
          </div>
          <Link href="/" className="mobile-brand">
            <BrandMark />
            هم‌سفر
          </Link>
          <div className="header-actions">
            <button
              className="header-search"
              onClick={() => setSearch(true)}
              aria-label="جست‌وجو در سفرها"
            >
              <Search size={17} />
              <span>جست‌وجو در سفرها</span>
              <kbd>⌘ K</kbd>
            </button>
            <span className="header-divider" />
            <button className="header-date" onClick={() => setCalendar(true)}>
              <CalendarDays size={14} />
              {fullDate(todayISO())}
            </button>
            <Popover.Root>
              <Popover.Trigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="notification-trigger"
                  aria-label="یادآوری‌های سفر"
                >
                  <Bell size={18} />
                  {upcoming.length > 0 && <i className="notification-dot" />}
                </Button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  className="floating-popover"
                  align="end"
                  sideOffset={8}
                  dir="rtl"
                  style={{ width: 310 }}
                >
                  <h3 className="popover-heading">یادآوری‌های سفر</h3>
                  {upcoming.slice(0, 3).map((t) => (
                    <Link className="notification-item" key={t.id} href={`/trips/${t.id}`}>
                      <MapPinned size={20} />
                      <div>
                        <strong>{countdown(t.startDate)}</strong>
                        <small>
                          {t.title} · {formatDate(t.startDate)}
                        </small>
                      </div>
                    </Link>
                  ))}
                  {!upcoming.length && (
                    <p className="muted" style={{ padding: 15, fontSize: 12 }}>
                      فعلاً سفری در پیش نیست؛ یک مقصد تازه انتخاب کن.
                    </p>
                  )}
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
            <Link href="/settings" aria-label="حساب و تنظیمات">
              <Avatar member={{ name: profile.name, color: '#b9c6a3' }} size={30} />
            </Link>
          </div>
        </header>
        <main id="main-content" className="page-content">
          {storageError && (
            <div className="sync-banner" role="alert">
              <CircleHelp size={18} />
              {storageError}
              <Link href="/settings">نسخه پشتیبان</Link>
            </div>
          )}
          {(!online || Object.values(syncErrors).some(Boolean)) && (
            <div className="sync-banner" role="status">
              {!online ? <WifiOff size={17} /> : <Cloud size={17} />}
              <span>
                {!online
                  ? 'آفلاین هستی؛ تغییرات روی این دستگاه ذخیره می‌شوند.'
                  : 'برخی تغییرات هنوز همگام نشده‌اند؛ نسخه محلی محفوظ است.'}
              </span>
              {online && <Link href="/settings">بررسی همگام‌سازی</Link>}
            </div>
          )}
          {hydrated ? (
            <motion.div
              className="page-transition"
              key={pathname}
              initial={{ opacity: 0, y: 7 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.27, ease: [0.22, 1, 0.36, 1] }}
            >
              {children}
            </motion.div>
          ) : (
            <PageSkeleton />
          )}
          <footer className="app-footer">
            <span>
              <i className="save-indicator" />
              {cloud
                ? dirty.length
                  ? 'تغییرات در انتظار همگام‌سازی'
                  : 'فضای ابری متصل است'
                : 'اطلاعات روی این دستگاه ذخیره می‌شود'}
            </span>
            <span>برای خاطره‌هایی که هنوز ساخته نشده‌اند.</span>
          </footer>
        </main>
      </div>
      <nav className="mobile-bar" aria-label="ناوبری موبایل">
        {[navigation[0], navigation[1], navigation[2], navigation[4]].map(
          ({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={active(href) ? 'active' : ''}
              aria-current={active(href) ? 'page' : undefined}
            >
              <Icon />
              <span>
                {href === '/expenses'
                  ? 'هزینه‌ها'
                  : href === '/'
                    ? 'خانه'
                    : href === '/planning'
                      ? 'برنامه'
                      : 'سفرها'}
              </span>
            </Link>
          ),
        )}
        <button
          className={
            more ||
            ['/settings', '/groups', '/locations', '/checklist'].some((p) => pathname.startsWith(p))
              ? 'active'
              : ''
          }
          aria-label="بخش‌های بیشتر"
          onClick={() => setMore(true)}
        >
          <MoreHorizontal />
          <span>بیشتر</span>
        </button>
      </nav>
      <Dialog
        open={more}
        onOpenChange={setMore}
        title="همه‌چیز برای سفر"
        description="هر بخش، یک قدم نزدیک‌تر به راه افتادن."
      >
        <div className="mobile-more-grid">
          {[
            navigation[3],
            navigation[5],
            navigation[6],
            { href: '/settings', label: 'تنظیمات', icon: Settings },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              onClick={() => setMore(false)}
              href={href}
              key={href}
              className="mobile-more-item"
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </div>
      </Dialog>
      <Dialog
        open={calendar}
        onOpenChange={setCalendar}
        title="تقویم سفرها"
        description="برنامه‌های هر روز را یکجا ببین."
      >
        <DatePicker value={day} onChange={setDay} />
        <div style={{ marginTop: 18 }}>
          {trips.flatMap((t) =>
            t.activities
              .filter((a) => a.date === day)
              .map((a) => (
                <Link
                  key={a.id}
                  className="command-result"
                  onClick={() => {
                    useTripStore.getState().setActiveTrip(t.id);
                    setCalendar(false);
                  }}
                  href={`/trips/${t.id}?tab=planning`}
                >
                  <CalendarDays size={20} />
                  <div>
                    <strong>{a.title}</strong>
                    <small>
                      {t.title}
                      {a.time ? ` · ${fa(a.time)}` : ''}
                    </small>
                  </div>
                  <ArrowUpLeft size={16} />
                </Link>
              )),
          )}
          {!trips.some((t) => t.activities.some((a) => a.date === day)) && (
            <p className="muted" style={{ fontSize: 12, paddingBlock: 24, textAlign: 'center' }}>
              برای این روز هنوز برنامه‌ای ثبت نشده.
            </p>
          )}
        </div>
      </Dialog>
      <CommandSearch />
    </>
  );
}
function PageSkeleton() {
  return (
    <div aria-label="در حال آماده‌سازی سفرها" role="status">
      <div className="skeleton skeleton-heading" />
      <div className="dashboard-stats">
        {[1, 2, 3, 4].map((i) => (
          <div className="skeleton skeleton-stat" key={i} />
        ))}
      </div>
      <div className="dashboard-featured">
        <div className="skeleton skeleton-hero" />
        <div className="skeleton skeleton-hero" />
      </div>
      <div className="trip-grid">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton skeleton-trip" />
        ))}
      </div>
    </div>
  );
}
function CommandSearch() {
  const open = useUIStore((s) => s.searchOpen),
    setOpen = useUIStore((s) => s.setSearchOpen),
    trips = useTripStore((s) => s.trips),
    [query, setQuery] = useState('');
  const q = query.trim().toLocaleLowerCase('fa');
  const results = trips
    .filter((t) => !t.archived)
    .flatMap((t) => {
      const list: {
        id: string;
        title: string;
        subtitle: string;
        href: string;
        cover: string;
        tripId: string;
      }[] = [];
      if (!q || `${t.title} ${t.destination}`.toLocaleLowerCase('fa').includes(q))
        list.push({
          id: t.id,
          title: t.title,
          subtitle: t.destination,
          href: `/trips/${t.id}`,
          cover: t.cover,
          tripId: t.id,
        });
      if (q) {
        t.activities
          .filter((a) => a.title.includes(q))
          .forEach((a) =>
            list.push({
              id: a.id,
              title: a.title,
              subtitle: `برنامه · ${t.title}`,
              href: `/trips/${t.id}?tab=planning`,
              cover: t.cover,
              tripId: t.id,
            }),
          );
        t.locations
          .filter((l) => l.name.includes(q))
          .forEach((l) =>
            list.push({
              id: l.id,
              title: l.name,
              subtitle: `مکان · ${t.title}`,
              href: `/trips/${t.id}?tab=locations`,
              cover: t.cover,
              tripId: t.id,
            }),
          );
      }
      return list;
    })
    .slice(0, 10);
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setQuery('');
      }}
      title="کجا می‌خواهی بروی؟"
      description="جست‌وجو در سفرها، برنامه‌ها و مکان‌های ذخیره‌شده."
    >
      <div className="command-search">
        <Search size={18} />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="نام سفر، مقصد یا یک مکان…"
          aria-label="جست‌وجو"
        />
      </div>
      {results.map((r) => (
        <Link
          className="command-result"
          key={r.id}
          href={r.href}
          onClick={() => {
            useTripStore.getState().setActiveTrip(r.tripId);
            setOpen(false);
            setQuery('');
          }}
        >
          <img src={r.cover} alt="" />
          <div>
            <strong>{r.title}</strong>
            <small>{r.subtitle}</small>
          </div>
          <ArrowUpLeft size={17} />
        </Link>
      ))}
      {!results.length && (
        <div style={{ textAlign: 'center', padding: 30 }}>
          <Search size={24} style={{ margin: '0 auto 12px', color: 'var(--soft)' }} />
          <p className="muted">چیزی با این نام پیدا نشد؛ واژه دیگری امتحان کن.</p>
        </div>
      )}
    </Dialog>
  );
}
