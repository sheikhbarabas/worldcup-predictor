import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'World Cup 2026 Predictor',
  description: 'Predict World Cup 2026 group stage results and compete with friends',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-900 text-slate-100">
        {children}
      </body>
    </html>
  )
}
