'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoaderCircle, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { completeAuthCallback } from '@/lib/auth-session';
import { getSupabase } from '@/lib/supabase';
import { readableError } from '@/lib/utils';
import { safeNext } from '@/lib/navigation';
import { BrandMark } from '@/components/ui/brand';
function Callback() {
  const router = useRouter(),
    query = useSearchParams(),
    [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    const finish = async () => {
      const client = getSupabase();
      if (!client) {
        setError('اتصال ابری تنظیم نشده است.');
        return;
      }
      try {
        if (query.get('error')) throw new Error(query.get('error_description') || 'AUTH_CALLBACK');
        await completeAuthCallback(client, query.get('code'), window.location.hash);
        if (alive)
          router.replace(
            query.get('reset') === '1' ? '/login?mode=reset' : safeNext(query.get('next')),
          );
      } catch (e) {
        if (alive) setError(readableError(e));
      }
    };
    void finish();
    return () => {
      alive = false;
    };
  }, [query, router]);
  return (
    <div className="callback-page">
      <BrandMark />
      <h1>{error ? 'یک مکث در ورود.' : 'در حال باز کردن فضای سفر…'}</h1>
      {error ? (
        <>
          <p>{error}</p>
          <Link className="button button-primary" href="/login">
            بازگشت به ورود
          </Link>
        </>
      ) : (
        <LoaderCircle size={24} className="spin accent" />
      )}
    </div>
  );
}
export default function Page() {
  return (
    <Suspense>
      <Callback />
    </Suspense>
  );
}
