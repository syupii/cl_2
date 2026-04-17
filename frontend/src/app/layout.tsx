import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from 'next-themes'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { Toaster } from '@/components/ui/sonner'
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'サブスク管理ダッシュボード',
  description: '契約中のサブスクリプションを一元管理します',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'サブスク管理',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <script dangerouslySetInnerHTML={{ __html: `
  function __renderFatal(text) {
    var pre = document.createElement('pre');
    pre.style.padding = '1rem';
    pre.style.whiteSpace = 'pre-wrap';
    pre.style.fontSize = '12px';
    pre.textContent = text;
    document.body.replaceChildren(pre);
  }
  window.addEventListener('error', function (e) {
    __renderFatal(
      'ERROR: ' + e.message +
      '\\nat ' + (e.filename || '?') + ':' + e.lineno +
      '\\n\\nUA: ' + navigator.userAgent
    );
  });
  window.addEventListener('unhandledrejection', function (e) {
    var reason = (e.reason && e.reason.message) || e.reason;
    __renderFatal(
      'UNHANDLED REJECTION: ' + reason +
      '\\n\\nUA: ' + navigator.userAgent
    );
  });
`}} />

        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <QueryProvider>
            {children}
          </QueryProvider>
          <Toaster richColors position="top-right" />
          <ServiceWorkerRegistrar />
        </ThemeProvider>
      </body>
    </html>
  )
}
