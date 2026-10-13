'use client';
import { useRef, useState } from 'react';
import { ImagePlus, Check, LoaderCircle } from 'lucide-react';
import { COVER_OPTIONS } from '@/lib/constants';
import { compressCover } from '@/lib/local-files';
import { useToast } from '@/store/use-ui-store';
import { cn, readableError } from '@/lib/utils';
export function CoverPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null),
    toast = useToast(),
    [loading, setLoading] = useState(false);
  return (
    <div className="cover-picker">
      <input
        ref={ref}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="انتخاب عکس کاور"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setLoading(true);
          try {
            onChange(await compressCover(file));
          } catch (err) {
            toast(readableError(err), 'error');
          } finally {
            setLoading(false);
            e.target.value = '';
          }
        }}
      />
      {COVER_OPTIONS.map((c) => (
        <button
          key={c.url}
          type="button"
          className={cn('cover-option', c.url === value && 'selected')}
          aria-pressed={c.url === value}
          onClick={() => onChange(c.url)}
        >
          <img src={c.url} alt={c.name} />
          <span>{c.name}</span>
          {c.url === value && (
            <i>
              <Check size={13} />
            </i>
          )}
        </button>
      ))}
      <button
        type="button"
        className={cn('cover-upload', value.startsWith('data:') && 'selected')}
        onClick={() => ref.current?.click()}
        disabled={loading}
      >
        {value.startsWith('data:') && <img src={value} alt="کاور انتخابی" />}
        {loading ? <LoaderCircle size={22} className="spin" /> : <ImagePlus size={22} />}
        <span>عکس خودت</span>
      </button>
    </div>
  );
}
