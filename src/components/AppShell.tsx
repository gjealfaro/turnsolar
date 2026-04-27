'use client'
import { AuthProvider, useAuth } from '@/lib/auth'
import { OfferFormProvider } from '@/lib/offerFormStore'
import LoginPage from '@/components/LoginPage'
import Sidebar from '@/components/Sidebar'

function Shell({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth()
  if (!isLoggedIn) return <LoginPage />
  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  )
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <OfferFormProvider>
        <Shell>{children}</Shell>
      </OfferFormProvider>
    </AuthProvider>
  )
}
