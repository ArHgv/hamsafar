import Link from 'next/link';
import { MapPinned } from 'lucide-react';
export default function NotFound() {
  return (
    <div className="callback-page">
      <MapPinned size={32} className="accent" />
      <h1>این مسیر را پیدا نکردیم.</h1>
      <p>شاید مقصد تغییر کرده؛ از فضای سفر دوباره راه بیفت.</p>
      <Link href="/" className="button button-primary">
        بازگشت به خانه
      </Link>
    </div>
  );
}
