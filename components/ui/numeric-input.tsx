'use client';
import { forwardRef, useEffect, useRef, useState, type InputHTMLAttributes } from 'react';
import { fa, normalizeDigits } from '@/lib/utils';
import { Input } from './primitives';
interface NumericInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange' | 'type'
> {
  value?: number;
  onValueChange: (value: number | undefined) => void;
  optional?: boolean;
}
/** Preserve partial values (minus, decimal separator, empty input) while the user types. */
export const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(function NumericInput(
  { value, onValueChange, optional = false, onFocus, onBlur, inputMode = 'decimal', ...props },
  ref,
) {
  const display = (n?: number) => (Number.isFinite(n) ? fa(n!) : '');
  const [raw, setRaw] = useState(() => display(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setRaw(display(value));
  }, [value]);
  return (
    <Input
      {...props}
      ref={ref}
      inputMode={inputMode}
      value={raw}
      onFocus={(event) => {
        focused.current = true;
        onFocus?.(event);
      }}
      onBlur={(event) => {
        focused.current = false;
        if (Number.isFinite(value)) setRaw(display(value));
        onBlur?.(event);
      }}
      onChange={(event) => {
        const text = event.target.value;
        setRaw(text);
        const normalized = normalizeDigits(text);
        onValueChange(
          normalized === ''
            ? optional
              ? undefined
              : NaN
            : /^-?\d*(?:\.\d*)?$/.test(normalized)
              ? Number(normalized)
              : NaN,
        );
      }}
    />
  );
});
