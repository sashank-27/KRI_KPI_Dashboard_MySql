import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

export const metadata: Metadata = {
  title: 'KPI & Task mangement',
  description: 'Created with v0',
  generator: 'v0.app',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className={GeistSans.className}>
        {children}
        <Analytics debug={false} />
        {/* Suppress development warnings in browser console */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
                const originalError = console.error;
                const originalWarn = console.warn;
                
                console.error = function(...args) {
                  const message = args.join(' ');
                  // Suppress specific Next.js stale warnings
                  if (message.includes('stale') || 
                      message.includes('15.2.4') || 
                      message.includes('deprecation') ||
                      message.includes('warning')) {
                    return;
                  }
                  originalError.apply(console, args);
                };
                
                console.warn = function(...args) {
                  const message = args.join(' ');
                  // Suppress specific warnings
                  if (message.includes('stale') || 
                      message.includes('15.2.4') || 
                      message.includes('deprecation')) {
                    return;
                  }
                  originalWarn.apply(console, args);
                };
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
