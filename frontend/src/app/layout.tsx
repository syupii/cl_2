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
      <head>
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
      </head>
      <body className="min-h-full bg-background text-foreground">
        <script dangerouslySetInnerHTML={{ __html: `
  window.addEventListener('error', (e) => {
    document.body.innerHTML = '<pre style="padding:1rem;white-space:pre-wrap;font-size:12px">' 
      + 'ERROR: ' + e.message + '\\nat ' + (e.filename||'?') + ':' + e.lineno
      + '\\n\\nUA: ' + navigator.userAgent + '</pre>'
  })
  window.addEventListener('unhandledrejection', (e) => {
    document.body.innerHTML = '<pre style="padding:1rem;white-space:pre-wrap;font-size:12px">' 
      + 'UNHANDLED REJECTION: ' + (e.reason && e.reason.message || e.reason)
      + '\\n\\nUA: ' + navigator.userAgent + '</pre>'
  })
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
