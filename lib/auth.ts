import { cache } from 'react'
import { getFirestoreDb, hasFirebase } from '@/lib/firebase'
import { createSession, getSession } from '@/lib/session'
import type { LeagueRole, PlatformRole, SessionUser } from '@/types'
import { fetchSteamPlayerSummary } from '@/lib/steam'

const PLATFORM_ROLE_WEIGHT: Record<PlatformRole, number> = {
  user: 0,
  platform_admin: 1,
  super_admin: 2,
}

const LEAGUE_ADMIN_ROLES: LeagueRole[] = ['league_owner', 'league_admin']
const LEAGUE_STEWARD_ROLES: LeagueRole[] = ['league_owner', 'league_admin', 'steward']

export const getCurrentUser = cache(async () => {
  const session = await getSession()
  if (session) {
    if (!session.userId) {
      session.userId = `steam_${session.steamId}`
    }
    // If we have a generic name or are missing the avatar, try to resolve it dynamically from Steam
    if (!session.avatarUrl || session.steamDisplayName.startsWith('Steam User')) {
      try {
        const summary = await fetchSteamPlayerSummary(session.steamId)
        if (summary && !summary.steamDisplayName.startsWith('Steam User')) {
          session.steamDisplayName = summary.steamDisplayName
          if (summary.avatarUrl) {
            session.avatarUrl = summary.avatarUrl
          }
        }
      } catch (err) {
        console.error('Failed to resolve Steam summary in getCurrentUser:', err)
      }
    }
  }
  return session
})

function getConfiguredAdminSteamIds() {
  return (process.env.ADMIN_STEAM_IDS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function canAccessPlatformAdmin(role?: PlatformRole | null) {
  return role === 'super_admin' || role === 'platform_admin'
}

export function canManageLeague(role?: LeagueRole | null) {
  return !!role && LEAGUE_ADMIN_ROLES.includes(role)
}

export function canStewardLeague(role?: LeagueRole | null) {
  return !!role && LEAGUE_STEWARD_ROLES.includes(role)
}

export const getPlatformRole = cache(async (userId?: string): Promise<PlatformRole | null> => {
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const mockRole = cookieStore.get('mock_role')?.value
    if (mockRole === 'admin') return 'super_admin'
    if (mockRole === 'leader' || mockRole === 'driver') return 'user'
  } catch (e) {}

  const session = await getSession()
  if (!session) return null

  const configuredAdmins = getConfiguredAdminSteamIds()
  if (configuredAdmins.includes(session.steamId)) return 'super_admin'

  const resolvedUserId = userId || session.userId
  if (!resolvedUserId) return 'user'

  if (!hasFirebase) return 'user'
  const db = getFirestoreDb()
  if (!db) return 'user'

  try {
    const snapshot = await db.collection('platform_roles').where('user_id', '==', resolvedUserId).get()
    if (snapshot.empty) return 'user'

    const roles = snapshot.docs.map((doc: any) => doc.data().role as PlatformRole)
    return roles.sort((a: PlatformRole, b: PlatformRole) => PLATFORM_ROLE_WEIGHT[b] - PLATFORM_ROLE_WEIGHT[a])[0] || 'user'
  } catch (error) {
    console.error('Failed to get platform role from Firestore:', error)
    return 'user'
  }
})

export const getLeagueRole = cache(async (leagueId: string, userId?: string): Promise<LeagueRole | null> => {
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const mockRole = cookieStore.get('mock_role')?.value
    if (mockRole === 'admin') return 'league_owner'
    if (mockRole === 'leader') return 'steward'
    if (mockRole === 'driver') return null
  } catch (e) {}

  const session = await getSession()
  if (!session) return null
  const resolvedUserId = userId || session.userId
  if (!resolvedUserId) return null

  if (!hasFirebase) return null
  const db = getFirestoreDb()
  if (!db) return null

  try {
    const snapshot = await db
      .collection('league_members')
      .where('league_id', '==', leagueId)
      .where('user_id', '==', resolvedUserId)
      .limit(1)
      .get()

    if (snapshot.empty) return null
    return (snapshot.docs[0].data().role as LeagueRole) || null
  } catch (error) {
    console.error('Failed to get league role from Firestore:', error)
    return null
  }
})

export const getLeagueMemberships = cache(async (userId?: string) => {
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const mockRole = cookieStore.get('mock_role')?.value
    if (mockRole === 'leader' || mockRole === 'admin') {
      const { getLeagues } = await import('@/lib/platform-data')
      const leagues = await getLeagues()
      return leagues.map((l: any) => ({
        leagueId: l.id,
        role: (mockRole === 'admin' ? 'league_owner' : 'steward') as LeagueRole,
      }))
    }
  } catch (e) {}

  const session = await getSession()
  if (!session) return []
  const resolvedUserId = userId || session.userId
  if (!resolvedUserId) return []

  if (!hasFirebase) return []
  const db = getFirestoreDb()
  if (!db) return []

  try {
    const snapshot = await db.collection('league_members').where('user_id', '==', resolvedUserId).get()
    if (snapshot.empty) return []

    return snapshot.docs.map((doc: any) => {
      const data = doc.data()
      return {
        leagueId: data.league_id as string,
        role: data.role as LeagueRole,
      }
    })
  } catch (error) {
    console.error('Failed to get league memberships from Firestore:', error)
    return []
  }
})

