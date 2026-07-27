'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getFirestoreDb, hasFirebase } from '@/lib/firebase'
import { clearSession } from '@/lib/session'
import { guardPlatformAdmin } from './admin-league'

export async function resetDatabaseAction() {
  const session = await guardPlatformAdmin()

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        const collections = [
          'circuits',
          'league_cars',
          'league_events',
          'league_members',
          'league_registrations',
          'league_team_registrations',
          'league_team_registration_drivers',
          'league_results',
          'leagues',
          'teams',
          'team_members',
          'team_invites',
          'market_listings',
          'market_applications',
          'market_invites',
          'league_result_imports',
          'users',
          'profiles',
          'steam_accounts',
          'platform_roles'
        ]

        for (const colName of collections) {
          try {
            const snapshot = await db.collection(colName).get()
            if (!snapshot.empty) {
              const batch = db.batch()
              snapshot.docs.forEach((doc: any) => {
                batch.delete(doc.ref)
              })
              await batch.commit()
              console.log(`Cleared collection: ${colName}`)
            }
          } catch (err) {
            console.error(`Failed to clear collection ${colName}:`, err)
          }
        }

      } catch (error) {
        console.error('General error resetting Firestore database:', error)
      }
    }
  }

  // Also clear any mock cookies to reset mock mode as well
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    
    // To ensure the mock database is completely empty and starts from zero,
    // we set the cookies to empty arrays instead of deleting them.
    // Deleting them would fall back to the default pre-populated items from `@/data/mock`.
    const cookieOptions = { path: '/', maxAge: 60 * 60 * 24 * 30 }
    cookieStore.set('mock_leagues', '[]', cookieOptions)
    cookieStore.set('mock_league_events', '[]', cookieOptions)
    cookieStore.set('mock_registrations', '[]', cookieOptions)
    cookieStore.set('mock_teams', '[]', cookieOptions)
    cookieStore.set('mock_market_listings', '[]', cookieOptions)
    cookieStore.set('mock_market_applications', '[]', cookieOptions)
    cookieStore.set('mock_market_invites', '[]', cookieOptions)
    
    // Clear custom profile to start profile testing from zero as well
    const session = await getCurrentUser()
    if (session?.userId) {
      cookieStore.delete(`mock_profile_${session.userId}`)
    }
    cookieStore.delete('mock_profile')
    cookieStore.delete('mock_role')
  } catch (err) {
    console.error('Failed to clear mock cookies:', err)
  }

  // LOGOUT/CLEAR SESSION COMPLETELY!
  try {
    await clearSession()
  } catch (err) {
    console.error('Failed to clear active session:', err)
  }

  revalidatePath('/')
  revalidatePath('/admin')
  revalidatePath('/ligas')
  revalidatePath('/equipos')
  revalidatePath('/calendario')
  revalidatePath('/market')
  revalidatePath('/perfil')

  redirect('/?reset=success')
}