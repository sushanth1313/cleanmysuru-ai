'use client'

import { StoreProvider } from '@/components/store-provider'
import { ToastContainer } from '@/components/toast'

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      {children}
      <ToastContainer />
    </StoreProvider>
  )
}
