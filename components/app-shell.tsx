import { getAdminAccessContext, getCurrentUser } from '@/lib/auth'
import { TopNav } from '@/components/top-nav'
import { Footer } from '@/components/footer'
import { getFirestoreDb, hasFirebase } from '@/lib/firebase'

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  const access = await getAdminAccessContext(user?.userId)

  let displayName = user?.steamDisplayName
  let avatarUrl = user?.avatarUrl

  if (user) {
    if (hasFirebase) {
      const db = getFirestoreDb()
      if (db) {
        try {
          const doc = await db.collection('profiles').doc(user.userId).get()
          if (doc.exists) {
            const data = doc.data()
            displayName = data?.display_name || displayName
            avatarUrl = data?.avatar_url || avatarUrl
          }
        } catch (e) {}
      }
    } else {
      try {
        const { cookies } = await import('next/headers')
        const cookieStore = await cookies()
        const mockProfile = cookieStore.get(`mock_profile_${user.userId}`)?.value || cookieStore.get('mock_profile')?.value
        if (mockProfile) {
          const parsed = JSON.parse(mockProfile)
          if (!parsed.user_id || parsed.user_id === user.userId) {
            displayName = parsed.display_name || displayName
            avatarUrl = parsed.avatar_url || avatarUrl
          }
        }
      } catch (e) {}
    }
  }

  return (
    <div className="min-h-screen bg-shell flex flex-col justify-between">
      <div className="w-full">
        <header className="border-y border-shell-line bg-black relative">
          <div className="w-full px-6 py-2.5 md:px-12 md:py-3">
            <TopNav
              signedIn={Boolean(user)}
              showAdmin={access.canAccessPlatformAdmin}
              displayName={displayName}
              avatarUrl={avatarUrl}
            />
          </div>
        </header>

        <main className="w-full px-10 py-4 md:px-20 md:py-6">{children}</main>
      </div>

      <Footer />
    </div>
  )
}
