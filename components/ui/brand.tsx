import { cn } from '@/lib/utils';
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn('brand-mark', className)}>
      <svg viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <path
          d="M7 25.5C10.7 27.8 14.7 27.5 18 24.8L27.5 9.5L21.6 12.1L10.1 23.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9.1 17.3C9.5 11.7 13.4 7.5 19 7.5C25.2 7.5 29.5 12 29.5 18C29.5 24.3 24.8 28.5 18.5 28.5"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          opacity=".75"
        />
        <path
          d="M15.7 16.7L19.3 20.3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
