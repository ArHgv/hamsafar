'use client';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Pencil,
  Route,
  MapPin,
  CalendarDays,
  Clock3,
  Ticket,
  Fuel,
  Car,
  LockKeyhole,
  Info,
} from 'lucide-react';
import type { JourneyLeg, Transport, Trip } from '@/lib/types';
import { TRANSPORT_LABELS } from '@/lib/constants';
import { transportSchema } from '@/lib/schemas';
import { fullDate } from '@/lib/dates';
import { fa } from '@/lib/utils';
import { useTripPermission } from '@/hooks/use-trip';
import { useTripStore } from '@/store/use-trip-store';
import { useToast } from '@/store/use-ui-store';
import { Badge, Button, Card } from '../ui/primitives';
import { Dialog } from '../ui/dialog';
import { AttachmentLink } from '../ui/file-picker';
import { TransportFields, TransportIcons } from './transport-fields';
export function TransportBoard({ trip }: { trip: Trip }) {
  const editable = useTripPermission(trip, 'transport'),
    [editing, setEditing] = useState(false),
    [value, setValue] = useState<Transport>(trip.transport),
    [issue, setIssue] = useState(''),
    toast = useToast(),
    Icon = TransportIcons[trip.transport.mode];
  useEffect(() => {
    if (editing) {
      setValue(trip.transport);
      setIssue('');
    }
  }, [editing, trip.id]);
  return (
    <>
      <div className="feature-toolbar">
        <div className="feature-header">
          <Route size={19} className="accent" />
          <div>
            <h2>راهِ رفتن، راهِ برگشتن.</h2>
            <p className="card-eyebrow">ساعت‌ها، بلیط‌ها و جزئیات کوچک مسیر در یک جا</p>
          </div>
        </div>
        {editable ? (
          <Button variant="primary" onClick={() => setEditing(true)}>
            <Pencil size={16} />
            ویرایش مسیر
          </Button>
        ) : (
          <span className="readonly-note">
            <LockKeyhole size={13} />
            دسترسی مشاهده
          </span>
        )}
      </div>
      <div className="journey-header">
        <Icon size={21} />
        <span>حمل‌ونقل اصلی</span>
        <strong>{TRANSPORT_LABELS[trip.transport.mode]}</strong>
        <Badge>جزئیات مسیر اختیاری‌اند</Badge>
      </div>
      <div className="journey-cards">
        <JourneyCard
          leg={trip.transport.outbound}
          label="رفت"
          date={trip.startDate}
          mode={trip.transport.mode}
          fallbackDestination={trip.destination}
        />
        <JourneyCard
          leg={trip.transport.return}
          label="برگشت"
          date={trip.endDate}
          mode={trip.transport.mode}
          fallbackOrigin={trip.destination}
        />
      </div>
      {(trip.transport.mode === 'car' || trip.transport.mode === 'mixed') && (
        <Card className="road-details">
          <h3>
            <Car size={18} />
            ماشین و جاده
          </h3>
          <div className="road-detail-grid">
            <div>
              <span>پلاک خودرو</span>
              <strong>{trip.transport.vehiclePlate || 'هنوز مشخص نشده'}</strong>
            </div>
            <div>
              <span>برآورد سوخت</span>
              <strong>
                {trip.transport.fuelEstimate === undefined
                  ? 'هنوز مشخص نشده'
                  : `${fa(trip.transport.fuelEstimate)} لیتر`}
              </strong>
            </div>
            <div className="full">
              <span>مسیر</span>
              <strong>{trip.transport.route || 'مسیر را می‌توانی بعداً بنویسی.'}</strong>
            </div>
            <div className="full">
              <span>توقف‌ها و استراحتگاه‌ها</span>
              <strong>{trip.transport.stops || 'هنوز توقفی ثبت نشده.'}</strong>
            </div>
          </div>
        </Card>
      )}
      <div className="payment-notice">
        <Info size={15} />
        <span>
          ساعت رسیدن در همان روز مسیر در نظر گرفته می‌شود. برای مسیرهای چندروزه، جزئیات تاریخ رسیدن
          را در یادداشت مسیر بنویس.
        </span>
      </div>
      <Dialog
        open={editing}
        onOpenChange={setEditing}
        title="جزئیات رفت‌وبرگشت"
        description="هیچ ساعت، شماره مسیر یا بلیطی برای ذخیره اجباری نیست."
        wide
        footer={
          <>
            <Button onClick={() => setEditing(false)}>انصراف</Button>
            <Button
              variant="primary"
              onClick={() => {
                const parsed = transportSchema.safeParse(value);
                if (!parsed.success) {
                  setIssue(parsed.error.issues[0].message);
                  return;
                }
                try {
                  useTripStore
                    .getState()
                    .updateTrip(trip.id, { transport: parsed.data }, ['transport']);
                  toast('جزئیات مسیر به‌روز شد.');
                  setEditing(false);
                } catch {
                  setIssue('مسیر ذخیره نشد؛ دسترسی را بررسی کن.');
                }
              }}
            >
              ذخیره مسیر
            </Button>
          </>
        }
      >
        <TransportFields value={value} onChange={setValue} showMode />
        {issue && (
          <p className="field-error" style={{ marginTop: 18 }} role="alert">
            {issue}
          </p>
        )}
      </Dialog>
    </>
  );
}
function JourneyCard({
  leg,
  label,
  date,
  mode,
  fallbackOrigin,
  fallbackDestination,
}: {
  leg: JourneyLeg;
  label: string;
  date: string;
  mode: Transport['mode'];
  fallbackOrigin?: string;
  fallbackDestination?: string;
}) {
  const Icon = TransportIcons[mode];
  return (
    <Card className="journey-card">
      <div className="journey-card-top">
        <Badge tone="accent">
          <Icon size={13} />
          مسیر {label}
        </Badge>
        <span>
          <CalendarDays size={13} />
          {fullDate(date)}
        </span>
      </div>
      <div className="journey-route">
        <div>
          <small>مبدأ</small>
          <h3>{leg.origin || fallbackOrigin || 'هنوز مشخص نشده'}</h3>
          <strong dir="ltr">{leg.departureTime ? fa(leg.departureTime) : 'ساعت اختیاری'}</strong>
        </div>
        <div className="journey-line">
          <i />
          <span />
          <Icon size={22} />
          <span />
          <i />
        </div>
        <div>
          <small>مقصد</small>
          <h3>{leg.destination || fallbackDestination || 'هنوز مشخص نشده'}</h3>
          <strong dir="ltr">{leg.arrivalTime ? fa(leg.arrivalTime) : 'ساعت اختیاری'}</strong>
        </div>
      </div>
      {(leg.routeNumber || leg.terminal || leg.platform || leg.checkinTime) && (
        <div className="journey-extra">
          {leg.routeNumber && (
            <span>
              {mode === 'plane' ? 'پرواز' : mode === 'train' ? 'قطار' : 'شماره مسیر'}
              <strong dir="auto">{fa(leg.routeNumber)}</strong>
            </span>
          )}
          {leg.terminal && (
            <span>
              ترمینال<strong>{fa(leg.terminal)}</strong>
            </span>
          )}
          {leg.platform && (
            <span>
              سکو<strong>{fa(leg.platform)}</strong>
            </span>
          )}
          {leg.checkinTime && (
            <span>
              {mode === 'bus' ? 'سوار شدن' : 'چک‌این'}
              <strong dir="ltr">{fa(leg.checkinTime)}</strong>
            </span>
          )}
        </div>
      )}
      <div className="journey-ticket">
        {leg.ticket ? (
          <AttachmentLink attachment={leg.ticket} />
        ) : (
          <span>
            <Ticket size={15} />
            بلیطی پیوست نشده · اختیاری
          </span>
        )}
      </div>
      {leg.notes && <p className="journey-notes">{leg.notes}</p>}
    </Card>
  );
}
