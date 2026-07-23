import { cache } from 'react'
import { leagues as mockLeagues, leagueEvents as mockLeagueEvents, mockRegistrations } from '@/data/mock'
import { DEFAULT_CIRCUITS } from '@/lib/circuit-catalog'
import { getFirestoreDb, hasFirebase } from '@/lib/firebase'
import { getTeamsDashboard } from '@/lib/team-data'
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
        const snapshot = await db.collection('leagues').get()

        if (!snapshot.empty) {
          const list = snapshot.docs.map((doc: any) => {
            const data = doc.data()
            return {
              id: doc.id,
              title: data.title || '',
              slug: data.slug || '',
              shortDescription: data.short_description || data.shortDescription || '',
              fullDescription: data.full_description || data.fullDescription || '',
              simulator: data.simulator || 'ac',
              format: data.format || 'sprint',
              classTags: parseClassTags(data.class_tags || data.classTags),
              status: data.status || 'open',
              bannerUrl: data.banner_url || data.bannerUrl || null,
              logoUrl: data.logo_url || data.logoUrl || null,
              startsAt: formatFirestoreValue(data.starts_at || data.startsAt) || new Date().toISOString(),
              endsAt: formatFirestoreValue(data.ends_at || data.endsAt) || new Date().toISOString(),
              featured: Boolean(data.is_featured || data.featured),
              registrationOpen: (data.status || 'open') === 'open',
              registrationMode: (data.registration_mode || data.registrationMode || 'individual') as League['registrationMode'],
              maxDrivers: data.max_drivers ? Number(data.max_drivers) : (data.maxDrivers ? Number(data.maxDrivers) : null),
              maxDriversPerCar: data.max_drivers_per_car ? Number(data.max_drivers_per_car) : (data.maxDriversPerCar ? Number(data.maxDriversPerCar) : 4),
              accentColor: data.accent_color || data.accentColor || null,
              slogan: data.slogan || null,
              discordUrl: data.discord_url || data.discordUrl || null,
              youtubeUrl: data.youtube_url || data.youtubeUrl || null,
              rulebookUrl: data.rulebook_url || data.rulebookUrl || null,
              classLimits: data.class_limits || data.classLimits || null,
            }
          })
          return list.sort((a: any, b: any) => (a.startsAt || '').localeCompare(b.startsAt || ''))
        }
      } catch (error) {
        console.error('Failed to get leagues from Firestore:', error)
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
        let snapshot: any;
        if (leagueId) {
          const [snap1, snap2] = await Promise.all([
            query.where('league_id', '==', leagueId).get().catch(() => ({ docs: [] })),
            query.where('leagueId', '==', leagueId).get().catch(() => ({ docs: [] }))
          ])
          const docMap = new Map()
          snap1.docs.forEach((d: any) => docMap.set(d.id, d))
          snap2.docs.forEach((d: any) => docMap.set(d.id, d))
          snapshot = { docs: Array.from(docMap.values()), empty: docMap.size === 0 }
        } else {
          snapshot = await query.get()
        }
        if (snapshot.empty) return []

        const circuits = await getCircuits()
        const circuitsById = new Map(circuits.map((circuit: any) => [circuit.id, circuit]))

        const events = snapshot.docs.map((doc: any) => {
          const data = doc.data()
          const linkedCircuit = data.circuit_id || data.circuitId ? circuitsById.get((data.circuit_id || data.circuitId) as string) : null
          return {
            id: doc.id,
            leagueId: data.league_id || data.leagueId || '',
            circuitId: data.circuit_id || data.circuitId || null,
            title: data.title || null,
            circuitName: linkedCircuit?.name || data.circuit_name || data.circuitName || '',
            circuitImageUrl: linkedCircuit?.imageUrl || data.circuit_image_url || data.circuitImageUrl || null,
            serverLink: data.server_link || data.serverLink || null,
            startsAt: formatFirestoreValue(data.starts_at || data.startsAt) || '',
            endsAt: formatFirestoreValue(data.ends_at || data.endsAt) || '',
            status: data.status || 'scheduled',
            eventType: data.event_type || data.eventType || undefined,
            countryCode: data.country_code || data.countryCode || null,
          }
        })
        return events.sort((a: any, b: any) => (a.startsAt || '').localeCompare(b.startsAt || ''))
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
        const { teams } = await getTeamsDashboard()
        const activeRegistrations = registrations.filter((r: LeagueRegistration) => {
          if (!r.teamId) return true
          const team = teams.find((t) => t.id === r.teamId)
          if (!team) return false
          const isMember = Array.isArray(team.members) && team.members.some((m: any) => m.userId === r.userId)
          if (!isMember) return false
          const car = (team.cars || []).find((c: any) => {
            const sameClass = String(c.category || '').toUpperCase() === String(r.classTag || '').toUpperCase()
            const sameDorsal = Number(c.dorsal) === Number(r.assignedNumber)
            const drivers = Array.isArray(c.driverUserIds)
              ? c.driverUserIds
              : Array.isArray(c.driver_user_ids)
              ? c.driver_user_ids
              : []
            return sameClass && sameDorsal && drivers.includes(r.userId)
          })
          return Boolean(car)
        })

        return activeRegistrations.sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt))
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
  const filteredList = leagueId ? list.filter((item) => item.leagueId === leagueId) : list

  try {
    const { teams } = await getTeamsDashboard()
    return filteredList.filter((r: any) => {
      if (!r.teamId) return true
      const team = teams.find((t) => t.id === r.teamId)
      if (!team) return false
      const isMember = Array.isArray(team.members) && team.members.some((m: any) => m.userId === r.userId)
      if (!isMember) return false
      const car = (team.cars || []).find((c: any) => {
        const sameClass = String(c.category || '').toUpperCase() === String(r.classTag || '').toUpperCase()
        const sameDorsal = Number(c.dorsal) === Number(r.assignedNumber)
        const drivers = Array.isArray(c.driverUserIds)
          ? c.driverUserIds
          : Array.isArray(c.driver_user_ids)
          ? c.driver_user_ids
          : []
        return sameClass && sameDorsal && drivers.includes(r.userId)
      })
      return Boolean(car)
    })
  } catch {
    return filteredList
  }
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
        const rawConfirmations = snapshot.docs.map((doc: any) => {
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

        const { teams } = await getTeamsDashboard()
        return rawConfirmations.filter((c: any) => {
          const team = teams.find((t) => t.id === c.teamId)
          if (!team) return false
          const car = (team.cars || []).find((carObj: any) => {
            const sameClass = String(carObj.category || '').toUpperCase() === String(c.classTag || '').toUpperCase()
            const sameDorsal = Number(carObj.dorsal) === Number(c.carNumber)
            const hasDrivers = Array.isArray(carObj.driverUserIds) && carObj.driverUserIds.some((id: string) => Boolean(id))
            return sameClass && sameDorsal && hasDrivers
          })
          return Boolean(car)
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
      const list = JSON.parse(raw).filter((c: any) => c.leagueId === leagueId)
      const { teams } = await getTeamsDashboard()
      return list.filter((c: any) => {
        const team = teams.find((t) => t.id === c.teamId)
        if (!team) return false
        const car = (team.cars || []).find((carObj: any) => {
          const sameClass = String(carObj.category || '').toUpperCase() === String(c.classTag || '').toUpperCase()
          const sameDorsal = Number(carObj.dorsal) === Number(c.carNumber)
          const hasDrivers = Array.isArray(carObj.driverUserIds) && carObj.driverUserIds.some((id: string) => Boolean(id))
          return sameClass && sameDorsal && hasDrivers
        })
        return Boolean(car)
      })
    }
  } catch (e) {
    console.error('Failed to get mock event confirmations:', e)
  }
  return []
})