export const getAdminAccessContext = cache(async (userId?: string) => {
  const session = await getSession()
  if (!session) {
    return {
      platformRole: null as PlatformRole | null,
      memberships: [] as Array<{ leagueId: string; role: LeagueRole }>,
      managedLeagueIds: [] as string[],
      canAccessAnyLeagueAdmin: false,
      canAccessPlatformAdmin: false,
    }
  }

  const platformRole = await getPlatformRole(userId)
  const memberships = await getLeagueMemberships(userId)
  const managedLeagueIds = memberships.filter((item: any) => canStewardLeague(item.role)).map((item: any) => item.leagueId)
  const platformAdmin = canAccessPlatformAdmin(platformRole)

  return {
    platformRole,
    memberships,
    managedLeagueIds,
    canAccessAnyLeagueAdmin: platformAdmin || managedLeagueIds.length > 0,
    canAccessPlatformAdmin: platformAdmin,
  }
})

export async function isAdminUser() {
  const access = await getAdminAccessContext()
  return access.canAccessAnyLeagueAdmin
}

export async function upsertUserFromSteam(user: SessionUser) {
  const resolvedUserId = user.userId || `steam_${user.steamId}`
  if (!hasFirebase) {
    await createSession({ ...user, userId: resolvedUserId })
    let isNew = true
    try {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const mockProfileStr = cookieStore.get(`mock_profile_${resolvedUserId}`)?.value || cookieStore.get('mock_profile')?.value
      if (mockProfileStr) {
        const parsed = JSON.parse(mockProfileStr)
        if (!parsed.user_id || parsed.user_id === resolvedUserId) {
          if (parsed.onboarded) {
            isNew = false
          }
        }
      }
    } catch (e) {
      console.error('Failed to read mock_profile during upsertUserFromSteam:', e)
    }
    return { ok: true, mode: 'session-only', isNew }
  }
  const db = getFirestoreDb()
  if (!db) {
    await createSession({ ...user, userId: resolvedUserId })
    let isNew = true
    try {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const mockProfileStr = cookieStore.get(`mock_profile_${resolvedUserId}`)?.value || cookieStore.get('mock_profile')?.value
      if (mockProfileStr) {
        const parsed = JSON.parse(mockProfileStr)
        if (!parsed.user_id || parsed.user_id === resolvedUserId) {
          if (parsed.onboarded) {
            isNew = false
          }
        }
      }
    } catch (e) {}
    return { ok: true, mode: 'session-only', isNew }
  }

  try {
    const steamSnapshot = await db
      .collection('steam_accounts')
      .where('steam_id', '==', user.steamId)
      .limit(1)
      .get()

    let userId = ''
    let isNew = false

    if (steamSnapshot.empty) {
      isNew = true
      // Create a new user ID
      const userRef = db.collection('users').doc()
      userId = userRef.id

      await userRef.set({
        created_at: new Date(),
      })

      // Link steam account (using userId as the document ID)
      await db.collection('steam_accounts').doc(userId).set({
        user_id: userId,
        steam_id: user.steamId,
        steam_display_name: user.steamDisplayName,
        steam_avatar_url: user.avatarUrl || null,
        steam_profile_url: `https://steamcommunity.com/profiles/${user.steamId}`,
        created_at: new Date(),
      })

      // Create pilot profile
      await db.collection('profiles').doc(userId).set({
        user_id: userId,
        display_name: user.steamDisplayName,
        main_sim: 'ac',
        avatar_url: user.avatarUrl || null,
        country_code: 'ES',
        bio: '',
        onboarded: false,
        created_at: new Date(),
      })

      // Assign default platform role
      await db.collection('platform_roles').doc(userId).set({
        user_id: userId,
        role: 'user',
        created_at: new Date(),
      })
    } else {
      const doc = steamSnapshot.docs[0]
      userId = doc.data().user_id || doc.id

      // Check if they are actually onboarded
      try {
        const profileDoc = await db.collection('profiles').doc(userId).get()
        if (profileDoc.exists) {
          const profileData = profileDoc.data()
          if (!profileData || !profileData.onboarded) {
            isNew = true
          }
        } else {
          isNew = true
        }
      } catch (err) {
        console.error('Failed to read profile status during Steam callback:', err)
      }

      await db.collection('steam_accounts').doc(userId).update({
        steam_display_name: user.steamDisplayName,
        steam_avatar_url: user.avatarUrl || null,
      })
    }

    await createSession({ ...user, userId })
    return { ok: true, userId, isNew }
  } catch (error) {
    console.error('Failed to upsert user from Steam in Firestore:', error)
    console.log('Falling back to session-only authentication mode.')
    await createSession({ ...user, userId: `steam_${user.steamId}` })
    return { ok: true, mode: 'session-only-fallback', isNew: true }
  }
}
