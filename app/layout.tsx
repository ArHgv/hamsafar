import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { AppShell } from '@/components/layout/app-shell';
export const metadata: Metadata = {
  title: { default: 'هم‌سفر | کمی دورتر از روزمرگی', template: '%s | هم‌سفر' },
  description:
    'سفر، برنامه، کیف سفر، هزینه‌ها و هم‌سفرها؛ همه در یک جای آرام. برنامه‌ریزی سفر فردی و گروهی به زبان فارسی.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icons/icon.svg', apple: '/icons/icon-192.png' },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'هم‌سفر' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#101210' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var s=JSON.parse(localStorage.getItem('hamsafar-v1')||'{}').state;var t=s?.theme||'dark';document.documentElement.className=t==='black-gold'?'black-gold':t==='white-gold'?'white-gold':(t==='light'||t==='system'&&!matchMedia('(prefers-color-scheme: dark)').matches)?'light':'dark';if(s?.reduceTransparency)document.documentElement.classList.add('reduce-transparency')}catch(e){}`,
          }}
        />
      </head>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
