'use client';
import Link from 'next/link';
import { MapPin, CalendarDays, ArrowUpLeft, Plus } from 'lucide-react';
import type { Trip } from '@/lib/types';
import { dateRange, statusLabel, tripStatus } from '@/lib/dates';
import { AvatarGroup, Badge, Card } from '../ui/primitives';
import { useTripStore } from '@/store/use-trip-store';
export function TripCard({ trip }: { trip: Trip }) {
  const status = tripStatus(trip.startDate, trip.endDate);
  return (
    <Card className="trip-card">
      <Link
        href={`/trips/${trip.id}`}
        className="trip-card-cover"
        aria-label={`مشاهده ${trip.title}`}
        onClick={() => useTripStore.getState().setActiveTrip(trip.id)}
      >
        <img src={trip.cover} alt={`کاور ${trip.title}`} loading="lazy" />
        <Badge>{statusLabel[status]}</Badge>
      </Link>
      <div className="trip-card-info">
        <Link
          href={`/trips/${trip.id}`}
          onClick={() => useTripStore.getState().setActiveTrip(trip.id)}
          className="trip-card-title"
        >
          <h3>{trip.title}</h3>
          <ArrowUpLeft size={17} />
        </Link>
        <p className="trip-card-destination">
          <MapPin size={12} />
          {trip.destination}
        </p>
        <div className="trip-card-footer">
          <span className="date">
            <CalendarDays size={13} />
            {dateRange(trip.startDate, trip.endDate)}
          </span>
          <AvatarGroup members={trip.members} limit={3} size={25} />
        </div>
      </div>
    </Card>
  );
}
export function NewTripTile() {
  return (
    <Link href="/trips/new" className="create-trip-tile">
      <span className="plus-circle">
        <Plus size={22} strokeWidth={1.5} />
      </span>
      <strong>مقصد بعدی کجاست؟</strong>
      <p>یک سفر تازه، یک حالِ تازه.</p>
    </Link>
  );
}
