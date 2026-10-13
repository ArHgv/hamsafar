import { Suspense } from 'react';
import { TripDetail } from '@/components/trips/trip-detail';
export const metadata = { title: 'جزئیات سفر' };
export default function TripDetailPage() {
  return (
    <Suspense fallback={<div className="skeleton" style={{ height: 450 }} />}>
      <TripDetail />
    </Suspense>
  );
}
