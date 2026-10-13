'use client';
import { useRef, useState } from 'react';
import { FileText, Paperclip, X, LoaderCircle, ArrowUpLeft } from 'lucide-react';
import type { Attachment } from '@/lib/types';
import { getLocalFile, storeFile } from '@/lib/local-files';
import { fa, readableError } from '@/lib/utils';
import { useToast } from '@/store/use-ui-store';
import { Button } from './primitives';
export function AttachmentLink({ attachment }: { attachment: Attachment }) {
  const [loading, setLoading] = useState(false),
    toast = useToast();
  return (
    <button
      type="button"
      className="attachment-link"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          if (attachment.localId) {
            const file = await getLocalFile(attachment.localId);
            if (file) {
              const url = URL.createObjectURL(file);
              const a = document.createElement('a');
              a.href = url;
              a.download = attachment.name;
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 10000);
              return;
            }
          }
          if (attachment.cloudPath) {
            const { fileURL } = await import('@/lib/cloud');
            const url = await fileURL(attachment.cloudPath);
            window.open(url, '_blank', 'noopener,noreferrer');
            return;
          }
          toast('فایل روی این دستگاه پیدا نشد. دوباره آن را پیوست کنید.', 'error');
        } catch {
          toast('پیوست باز نشد. اتصال و اجازه دسترسی را بررسی کنید.', 'error');
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? <LoaderCircle size={16} className="spin" /> : <FileText size={16} />}
      <span className="file-name" dir="auto">
        {attachment.name}
      </span>
      <ArrowUpLeft size={14} />
    </button>
  );
}
export function FilePicker({
  value,
  onChange,
  label = 'افزودن فایل',
}: {
  value?: Attachment;
  onChange: (file?: Attachment) => void;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null),
    [loading, setLoading] = useState(false),
    toast = useToast();
  return (
    <div className="file-picker">
      <input
        ref={input}
        type="file"
        className="sr-only"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        aria-label={label}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setLoading(true);
          try {
            onChange(await storeFile(file));
          } catch (err) {
            toast(readableError(err), 'error');
          } finally {
            setLoading(false);
            e.target.value = '';
          }
        }}
      />
      {value ? (
        <div className="file-attached">
          <div>
            <AttachmentLink attachment={value} />
            <small>{fa(Math.ceil(value.size / 1024))} کیلوبایت</small>
          </div>
          <Button
            size="icon"
            variant="ghost"
            aria-label="حذف پیوست"
            onClick={() => onChange(undefined)}
          >
            <X size={16} />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          className="file-drop"
          onClick={() => input.current?.click()}
          disabled={loading}
        >
          {loading ? <LoaderCircle size={20} className="spin" /> : <Paperclip size={20} />}
          <span>
            {label}
            <small>PDF یا عکس · حداکثر ۱۰ مگابایت</small>
          </span>
        </button>
      )}
    </div>
  );
}
