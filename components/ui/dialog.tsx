'use client';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, AlertTriangle } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './primitives';
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  wide,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay" />
        <DialogPrimitive.Content
          className={cn('dialog-content', wide && 'dialog-wide', className)}
          dir="rtl"
        >
          <div className="sheet-grabber" />
          <div className="dialog-heading">
            <div>
              <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
              <DialogPrimitive.Description
                className={description ? 'dialog-description' : 'sr-only'}
              >
                {description || title}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button size="icon" variant="ghost" aria-label="بستن پنجره">
                <X size={20} />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <div className="dialog-body">{children}</div>
          {footer && <div className="dialog-footer">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  label = 'حذف',
  dangerous = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  label?: string;
  dangerous?: boolean;
}) {
  const [loading, setLoading] = useState(false),
    [error, setError] = useState('');
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!loading) {
          onOpenChange(v);
          setError('');
        }
      }}
      title={title}
      description={description}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)} disabled={loading}>
            انصراف
          </Button>
          <Button
            variant={dangerous ? 'danger' : 'primary'}
            loading={loading}
            onClick={async () => {
              setLoading(true);
              try {
                await onConfirm();
                onOpenChange(false);
              } catch (e) {
                setError(e instanceof Error ? e.message : 'عملیات انجام نشد');
              } finally {
                setLoading(false);
              }
            }}
          >
            {label}
          </Button>
        </>
      }
    >
      <div className="confirm-symbol">
        <AlertTriangle size={26} />
      </div>
      <p className="muted">
        {dangerous
          ? 'این تغییر قابل بازگشت نیست. پیش از ادامه، در صورت نیاز نسخه پشتیبان بگیرید.'
          : 'فقط پس از تأیید شما، این تغییر ثبت می‌شود.'}
      </p>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </Dialog>
  );
}
