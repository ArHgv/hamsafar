'use client';
import { useState } from 'react';
import { Car, Plane, TrainFront, Bus, Route, ArrowLeft, ChevronDown, Info } from 'lucide-react';
import type { JourneyLeg, Transport, TransportMode } from '@/lib/types';
import { TRANSPORT_LABELS } from '@/lib/constants';
import { cn, normalizeDigits } from '@/lib/utils';
import { Field, Input, Textarea } from '../ui/primitives';
import { NumericInput } from '../ui/numeric-input';
import { TimePicker } from '../ui/date-picker';
import { FilePicker } from '../ui/file-picker';
export const TransportIcons = { car: Car, plane: Plane, train: TrainFront, bus: Bus, mixed: Route };
export function TransportModePicker({
  value,
  onChange,
}: {
  value: TransportMode;
  onChange: (mode: TransportMode) => void;
}) {
  return (
    <div className="transport-mode-grid" aria-label="نوع سفر">
      {Object.entries(TRANSPORT_LABELS).map(([key, label]) => {
        const Icon = TransportIcons[key as TransportMode];
        return (
          <button
            key={key}
            type="button"
            aria-pressed={key === value}
            className={cn('transport-mode', key === value && 'selected')}
            onClick={() => onChange(key as TransportMode)}
          >
            <Icon size={23} strokeWidth={1.6} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
export function TransportFields({
  value,
  onChange,
  showMode = false,
}: {
  value: Transport;
  onChange: (transport: Transport) => void;
  showMode?: boolean;
}) {
  const [leg, setLeg] = useState<'outbound' | 'return'>('outbound'),
    selected = value[leg],
    mode = value.mode;
  const patch = (data: Partial<Transport>) => onChange({ ...value, ...data });
  const patchLeg = (data: Partial<JourneyLeg>) => patch({ [leg]: { ...selected, ...data } });
  const routeLabel =
    mode === 'plane'
      ? 'شماره پرواز'
      : mode === 'train'
        ? 'شماره قطار'
        : mode === 'bus'
          ? 'شماره اتوبوس'
          : 'شماره مسیر یا بلیط';
  return (
    <div className="form-stack">
      {showMode && (
        <Field label="با چه چیزی سفر می‌کنی؟">
          <TransportModePicker value={mode} onChange={(mode) => patch({ mode })} />
        </Field>
      )}
      <div className="info-callout">
        <Info size={17} />
        <p>ساعت‌ها، شماره مسیر و بلیط‌ها همگی اختیاری‌اند؛ هر وقت خواستی کاملشان کن.</p>
      </div>
      <div className="segmented journey-segmented">
        <button
          type="button"
          className={leg === 'outbound' ? 'active' : ''}
          onClick={() => setLeg('outbound')}
        >
          مسیر رفت
          <ArrowLeft size={14} />
        </button>
        <button
          type="button"
          className={leg === 'return' ? 'active' : ''}
          onClick={() => setLeg('return')}
        >
          مسیر برگشت
          <ArrowLeft size={14} className="return-arrow" />
        </button>
      </div>
      <div className="form-grid">
        <Field label="مبدأ" optional id={`origin-${leg}`}>
          <Input
            id={`origin-${leg}`}
            placeholder="مثلاً تهران"
            value={selected.origin || ''}
            onChange={(e) => patchLeg({ origin: e.target.value })}
            maxLength={150}
          />
        </Field>
        <Field label="مقصد مسیر" optional id={`destination-${leg}`}>
          <Input
            id={`destination-${leg}`}
            placeholder="مثلاً رشت"
            value={selected.destination || ''}
            onChange={(e) => patchLeg({ destination: e.target.value })}
            maxLength={150}
          />
        </Field>
        <Field
          label={leg === 'outbound' ? 'ساعت حرکت رفت' : 'ساعت حرکت برگشت'}
          optional
          id={`depart-${leg}`}
        >
          <TimePicker
            id={`depart-${leg}`}
            value={selected.departureTime}
            onChange={(departureTime) => patchLeg({ departureTime })}
          />
        </Field>
        <Field label="ساعت رسیدن" optional id={`arrival-${leg}`}>
          <TimePicker
            id={`arrival-${leg}`}
            value={selected.arrivalTime}
            onChange={(arrivalTime) => patchLeg({ arrivalTime })}
          />
        </Field>
        {mode !== 'car' && (
          <Field label={routeLabel} optional id={`number-${leg}`}>
            <Input
              id={`number-${leg}`}
              dir="auto"
              placeholder="مثلاً ۲۳۵"
              value={selected.routeNumber || ''}
              onChange={(e) => patchLeg({ routeNumber: e.target.value })}
              maxLength={80}
            />
          </Field>
        )}
        {(mode === 'plane' || mode === 'bus' || mode === 'mixed') && (
          <Field label="ترمینال" optional id={`terminal-${leg}`}>
            <Input
              id={`terminal-${leg}`}
              placeholder="نام یا شماره ترمینال"
              value={selected.terminal || ''}
              onChange={(e) => patchLeg({ terminal: e.target.value })}
              maxLength={150}
            />
          </Field>
        )}
        {(mode === 'train' || mode === 'mixed') && (
          <Field label="شماره سکو" optional id={`platform-${leg}`}>
            <Input
              id={`platform-${leg}`}
              placeholder="مثلاً سکوی ۳"
              value={selected.platform || ''}
              onChange={(e) => patchLeg({ platform: e.target.value })}
            />
          </Field>
        )}
        {(mode === 'plane' || mode === 'bus' || mode === 'mixed') && (
          <Field
            label={mode === 'bus' ? 'ساعت سوار شدن' : 'ساعت چک‌این'}
            optional
            id={`checkin-${leg}`}
          >
            <TimePicker
              id={`checkin-${leg}`}
              value={selected.checkinTime}
              onChange={(checkinTime) => patchLeg({ checkinTime })}
            />
          </Field>
        )}
        <Field label={leg === 'outbound' ? 'بلیط رفت' : 'بلیط برگشت'} optional className="full">
          <FilePicker
            value={selected.ticket}
            onChange={(ticket) => patchLeg({ ticket })}
            label="پیوست بلیط یا رزرو"
          />
        </Field>
        <Field label="یادداشت این مسیر" optional className="full" id={`leg-notes-${leg}`}>
          <Textarea
            id={`leg-notes-${leg}`}
            placeholder="جزئیات کوچکی که نباید فراموش شوند…"
            value={selected.notes || ''}
            onChange={(e) => patchLeg({ notes: e.target.value })}
            maxLength={3000}
          />
        </Field>
      </div>
      {(mode === 'car' || mode === 'mixed') && (
        <details className="form-disclosure" open={mode === 'car'}>
          <summary>
            <Car size={18} />
            <span>ماشین و جاده</span>
            <ChevronDown size={16} />
          </summary>
          <div className="form-grid">
            <Field label="پلاک خودرو" optional id="vehicle-plate">
              <Input
                id="vehicle-plate"
                dir="auto"
                placeholder="مثلاً ۱۲ ب ۳۴۵ ایران ۶۷"
                value={value.vehiclePlate || ''}
                onChange={(e) => patch({ vehiclePlate: e.target.value })}
              />
            </Field>
            <Field
              label="برآورد سوخت (لیتر)"
              optional
              id="fuel-estimate"
              error={
                value.fuelEstimate !== undefined &&
                (!Number.isFinite(value.fuelEstimate) ||
                  value.fuelEstimate < 0 ||
                  value.fuelEstimate > 10000)
                  ? 'برآورد سوخت باید عددی بین صفر و ۱۰٬۰۰۰ باشد'
                  : undefined
              }
            >
              <NumericInput
                id="fuel-estimate"
                optional
                placeholder="مثلاً ۶۵"
                value={value.fuelEstimate}
                onValueChange={(fuelEstimate) => patch({ fuelEstimate })}
              />
            </Field>
            <Field label="جزئیات مسیر" optional className="full" id="road-route">
              <Input
                id="road-route"
                placeholder="تهران، قزوین، منجیل، رشت"
                value={value.route || ''}
                onChange={(e) => patch({ route: e.target.value })}
              />
            </Field>
            <Field label="توقف‌ها و استراحتگاه‌ها" optional className="full" id="road-stops">
              <Textarea
                id="road-stops"
                placeholder="کجا برای استراحت توقف می‌کنید؟"
                value={value.stops || ''}
                onChange={(e) => patch({ stops: e.target.value })}
                maxLength={3000}
              />
            </Field>
          </div>
        </details>
      )}
    </div>
  );
}
