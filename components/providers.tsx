'use client';
import { useEffect, type ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';
import { useTripStore } from '@/store/use-trip-store';
import { Toasts } from './ui/toasts';
import { CloudBridge } from './cloud-bridge';
export function Providers({ children }: { children: ReactNode }) {
  const theme = useTripStore((s) => s.theme),
    reduce = useTripStore((s) => s.reduceTransparency);
  useEffect(() => {
    Promise.resolve(useTripStore.persist.rehydrate()).finally(() =>
      useTripStore.getState().setHydrated(),
    );
    const listener = (e: StorageEvent) => {
      if (e.key === 'hamsafar-v1') {
        Promise.resolve(useTripStore.persist.rehydrate()).finally(() =>
          useTripStore.getState().setHydrated(),
        );
      }
    };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  }, []);
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const blackGold = theme === 'black-gold';
      const whiteGold = theme === 'white-gold';
      const dark = theme === 'dark' || blackGold || (theme === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.documentElement.classList.toggle('light', !dark);
      document.documentElement.classList.toggle('black-gold', blackGold);
      document.documentElement.classList.toggle('white-gold', whiteGold);
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute(
          'content',
          blackGold ? '#0b0b0c' : whiteGold ? '#fffdf7' : dark ? '#101210' : '#f5f5ef',
        );
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  useEffect(() => {
    document.documentElement.classList.toggle('reduce-transparency', reduce);
  }, [reduce]);
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator)
      navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  return (
    <MotionConfig reducedMotion="user">
      <CloudBridge />
      {children}
      <Toasts />
    </MotionConfig>
  );
}
