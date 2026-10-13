import { Suspense } from 'react';
import { AuthPage } from '@/components/auth-page';
export const metadata = { title: 'ورود به فضای سفر' };
export default function Page() {
  return (
    <Suspense fallback={<div className="skeleton" style={{ height: '100vh' }} />}>
      <AuthPage />
    </Suspense>
  );
}
