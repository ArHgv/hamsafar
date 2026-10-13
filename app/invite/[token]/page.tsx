'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Users,
  ShieldCheck,
  Cloud,
  LoaderCircle,
  ArrowLeft,
  MapPin,
  CalendarDays,
} from 'lucide-react';
import { invitePreview, joinInvitation } from '@/lib/cloud';
import { cloudConfigured } from '@/lib/supabase';
import { dateRange } from '@/lib/dates';
import { ROLE_HINTS, ROLE_LABELS } from '@/lib/constants';
import { readableError } from '@/lib/utils';
import { useTripStore } from '@/store/use-trip-store';
import { useToast } from '@/store/use-ui-store';
import { BrandMark } from '@/components/ui/brand';
import { Badge, Button, Card, LinkButton } from '@/components/ui/primitives';
type Preview = Awaited<ReturnType<typeof invitePreview>>;
export default function InvitePage() {
  const { token } = useParams<{ token: string }>(),
    router = useRouter(),
    toast = useToast(),
    user = useTripStore((s) => s.cloudUser),
    [preview, setPreview] = useState<Preview | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [joining, setJoining] = useState(false);
  useEffect(() => {
    let alive = true;
    if (!cloudConfigured) {
      setLoading(false);
      return;
    }
    void invitePreview(token)
      .then((p) => {
        if (alive) setPreview(p);
      })
      .catch((e) => {
        if (alive) setError(readableError(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [token]);
  return (
    <div className="invite-page">
      <Link href="/" className="landing-brand">
        <BrandMark />
        <strong>هم‌سفر</strong>
      </Link>
      <Card className="invite-page-card">
        {loading ? (
          <>
            <LoaderCircle size={30} className="spin accent" />
            <h1>دعوتت را باز می‌کنیم…</h1>
          </>
        ) : !cloudConfigured ? (
          <>
            <Cloud size={32} className="accent" />
            <h1>اتصال ابری لازم است.</h1>
            <p>
              این نسخه هنوز به Supabase متصل نیست. برای دعوت واقعی، تنظیمات ابری پروژه را کامل کن.
            </p>
            <LinkButton href="/settings" variant="primary">
              راهنمای اتصال
            </LinkButton>
          </>
        ) : error && !preview ? (
          <>
            <ShieldCheck size={32} className="muted" />
            <h1>این دعوت باز نشد.</h1>
            <p>{error}</p>
            <LinkButton href="/">بازگشت به فضای سفر</LinkButton>
          </>
        ) : (
          preview && (
            <>
              <span className="invite-page-symbol">
                <Users size={29} />
              </span>
              <p className="card-eyebrow">{preview.inviter} به این سفر دعوتت کرده</p>
              <h1>{preview.title}</h1>
              <p className="invite-page-meta">
                <MapPin size={14} />
                {preview.destination}
              </p>
              <p className="invite-page-meta">
                <CalendarDays size={14} />
                {dateRange(preview.start_date, preview.end_date)}
              </p>
              <Badge tone="accent">
                <ShieldCheck size={13} />
                {ROLE_LABELS[preview.role]}
              </Badge>
              <p>{ROLE_HINTS[preview.role]}</p>
              {user ? (
                <Button
                  variant="primary"
                  loading={joining}
                  onClick={async () => {
                    setJoining(true);
                    setError('');
                    try {
                      const r = await joinInvitation(token);
                      toast('به جمع هم‌سفرها پیوستی؛ خوش آمدی.');
                      router.push(`/trips/${r.id}`);
                    } catch (e) {
                      setError(readableError(e));
                    } finally {
                      setJoining(false);
                    }
                  }}
                >
                  پذیرفتن دعوت و پیوستن
                  <ArrowLeft size={16} />
                </Button>
              ) : (
                <LinkButton
                  href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
                  variant="primary"
                >
                  ورود برای پذیرفتن دعوت
                  <ArrowLeft size={16} />
                </LinkButton>
              )}
              {error && (
                <p className="field-error" role="alert">
                  {error}
                </p>
              )}
              <small>با پذیرش دعوت، نام و ایمیلت برای اعضای این سفر قابل مشاهده است.</small>
            </>
          )
        )}
      </Card>
      <Link href="/" className="text-link">
        فعلاً به فضای شخصی برگرد
        <ArrowLeft size={14} />
      </Link>
    </div>
  );
}
