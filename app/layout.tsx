import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ClientProviders } from './providers'

export const metadata: Metadata = {
  title: 'CleanMysuru AI · Civic Operations Command Center',
  description: 'AI-powered civic waste detection and municipal command center for Mysuru. Detect civic waste before someone has to report it.',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f4f6f9',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      </head>
      <body className="antialiased bg-[#f4f6f9] text-[#0f172a]">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  )
}
