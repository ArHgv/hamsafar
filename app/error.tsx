'use client';
import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Hamsafar view error:', error.digest || error.message);
  }, [error]);
  return (
    <div className="callback-page">
      <AlertCircle size={32} className="muted" />
      <h1>یک مکث کوتاه در مسیر.</h1>
      <p>این صفحه باز نشد؛ اطلاعات ذخیره‌شده محفوظ است.</p>
      <button className="button button-primary" onClick={reset}>
        تلاش دوباره
      </button>
    </div>
  );
}
