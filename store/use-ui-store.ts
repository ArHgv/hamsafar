'use client';
import { create } from 'zustand';
interface Toast {
  id: number;
  message: string;
  kind: 'success' | 'error' | 'info';
}
interface UIState {
  toasts: Toast[];
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  toast: (message: string, kind?: Toast['kind']) => void;
  dismiss: (id: number) => void;
}
let sequence = 0;
export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  searchOpen: false,
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  toast: (message, kind = 'success') => {
    const id = ++sequence;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, message, kind }] }));
    setTimeout(
      () => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      kind === 'error' ? 7000 : 4000,
    );
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
export const useToast = () => useUIStore((s) => s.toast);
