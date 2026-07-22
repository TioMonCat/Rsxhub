import { cache } from 'react'
import { leagues as mockLeagues, leagueEvents as mockLeagueEvents, mockRegistrations } from '@/data/mock'
import { DEFAULT_CIRCUITS } from '@/lib/circuit-catalog'
import { getFirestoreDb, hasFirebase } from '@/lib/firebase'
import type { Circuit, League, LeagueCar, LeagueEvent, LeagueMember, LeagueRegistration, LeagueResult } from '@/types'

function formatFirestoreValue(val: any): any {
  if (val && typeof val.toDate === 'function') {
    return val.toDate().toISOString()
  }
  return val
}

function parseClassTags(raw: unknown): string[] | undefined {
  if (Array.isArray(raw)) {
    const tags = raw.map((item) => String(item || '').trim().toUpperCase()).filter(Boolean)
    return tags.length ? tags : undefined
  }

  if (typeof raw === 'string') {
    const normalized = raw.trim()
    if (!normalized) return undefined

    if (normalized.startsWith('[') && normalized.endsWith(']')) {
      try {
        const parsed = JSON.parse(normalized)
        if (Array.isArray(parsed)) {
          const tags = parsed.map((item) => String(item || '').trim().toUpperCase()).filter(Boolean)
          return tags.length ? tags : undefined
        }
      } catch {}
    }

    const cleaned = normalized.replace(/^\{|\}$/g, '')
    const tags = cleaned
      .split(',')
      .map((item) => item.replace(/^"+|"+$/g, '').trim().toUpperCase())
      .filter(Boolean)
    return tags.length ? tags : undefined
  }

  return undefined
}

export const getLeagues = cache(async (): Promise<League[]> => {
  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        const snapshot = await db.collection('leagues').orderBy('starts_at', 'asc').get()
        if (snapshot.empty) return []
        return snapshot.docs.map((doc: any) => {
          const data = doc.data()
          return {
            id: doc.id,
            title: data.title || '',
            slug: data.slug || '',
            shortDescription: data.short_description || '',
            fullDescription: data.full_description || '',
            simulator: data.simulator || 'ac',
            format: data.format || 'sprint',
            classTags: parseClassTags(data.class_tags),
            status: data.status || 'open',
            bannerUrl: data.banner_url || null,
            logoUrl: data.logo_url || null,
            startsAt: formatFirestoreValue(data.starts_at) || '',
            endsAt: formatFirestoreValue(data.ends_at) || '',
            featured: Boolean(data.is_featured),
            registrationOpen: Boolean(data.registration_open),
            registrationMode: (data.registration_mode as League['registrationMode']) || 'individual',
            maxDrivers: data.max_drivers ? Number(data.max_drivers) : null,
            accentColor: data.accent_color || null,
            slogan: data.slogan || null,
            discordUrl: data.discord_url || null,
            youtubeUrl: data.youtube_url || null,
            rulebookUrl: data.rulebook_url || null,
            classLimits: data.class_limits || null,
          }
        })
      } catch (error) {
        console.error('Failed to get leagues from Firestore:', error)
        return []
      }
    }
  }

  let list = mockLeagues
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const override = cookieStore.get('mock_leagues')?.value
    if (override) {
      list = JSON.parse(override)
    }
  } catch (e) {}

  return list
})

