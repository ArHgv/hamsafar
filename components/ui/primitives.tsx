'use client';
import {
  forwardRef,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { LoaderCircle, Plus, ArrowUpLeft } from 'lucide-react';
import Link from 'next/link';
import { cn, fa } from '@/lib/utils';
import type { Member } from '@/lib/types';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'normal' | 'small' | 'icon';
  loading?: boolean;
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'normal',
    loading,
    disabled,
    children,
    className,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn('button', `button-${variant}`, `button-${size}`, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <LoaderCircle size={17} className="spin" />}
      {children}
    </button>
  );
});
export function LinkButton({
  href,
  children,
  variant = 'secondary',
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonProps['variant'];
  className?: string;
}) {
  return (
    <Link href={href} className={cn('button', `button-${variant}`, className)}>
      {children}
    </Link>
  );
}
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('glass-card', className)} {...props} />;
}
export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'warning' | 'success' | 'danger';
  className?: string;
}) {
  return <span className={cn('badge', `badge-${tone}`, className)}>{children}</span>;
}
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn('input', className)} {...props} />;
  },
);
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={cn('input select', className)} {...props}>
        {children}
      </select>
    );
  },
);
export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn('input textarea', className)} {...props} />;
});
export function Field({
  label,
  children,
  error,
  hint,
  optional,
  required,
  id,
  className,
}: {
  label: string;
  children: ReactNode;
  error?: string;
  hint?: string;
  optional?: boolean;
  required?: boolean;
  id?: string;
  className?: string;
}) {
  const description = id && (error ? `${id}-error` : hint ? `${id}-hint` : undefined);
  const control = isValidElement(children)
    ? cloneElement(
        children as ReactElement<{ 'aria-describedby'?: string; 'aria-invalid'?: boolean }>,
        { 'aria-describedby': description, 'aria-invalid': error ? true : undefined },
      )
    : children;
  return (
    <div className={cn('form-field', className)}>
      <label id={id ? `${id}-label` : undefined} htmlFor={id} className="field-label">
        {label}
        {optional && <span className="optional">اختیاری</span>}
        {required && (
          <span className="required" aria-label="ضروری">
            *
          </span>
        )}
      </label>
      {control}
      {error ? (
        <p id={id ? `${id}-error` : undefined} className="field-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={id ? `${id}-hint` : undefined} className="field-hint">
          {hint}
        </p>
      ) : (
        <p className="field-hint" aria-hidden="true" />
      )}
    </div>
  );
}
export function Avatar({
  member,
  size = 32,
  online = false,
}: {
  member: Pick<Member, 'name' | 'color'>;
  size?: number;
  online?: boolean;
}) {
  return (
    <span
      className="avatar"
      title={member.name}
      style={{ width: size, height: size, backgroundColor: member.color, fontSize: size * 0.38 }}
    >
      <span>{member.name.charAt(0)}</span>
      {online && <i aria-label="آنلاین" className="online-dot" />}
    </span>
  );
}
export function AvatarGroup({
  members,
  limit = 4,
  size = 29,
}: {
  members: Member[];
  limit?: number;
  size?: number;
}) {
  return (
    <div className="avatar-group" aria-label={members.map((m) => m.name).join('، ')}>
      {members.slice(0, limit).map((m) => (
        <Avatar key={m.id} member={m} size={size} />
      ))}
      {members.length > limit && (
        <span className="avatar avatar-overflow" style={{ width: size, height: size }}>
          +{fa(members.length - limit)}
        </span>
      )}
    </div>
  );
}
export function ProgressRing({
  value,
  size = 92,
  stroke = 5,
  children,
  className,
}: {
  value: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
  className?: string;
}) {
  const r = (size - stroke * 2) / 2,
    circumference = 2 * Math.PI * r;
  return (
    <div
      className={cn('progress-ring', className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="درصد تکمیل"
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--line)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          className="progress-ring-value"
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--accent)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - Math.min(100, Math.max(0, value)) / 100)}
        />
      </svg>
      <div className="progress-ring-content">
        {children || (
          <strong>
            {fa(Math.round(value))}
            <small>٪</small>
          </strong>
        )}
      </div>
    </div>
  );
}
export function ProgressBar({ value, label }: { value: number; label?: string }) {
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-label={label || 'پیشرفت'}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
export function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </Card>
  );
}
export function NewTripLink({ compact = false }: { compact?: boolean }) {
  return (
    <LinkButton href="/trips/new" variant="primary">
      <Plus size={18} />
      <span>{compact ? 'سفر جدید' : 'یک سفر تازه بساز'}</span>
    </LinkButton>
  );
}
export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link className="text-link" href={href}>
      {children}
      <ArrowUpLeft size={15} />
    </Link>
  );
}
