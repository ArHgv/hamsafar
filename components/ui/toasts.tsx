'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useUIStore } from '@/store/use-ui-store';
export function Toasts() {
  const toasts = useUIStore((s) => s.toasts),
    dismiss = useUIStore((s) => s.dismiss);
  return (
    <div className="toast-stack">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className={`toast toast-${t.kind}`}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            role={t.kind === 'error' ? 'alert' : 'status'}
          >
            {t.kind === 'success' ? (
              <CheckCircle2 size={19} />
            ) : t.kind === 'error' ? (
              <AlertCircle size={19} />
            ) : (
              <Info size={19} />
            )}
            <span>{t.message}</span>
            <button onClick={() => dismiss(t.id)} aria-label="بستن پیام">
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
