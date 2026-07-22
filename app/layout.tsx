import './globals.css'
import type { Metadata } from 'next'
import { Roboto } from 'next/font/google'
import { AppShell } from '@/components/app-shell'
import { DevRoleSimulator } from '@/components/dev-role-simulator'
import { Suspense } from 'react'
import { GlobalLoader } from '@/components/global-loader'

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700', '900'],
  style: ['normal', 'italic'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'SimLeague Platform',
  description: 'League platform for Assetto Corsa and Le Mans Ultimate',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={roboto.className}>
        <AppShell>{children}</AppShell>
        <Suspense fallback={null}>
          <GlobalLoader />
        </Suspense>
        <DevRoleSimulator />
      </body>
    </html>
  )
}
