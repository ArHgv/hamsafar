'use client';
import * as Popover from '@radix-ui/react-popover';
import { MoreHorizontal, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from './primitives';
export function ActionsMenu({
  label,
  items,
}: {
  label: string;
  items: { label: string; icon: LucideIcon; onClick: () => void; destructive?: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button size="icon" variant="ghost" aria-label={label}>
          <MoreHorizontal size={19} />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content dir="rtl" align="end" sideOffset={5} className="actions-popover">
          {items.map(({ label, icon: Icon, onClick, destructive }) => (
            <button
              type="button"
              key={label}
              className={destructive ? 'danger' : ''}
              onClick={() => {
                setOpen(false);
                onClick();
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