export const getLeagueBySlug = cache(async (slug: string): Promise<League | null> => {
  const leagues = await getLeagues()
  if (!slug) return null

  const decoded = decodeURIComponent(slug).trim()
  const normalized = decoded.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')

  return (
    leagues.find((league) => {
      if (!league) return false
      if (league.slug === slug || league.id === slug) return true
      if (league.slug === decoded || league.id === decoded) return true

      const leagueSlugNormalized = (league.slug || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
      if (leagueSlugNormalized && leagueSlugNormalized === normalized) return true

      const leagueIdNormalized = (league.id || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
      if (leagueIdNormalized && leagueIdNormalized === normalized) return true

      const leagueTitleNormalized = (league.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
      if (leagueTitleNormalized && leagueTitleNormalized === normalized) return true

      return false
    }) ?? null
  )
})

export const getCircuits = cache(async (): Promise<Circuit[]> => {
  if (!hasFirebase) return DEFAULT_CIRCUITS
  const db = getFirestoreDb()
  if (!db) return DEFAULT_CIRCUITS

  try {
    const snapshot = await db.collection('circuits').orderBy('name', 'asc').get()
    if (snapshot.empty) return DEFAULT_CIRCUITS
    return snapshot.docs.map((doc: any) => {
      const data = doc.data()
      return {
        id: doc.id,
        name: data.name || '',
        slug: data.slug || '',
        imageUrl: data.image_url || '',
        isSystem: Boolean(data.is_system),
      }
    })
  } catch (error) {
    console.error('Failed to get circuits from Firestore:', error)
    return DEFAULT_CIRCUITS
  }
})

export const getLeagueEvents = cache(async (leagueId?: string): Promise<LeagueEvent[]> => {
  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        let query = db.collection('league_events')
        let snapshot;
        if (leagueId) {
          snapshot = await query.where('league_id', '==', leagueId).get()
        } else {
          snapshot = await query.get()
        }
        if (snapshot.empty) return []

        const circuits = await getCircuits()
        const circuitsById = new Map(circuits.map((circuit: any) => [circuit.id, circuit]))

        const events = snapshot.docs.map((doc: any) => {
          const data = doc.data()
          const linkedCircuit = data.circuit_id ? circuitsById.get(data.circuit_id as string) : null
          return {
            id: doc.id,
            leagueId: data.league_id || '',
            circuitId: data.circuit_id || null,
            title: data.title || null,
            circuitName: linkedCircuit?.name || data.circuit_name || '',
            circuitImageUrl: linkedCircuit?.imageUrl || data.circuit_image_url || null,
            serverLink: data.server_link || data.serverLink || null,
            startsAt: formatFirestoreValue(data.starts_at) || '',
            endsAt: formatFirestoreValue(data.ends_at) || '',
            status: data.status || 'scheduled',
          }
        })
        return events.sort((a: any, b: any) => a.startsAt.localeCompare(b.startsAt))
      } catch (error) {
        console.error('Failed to get league events from Firestore:', error)
        return []
      }
    }
  }

  const leagues = await getLeagues()
  if (leagues.length === 0) {
    return []
  }
  let events = mockLeagueEvents
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const override = cookieStore.get('mock_league_events')?.value
    if (override) {
      events = JSON.parse(override)
    }
  } catch (e) {}
  return leagueId ? events.filter((event) => event.leagueId === leagueId) : events
})

export const getLeagueCars = cache(async (leagueId: string): Promise<LeagueCar[]> => {
  if (!hasFirebase) return []
  const db = getFirestoreDb()
  if (!db) return []

  try {
    const snapshot = await db
      .collection('league_cars')
      .where('league_id', '==', leagueId)
      .where('is_active', '==', true)
      .get()

    if (snapshot.empty) return []

    const cars = snapshot.docs.map((doc: any) => {
      const data = doc.data()
      return {
        id: doc.id,
        leagueId: data.league_id || '',
        label: data.label || '',
        model: data.model || '',
        sortOrder: data.sort_order ? Number(data.sort_order) : 0,
        isActive: data.is_active !== false,
      }
    })
    return cars.sort((a: any, b: any) => a.sortOrder - b.sortOrder)
  } catch (error) {
    console.error('Failed to get league cars from Firestore:', error)
    return []
  }
})

export const getRegistrations = cache(async (leagueId?: string): Promise<LeagueRegistration[]> => {
  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        let query = db.collection('league_registrations')
        let snapshot;
        if (leagueId) {
          snapshot = await query.where('league_id', '==', leagueId).get()
        } else {
          snapshot = await query.get()
        }

        if (snapshot.empty) return []

        const registrations = snapshot.docs.map((doc: any) => {
          const data = doc.data()
          return {
            id: doc.id,
            leagueId: data.league_id || '',
            userId: data.user_id || '',
            teamId: data.team_id || null,
            displayName: data.display_name || '',
            steamId: data.steam_id || '',
            classTag: data.class_tag || null,
            assignedNumber: data.assigned_number != null ? Number(data.assigned_number) : null,
            createdAt: formatFirestoreValue(data.created_at) || '',
            status: data.status || 'pending',
          }
        })
        return registrations.sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt))
      } catch (error) {
        console.error('Failed to get registrations from Firestore:', error)
        return []
      }
    }
  }

  let list = mockRegistrations
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const override = cookieStore.get('mock_registrations')?.value
    if (override) {
      list = JSON.parse(override)
    }
  } catch (e) {}

  const leagues = await getLeagues()
  if (leagues.length === 0) {
    return []
  }
  return leagueId ? list.filter((item) => item.leagueId === leagueId) : list
})

