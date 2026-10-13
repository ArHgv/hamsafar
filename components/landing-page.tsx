'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowUpLeft,
  ArrowLeft,
  MapPin,
  CalendarDays,
  Backpack,
  Wallet,
  Check,
  Route,
  Users,
  Sparkles,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import { BrandMark } from './ui/brand';
import { Button, Card, LinkButton } from './ui/primitives';
export function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <Link href="/welcome" className="landing-brand">
          <BrandMark />
          <strong>هم‌سفر</strong>
        </Link>
        <nav>
          <a href="#features">برای سفر تو</a>
          <a href="#together">برای هم‌سفرها</a>
          <Link href="/">دیدن فضای سفر</Link>
        </nav>
        <LinkButton href="/login">
          ورود به حساب
          <ArrowUpLeft size={15} />
        </LinkButton>
      </header>
      <main>
        <section className="landing-hero">
          <motion.div
            className="landing-hero-copy"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="landing-eyebrow">
              <Compass size={16} />
              کمی دورتر از روزمرگی
            </span>
            <h1>
              مسیر را بچین.
              <br />
              <span>لحظه‌ها را زندگی کن.</span>
            </h1>
            <p>
              از اولین فکرِ رفتن، تا آخرین خاطره؛
              <br />
              برنامه، وسایل، هزینه‌ها و هم‌سفرها، در یک جای آرام.
            </p>
            <div className="landing-cta">
              <LinkButton href="/trips/new" variant="primary">
                یک سفر تازه بساز
                <ArrowLeft size={17} />
              </LinkButton>
              <Link href="/" className="landing-demo">
                اول یک نگاهی بینداز
                <ArrowUpLeft size={15} />
              </Link>
            </div>
            <small>
              <ShieldCheck size={13} />
              بدون حساب هم می‌توانی شروع کنی؛ اطلاعات روی دستگاه تو می‌ماند.
            </small>
          </motion.div>
          <motion.div
            className="landing-hero-art"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <img src="/images/gilan-cover.jpg" alt="دره سرسبز و جاده‌ای در مه" />
            <span className="landing-photo-tag">
              <MapPin size={12} />
              یک جای آرام، دور از شلوغی
            </span>
            <div className="landing-ticket">
              <div>
                <span>داستان بعدی ما</span>
                <h3>چند روز آرام‌تر، در گیلان</h3>
              </div>
              <div className="landing-ticket-details">
                <span>
                  <CalendarDays size={16} />
                  چهار روز ماجراجویی
                </span>
                <span>
                  <Users size={16} />
                  خاطره‌های مشترک
                </span>
                <ArrowUpLeft size={20} />
              </div>
            </div>
            <div className="landing-float">
              <Check size={17} />
              <span>همه‌چیز برای رفتن آماده‌ست.</span>
            </div>
          </motion.div>
        </section>
        <section className="landing-features" id="features">
          <div className="landing-section-title">
            <span>کمتر درگیر جزئیات، بیشتر در لحظه.</span>
            <h2>هر چیزی که قبل از رفتن لازم داری.</h2>
          </div>
          <div className="landing-feature-grid">
            {[
              {
                icon: CalendarDays,
                title: 'روزها، به سبک تو',
                description: 'برنامه‌ای سبک برای هر روز؛ از یک صبحانه آرام تا کشف یک جای تازه.',
                href: '/planning',
                label: 'برنامه روزانه',
              },
              {
                icon: Backpack,
                title: 'کیف سبک، خیال راحت',
                description:
                  'وسایل شخصی و مشترک را بچین، مسئول مشخص کن و هیچ ضروری‌ای را جا نگذار.',
                href: '/checklist',
                label: 'چک‌لیست هوشمند',
              },
              {
                icon: Wallet,
                title: 'حساب روشن، دوستی ماندگار',
                description:
                  'هزینه‌ها را برابر، درصدی یا دلخواه تقسیم کن و ساده‌ترین راهِ تسویه را ببین.',
                href: '/expenses',
                label: 'هزینه و تسویه',
              },
            ].map(({ icon: Icon, title, description, href, label }) => (
              <Card key={href} className="landing-feature">
                <Icon size={28} strokeWidth={1.4} />
                <small>{label}</small>
                <h3>{title}</h3>
                <p>{description}</p>
                <Link href={href}>
                  بیشتر ببین
                  <ArrowUpLeft size={14} />
                </Link>
              </Card>
            ))}
          </div>
        </section>
        <section className="landing-together" id="together">
          <div className="landing-together-art">
            <img src="/images/desert-cover.jpg" alt="خط آرام تپه‌های شنی" />
            <div className="landing-quote">
              <span>بعضی راه‌ها را</span>
              <strong>باید با هم رفت.</strong>
            </div>
          </div>
          <div>
            <span className="landing-eyebrow">
              <Users size={16} />
              تنها یا همراه، به سبک خودت
            </span>
            <h2>
              یک برنامه مشترک.
              <br />
              هزار خاطره‌ی شخصی.
            </h2>
            <p>
              برای سفر تک‌نفره یا یک جمع دوست‌داشتنی؛ هر نفر با دسترسی مشخص، از برنامه تا هزینه‌ها
              را می‌بیند. با اتصال ابری، تغییرات بین اعضا همگام می‌شوند.
            </p>
            <ul>
              <li>
                <Check size={15} />
                دعوت امن با لینک و دسترسی مشخص
              </li>
              <li>
                <Check size={15} />
                همکاری آنلاین با اتصال Supabase
              </li>
              <li>
                <Check size={15} />
                نشانی‌های ذخیره‌شده و مسیریابی روی نقشه
              </li>
            </ul>
            <LinkButton href="/trips/new" variant="primary">
              مقصد بعدی‌مان کجاست؟
              <ArrowLeft size={16} />
            </LinkButton>
          </div>
        </section>
        <section className="landing-bottom-cta">
          <Sparkles size={25} />
          <h2>جهان، هنوز جاهای ندیده دارد.</h2>
          <p>با یک مقصد شروع کن. باقی‌اش، یک داستان تازه است.</p>
          <LinkButton href="/trips/new" variant="primary">
            شروع یک سفر
            <ArrowLeft size={16} />
          </LinkButton>
        </section>
      </main>
      <footer className="landing-footer">
        <Link href="/" className="landing-brand">
          <BrandMark />
          <strong>هم‌سفر</strong>
        </Link>
        <span>برای خاطره‌هایی که هنوز ساخته نشده‌اند.</span>
        <Link href="/settings">
          حریم شخصی و اطلاعات تو
          <ArrowUpLeft size={13} />
        </Link>
      </footer>
    </div>
  );
}