export const getLeagueResults = cache(async (leagueId: string): Promise<LeagueResult[]> => {
  if (!hasFirebase) return []
  const db = getFirestoreDb()
  if (!db) return []

  try {
    const snapshot = await db
      .collection('league_results')
      .where('league_id', '==', leagueId)
      .get()

    if (snapshot.empty) return []

    const results = snapshot.docs.map((doc: any) => {
      const data = doc.data()
      return {
        id: doc.id,
        leagueId: data.league_id || '',
        eventId: data.event_id || '',
        userId: data.user_id || '',
        position: data.position ? Number(data.position) : 0,
        points: data.points != null ? Number(data.points) : null,
        createdAt: formatFirestoreValue(data.created_at) || '',
      }
    })
    return results.sort((a: any, b: any) => a.position - b.position)
  } catch (error) {
    console.error('Failed to get league results from Firestore:', error)
    return []
  }
})

export const getLeagueMembers = cache(async (leagueId: string): Promise<LeagueMember[]> => {
  if (!hasFirebase) return []
  const db = getFirestoreDb()
  if (!db) return []

  try {
    const snapshot = await db
      .collection('league_members')
      .where('league_id', '==', leagueId)
      .get()

    if (snapshot.empty) return []

    const members = snapshot.docs.map((doc: any) => {
      const data = doc.data()
      return {
        id: doc.id,
        leagueId: data.league_id || '',
        userId: data.user_id || '',
        role: (data.role || 'driver') as LeagueMember['role'],
        createdAt: formatFirestoreValue(data.created_at) || '',
      }
    })

    const userIds = Array.from(new Set(members.map((item: any) => item.userId)))
    if (userIds.length === 0) return []

    const profilesSnapshot = await db.collection('profiles').where('user_id', 'in', userIds).get()
    const steamSnapshot = await db.collection('steam_accounts').where('user_id', 'in', userIds).get()

    const profileByUserId = new Map<string, string>(
      profilesSnapshot.docs.map((doc: any) => {
        const data = doc.data()
        return [data.user_id, data.display_name || '']
      })
    )

    const steamByUserId = new Map<string, { steamId: string; steamDisplayName: string }>(
      steamSnapshot.docs.map((doc: any) => {
        const data = doc.data()
        return [
          data.user_id,
          {
            steamId: data.steam_id || '',
            steamDisplayName: data.steam_display_name || '',
          }
        ]
      })
    )

    return members.map((item: any) => {
      const steam = steamByUserId.get(item.userId)
      return {
        id: item.id,
        leagueId: item.leagueId,
        userId: item.userId,
        role: item.role,
        createdAt: item.createdAt,
        steamId: steam?.steamId,
        steamDisplayName: steam?.steamDisplayName,
        displayName: profileByUserId.get(item.userId) || '',
      }
    }).sort((a: any, b: any) => a.createdAt.localeCompare(b.createdAt))
  } catch (error) {
    console.error('Failed to get league members from Firestore:', error)
    return []
  }
})

export const getEventConfirmations = cache(async (leagueId: string): Promise<any[]> => {
  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        const snapshot = await db
          .collection('league_event_confirmations')
          .where('league_id', '==', leagueId)
          .get()
        if (snapshot.empty) return []
        return snapshot.docs.map((doc: any) => {
          const data = doc.data()
          return {
            id: doc.id,
            eventId: data.event_id || '',
            leagueId: data.league_id || '',
            teamId: data.team_id || '',
            classTag: data.class_tag || '',
            carNumber: Number(data.car_number || 0),
            carModel: data.car_model || '',
            status: data.status || 'confirmed',
            confirmedAt: formatFirestoreValue(data.confirmed_at) || '',
          }
        })
      } catch (error) {
        console.error('Failed to get event confirmations from Firestore:', error)
        return []
      }
    }
  }

  // Cookie-based fallback
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const raw = cookieStore.get('mock_event_confirmations')?.value
    if (raw) {
      const list = JSON.parse(raw)
      return list.filter((c: any) => c.leagueId === leagueId)
    }
  } catch (e) {
    console.error('Failed to get mock event confirmations:', e)
  }
  return []
})
