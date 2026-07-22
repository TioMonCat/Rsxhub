'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  canAccessPlatformAdmin,
  canManageLeague,
  canStewardLeague,
  getCurrentUser,
  getLeagueRole,
  getPlatformRole,
} from '@/lib/auth'
import { getFirestoreDb, hasFirebase, runWithTimeout } from '@/lib/firebase'
import { clearSession } from '@/lib/session'
import type { LeagueRole } from '@/types'

async function guardPlatformAdmin() {
  const session = await getCurrentUser()
  const role = await getPlatformRole(session?.userId)
  if (!session || !canAccessPlatformAdmin(role)) redirect('/perfil')
  return session
}

function parseClassTags(formData: FormData) {
  const fromButtons = formData
    .getAll('classTags')
    .map((entry) => String(entry || '').trim().toUpperCase())
    .filter(Boolean)
  const fromText = String(formData.get('customClassTags') || '')
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean)
  return Array.from(new Set([...fromButtons, ...fromText])).slice(0, 8)
}

export async function createLeague(formData: FormData) {
  const session = await guardPlatformAdmin()

  const title = String(formData.get('title') || '')
  const slug = String(formData.get('slug') || '')
  const classTags = parseClassTags(formData)

  const payload = {
    title,
    slug,
    short_description: String(formData.get('shortDescription') || ''),
    full_description: String(formData.get('fullDescription') || ''),
    simulator: String(formData.get('simulator') || 'ac'),
    format: String(formData.get('format') || 'sprint'),
    status: String(formData.get('status') || 'draft'),
    banner_url: String(formData.get('bannerUrl') || ''),
    is_featured: formData.get('featured') === 'on',
    registration_open: formData.get('registrationOpen') === 'on',
    registration_mode: String(formData.get('registrationMode') || 'individual'),
    max_drivers: formData.get('maxDrivers') ? Number(formData.get('maxDrivers')) : null,
    class_tags: classTags,
    created_at: new Date(),
  }

  let createdViaFirestore = false
  let leagueId = ''

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        const docRef = await runWithTimeout(db.collection('leagues').add(payload), 3500)
        leagueId = docRef.id

        await runWithTimeout(db.collection('league_members').doc(`${leagueId}_${session.userId}`).set({
          league_id: leagueId,
          user_id: session.userId,
          role: 'league_owner',
          created_at: new Date(),
        }), 3500)

        createdViaFirestore = true
      } catch (error) {
        console.error('Failed to create league in Firestore (falling back to mock):', error)
      }
    }
  }

  if (!createdViaFirestore) {
    // Fallback Mock Mode cookie creation
    try {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const existingCookie = cookieStore.get('mock_leagues')?.value
      
      let currentLeagues = []
      if (existingCookie) {
        currentLeagues = JSON.parse(existingCookie)
      } else {
        const { leagues: defaultLeagues } = await import('@/data/mock')
        currentLeagues = [...defaultLeagues]
      }

      const mockLeagueId = `mock_league_${Date.now()}`
      const newLeague = {
        id: mockLeagueId,
        title,
        slug,
        simulator: payload.simulator,
        format: payload.format,
        classTags: classTags,
        startsAt: new Date().toISOString(),
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        maxDrivers: payload.max_drivers,
        registrationOpen: payload.registration_open,
        bannerUrl: payload.banner_url || null,
        logoUrl: null,
        status: payload.status,
        featured: payload.is_featured,
        registrationMode: payload.registration_mode,
        shortDescription: payload.short_description,
      }

      currentLeagues.push(newLeague)
      cookieStore.set('mock_leagues', JSON.stringify(currentLeagues), {
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      })
    } catch (e) {
      console.error('Failed to create mock league in fallback:', e)
    }
  }

  revalidatePath('/admin')
  revalidatePath('/ligas')
  redirect('/admin?created=1')
}

async function guardLeaguePermission(leagueId: string, required: 'manage' | 'steward') {
  const session = await getCurrentUser()
  if (!session) redirect('/perfil')

  const platformRole = await getPlatformRole(session.userId)
  if (canAccessPlatformAdmin(platformRole)) {
    return { session, platformRole, leagueRole: null as LeagueRole | null }
  }

  const leagueRole = await getLeagueRole(leagueId, session.userId)
  const allowed = required === 'manage' ? canManageLeague(leagueRole) : canStewardLeague(leagueRole)

  if (!allowed) redirect('/admin')

  return { session, platformRole, leagueRole }
}

function addMinutesToIso(startsAt: string, durationMinutes: number) {
  const start = new Date(startsAt)
  if (Number.isNaN(start.getTime())) return null
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000)
  return end.toISOString()
}

export async function createEvent(formData: FormData) {
  const leagueId = String(formData.get('leagueId') || '')
  const { session } = await guardLeaguePermission(leagueId, 'manage')
  if (!hasFirebase) redirect('/admin?mode=mock')
  const db = getFirestoreDb()
  if (!db) redirect('/admin?mode=mock')

  const title = String(formData.get('title') || '').trim()
  const startsAt = String(formData.get('startsAt') || '').trim()
  const durationMinutes = Number(formData.get('durationMinutes') || 0)
  const endsAt = addMinutesToIso(startsAt, Number.isFinite(durationMinutes) ? durationMinutes : 0)
  if (!title || !startsAt || !endsAt || !Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    redirect(`/admin/ligas/${leagueId}?eventError=missing-fields`)
  }

  const selectedCircuitId = String(formData.get('circuitId') || '')
  const customCircuitName = String(formData.get('customCircuitName') || '').trim()
  const customCircuitImageUrl = String(formData.get('customCircuitImageUrl') || '').trim()
  let circuitId: string | null = null
  let circuitName = ''

  try {
    if (selectedCircuitId === 'custom') {
      if (!customCircuitName || !customCircuitImageUrl) {
        redirect(`/admin/ligas/${leagueId}?eventError=custom-circuit-required`)
      }

      const slug = customCircuitName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')

      circuitId = `custom_${slug}`
      await db.collection('circuits').doc(circuitId).set({
        name: customCircuitName,
        slug,
        image_url: customCircuitImageUrl,
        is_system: false,
        created_by: session.userId,
        created_at: new Date(),
      }, { merge: true })

      circuitName = customCircuitName
    } else if (selectedCircuitId) {
      const circuitDoc = await db.collection('circuits').doc(selectedCircuitId).get()
      if (!circuitDoc.exists) {
        redirect(`/admin/ligas/${leagueId}?eventError=circuit-not-found`)
      }

      circuitId = circuitDoc.id
      circuitName = circuitDoc.data()?.name || ''
    } else {
      circuitName = String(formData.get('circuitName') || '').trim()
    }

    if (!circuitName) {
      redirect(`/admin/ligas/${leagueId}?eventError=circuit-required`)
    }

    await db.collection('league_events').add({
      league_id: leagueId,
      title,
      circuit_id: circuitId,
      circuit_name: circuitName,
      starts_at: startsAt,
      ends_at: endsAt,
      status: String(formData.get('status') || 'scheduled'),
      created_at: new Date(),
    })
  } catch (error) {
    console.error('Failed to create event in Firestore:', error)
    redirect(`/admin/ligas/${leagueId}?eventError=create-failed`)
  }

  revalidatePath('/admin')
  revalidatePath('/calendario')
  revalidatePath(`/admin/ligas/${leagueId}`)
  redirect(`/admin/ligas/${leagueId}?event=1`)
}

export async function updateEvent(formData: FormData) {
  const leagueId = String(formData.get('leagueId') || '')
  const eventId = String(formData.get('eventId') || '')
  await guardLeaguePermission(leagueId, 'manage')

  if (!hasFirebase) redirect('/admin?mode=mock')
  const db = getFirestoreDb()
  if (!db) redirect('/admin?mode=mock')

  const title = String(formData.get('title') || '').trim()
  const circuitName = String(formData.get('circuitName') || '').trim()
  const startsAt = String(formData.get('startsAt') || '').trim()
  const durationMinutes = Number(formData.get('durationMinutes') || 0)
  const endsAt = addMinutesToIso(startsAt, Number.isFinite(durationMinutes) ? durationMinutes : 0)
  const status = String(formData.get('status') || 'scheduled').trim()

  if (!eventId || !title || !circuitName || !startsAt || !endsAt || !Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    redirect(`/admin/ligas/${leagueId}?eventError=update-missing-fields`)
  }

  try {
    await db.collection('league_events').doc(eventId).update({
      title,
      circuit_name: circuitName,
      starts_at: startsAt,
      ends_at: endsAt,
      status,
      circuit_id: null,
    })
  } catch (error) {
    console.error('Failed to update event in Firestore:', error)
    redirect(`/admin/ligas/${leagueId}?eventError=update-failed`)
  }

  revalidatePath('/calendario')
  revalidatePath(`/admin/ligas/${leagueId}`)
  redirect(`/admin/ligas/${leagueId}?eventUpdated=1`)
}

export async function updateLeague(formData: FormData) {
  const leagueId = String(formData.get('leagueId') || '')
  await guardLeaguePermission(leagueId, 'manage')

  if (!hasFirebase) redirect('/admin?mode=mock')
  const db = getFirestoreDb()
  if (!db) redirect('/admin?mode=mock')

  const payload = {
    title: String(formData.get('title') || ''),
    slug: String(formData.get('slug') || ''),
    short_description: String(formData.get('shortDescription') || ''),
    full_description: String(formData.get('fullDescription') || ''),
    simulator: String(formData.get('simulator') || 'ac'),
    format: String(formData.get('format') || 'sprint'),
    status: String(formData.get('status') || 'draft'),
    banner_url: String(formData.get('bannerUrl') || ''),
    is_featured: formData.get('featured') === 'on',
    registration_open: formData.get('registrationOpen') === 'on',
    registration_mode: String(formData.get('registrationMode') || 'individual'),
    max_drivers: formData.get('maxDrivers') ? Number(formData.get('maxDrivers')) : null,
    class_tags: parseClassTags(formData),
  }

  try {
    await db.collection('leagues').doc(leagueId).update(payload)
  } catch (error) {
    console.error('Failed to update league in Firestore:', error)
    redirect(`/admin/ligas/${leagueId}?leagueError=update-failed`)
  }

  revalidatePath('/admin')
  revalidatePath('/ligas')
  revalidatePath(`/admin/ligas/${leagueId}`)
  redirect(`/admin/ligas/${leagueId}?leagueUpdated=1`)
}

export async function addLeagueCar(formData: FormData) {
  const leagueId = String(formData.get('leagueId') || '')
  await guardLeaguePermission(leagueId, 'manage')
  if (!hasFirebase) redirect('/admin?mode=mock')
  const db = getFirestoreDb()
  if (!db) redirect('/admin?mode=mock')

  const label = String(formData.get('label') || '').trim()
  const model = String(formData.get('model') || '').trim()
  const sortOrder = Number(formData.get('sortOrder') || 0)
  if (!leagueId || !label || !model) redirect(`/admin/ligas/${leagueId}?carError=missing-fields`)

  try {
    await db.collection('league_cars').add({
      league_id: leagueId,
      label,
      model,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      is_active: true,
      created_at: new Date(),
    })
  } catch (error) {
    console.error('Failed to add league car to Firestore:', error)
    redirect(`/admin/ligas/${leagueId}?carError=create-failed`)
  }

  revalidatePath(`/admin/ligas/${leagueId}`)
  revalidatePath(`/ligas`)
  redirect(`/admin/ligas/${leagueId}?car=1`)
}

export async function removeLeagueCar(formData: FormData) {
  const leagueId = String(formData.get('leagueId') || '')
  const carId = String(formData.get('carId') || '')
  await guardLeaguePermission(leagueId, 'manage')
  if (!hasFirebase) redirect('/admin?mode=mock')
  const db = getFirestoreDb()
  if (!db) redirect('/admin?mode=mock')
  if (!leagueId || !carId) redirect(`/admin/ligas/${leagueId}?carError=missing-fields`)

  try {
    const doc = await db.collection('league_cars').doc(carId).get()
    if (doc.exists && doc.data()?.league_id === leagueId) {
      await doc.ref.delete()
    }
  } catch (error) {
    console.error('Failed to delete league car in Firestore:', error)
  }

  revalidatePath(`/admin/ligas/${leagueId}`)
  revalidatePath(`/ligas`)
  redirect(`/admin/ligas/${leagueId}?carDeleted=1`)
}

export async function updateRegistrationStatus(formData: FormData) {
  const registrationId = String(formData.get('registrationId') || '')
  const status = String(formData.get('status') || 'pending')
  const leagueId = String(formData.get('leagueId') || '')

  await guardLeaguePermission(leagueId, 'steward')
  if (!hasFirebase) redirect('/admin?mode=mock')
  const db = getFirestoreDb()
  if (!db) redirect('/admin?mode=mock')

  try {
    await db.collection('league_registrations').doc(registrationId).update({ status })
  } catch (error) {
    // If registrationId is not a doc ID, query and update
    try {
      const snap = await db.collection('league_registrations').where('league_id', '==', leagueId).get()
      const doc = snap.docs.find((d: any) => d.id === registrationId || d.data().user_id === registrationId)
      if (doc) {
        await doc.ref.update({ status })
      }
    } catch (inner) {
      console.error(inner)
    }
  }

  revalidatePath('/admin')
  redirect(`/admin/ligas/${leagueId}?updated=1`)
}

export async function updateTeamRegistrationStatus(formData: FormData) {
  const leagueId = String(formData.get('leagueId') || '')
  const teamId = String(formData.get('teamId') || '')
  const classTagRaw = String(formData.get('classTag') || '')
  const classTag = classTagRaw === '__NULL__' ? null : classTagRaw
  const carNumberRaw = String(formData.get('carNumber') || '')
  const status = String(formData.get('status') || 'pending')

  await guardLeaguePermission(leagueId, 'steward')
  if (!hasFirebase) redirect('/admin?mode=mock')
  const db = getFirestoreDb()
  if (!db) redirect('/admin?mode=mock')
  if (!leagueId || !teamId || !carNumberRaw) redirect(`/admin/ligas/${leagueId}?updated=0`)

  const carNumber = Number(carNumberRaw)
  if (!Number.isInteger(carNumber)) redirect(`/admin/ligas/${leagueId}?updated=0`)

  try {
    let snapshot = await db
      .collection('league_registrations')
      .where('league_id', '==', leagueId)
      .where('team_id', '==', teamId)
      .where('assigned_number', '==', carNumber)
      .get()

    let docs = snapshot.docs
    if (classTag) {
      docs = docs.filter((d: any) => d.data().class_tag === classTag)
    } else {
      docs = docs.filter((d: any) => !d.data().class_tag)
    }

    const batch = db.batch()
    docs.forEach((doc: any) => batch.update(doc.ref, { status }))
    await batch.commit()

    let teamSnapshot = await db
      .collection('league_team_registrations')
      .where('league_id', '==', leagueId)
      .where('team_id', '==', teamId)
      .where('car_number', '==', carNumber)
      .get()

    let teamDocs = teamSnapshot.docs
    if (classTag) {
      teamDocs = teamDocs.filter((d: any) => d.data().class_tag === classTag)
    } else {
      teamDocs = teamDocs.filter((d: any) => !d.data().class_tag)
    }

    const teamBatch = db.batch()
    teamDocs.forEach((doc: any) => teamBatch.update(doc.ref, { status }))
    await teamBatch.commit()
  } catch (error) {
    console.error('Failed to update team registration status in Firestore:', error)
  }

  revalidatePath('/admin')
  revalidatePath(`/admin/ligas/${leagueId}`)
  redirect(`/admin/ligas/${leagueId}?updated=1`)
}

type ImportedResultRow = {
  userId?: string
  steamId?: string
  position: number
  points?: number | null
}

function normalizeIdentityToken(value: string) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const steamMatch = raw.match(/\d{17}/)
  if (steamMatch?.[0]) return steamMatch[0]
  const firstToken = raw
    .split(/[;,\s]+/)
    .map((item) => item.trim())
    .find(Boolean)
  return firstToken || raw
}

function extractGuidFromUnknown(row: Record<string, unknown>) {
  const direct = normalizeIdentityToken(
    String(
      row.userId ||
      row.user_id ||
      row.steamId ||
      row.steam_id ||
      row.guid ||
      row.DriverGuid ||
      row.driverGuid ||
      '',
    ).trim(),
  )
  if (direct) return direct
  const nestedDriver = row.Driver as { Guid?: unknown; GuidList?: unknown[]; GuidsList?: unknown[] } | undefined
  const nestedDriverLower = row.driver as { guid?: unknown; guidsList?: unknown[] } | undefined
  const nested = normalizeIdentityToken(
    String(nestedDriver?.Guid || nestedDriverLower?.guid || '').trim() ||
      String((nestedDriver?.GuidsList || nestedDriver?.GuidList || nestedDriverLower?.guidsList || [])[0] || '').trim(),
  )
  return nested || ''
}

function extractPositionFromUnknown(row: Record<string, unknown>, index: number) {
  const value = row.position ?? row.pos ?? row.Position ?? row.rank ?? row.place ?? index + 1
  const numeric = Number(value)
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null
}

function toImportedRow(item: unknown, index: number): ImportedResultRow | null {
  const row = (item || {}) as Record<string, unknown>
  const steamOrUser = extractGuidFromUnknown(row)
  const position = extractPositionFromUnknown(row, index)
  if (!steamOrUser || !position) return null
  const pointsRaw = row.points ?? row.Points ?? null
  const pointsNum = pointsRaw == null || pointsRaw === '' ? null : Number(pointsRaw)
  const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(steamOrUser)
  return looksLikeUuid
    ? {
        userId: steamOrUser,
        position,
        points: Number.isFinite(pointsNum as number) ? (pointsNum as number) : null,
      }
    : {
        steamId: steamOrUser,
        position,
        points: Number.isFinite(pointsNum as number) ? (pointsNum as number) : null,
      }
}

function pickBestArrayFromTree(root: unknown): unknown[] {
  const queue: Array<{ value: unknown; depth: number }> = [{ value: root, depth: 0 }]
  const seen = new Set<unknown>()
  let best: { score: number; rows: unknown[] } = { score: -1, rows: [] }

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) break
    const { value, depth } = current
    if (!value || typeof value !== 'object') continue
    if (seen.has(value)) continue
    seen.add(value)
    if (depth > 7) continue

    if (Array.isArray(value)) {
      const sample = value.slice(0, 12)
      let parsable = 0
      let hasResultShape = 0
      for (let i = 0; i < sample.length; i += 1) {
        const item = sample[i]
        const row = (item || {}) as Record<string, unknown>
        if (toImportedRow(item, i)) parsable += 1
        if (
          row.TotalTime != null ||
          row.NumLaps != null ||
          row.BestLap != null ||
          row.GridPosition != null ||
          row.DriverGuid != null
        ) {
          hasResultShape += 1
        }
      }
      const score = parsable * 3 + hasResultShape * 5 + Math.min(value.length, 200)
      if (score > best.score) best = { score, rows: value }

      for (const item of sample) {
        if (item && typeof item === 'object') queue.push({ value: item, depth: depth + 1 })
      }
      continue
    }

    for (const child of Object.values(value as Record<string, unknown>)) {
      if (child && typeof child === 'object') queue.push({ value: child, depth: depth + 1 })
    }
  }

  return best.rows
}

function parseResultsJson(raw: string): { eventId?: string; results: ImportedResultRow[] } {
  const parsed = JSON.parse(raw) as unknown
  const source = (parsed || {}) as {
    eventId?: unknown
    results?: unknown[]
    Result?: unknown[]
    result?: unknown[]
    Cars?: unknown[]
    cars?: unknown[]
    Sessions?: Array<{ Result?: unknown[]; results?: unknown[]; result?: unknown[] }>
    sessions?: Array<{ Result?: unknown[]; results?: unknown[]; result?: unknown[] }>
  }

  const eventId = source?.eventId ? String(source.eventId).trim() : undefined
  const sessions = (Array.isArray(source.Sessions) ? source.Sessions : Array.isArray(source.sessions) ? source.sessions : []) as Array<{
    Result?: unknown[]
    results?: unknown[]
    result?: unknown[]
  }>

  let rows: unknown[] = []
  if (Array.isArray(parsed)) {
    rows = parsed
  } else if (Array.isArray(source.results)) {
    rows = source.results
  } else if (Array.isArray(source.Result)) {
    rows = source.Result
  } else if (Array.isArray(source.result)) {
    rows = source.result
  } else {
    for (const session of sessions) {
      if (Array.isArray(session.results)) {
        rows = session.results
        break
      }
      if (Array.isArray(session.Result)) {
        rows = session.Result
        break
      }
      if (Array.isArray(session.result)) {
        rows = session.result
        break
      }
    }
  }

  if (rows.length === 0) {
    const cars = Array.isArray(source.Cars) ? source.Cars : Array.isArray(source.cars) ? source.cars : []
    rows = cars.flatMap((item, index) => {
      const row = item as { Driver?: { Guid?: unknown; GuidsList?: unknown[]; GuidList?: unknown[] }; DriverGuid?: unknown }
      const guids = Array.from(
        new Set(
          [
            String(row.DriverGuid || row.Driver?.Guid || '').trim(),
            ...((Array.isArray(row.Driver?.GuidsList) ? row.Driver?.GuidsList : Array.isArray(row.Driver?.GuidList) ? row.Driver?.GuidList : [])
              .map((value) => String(value || '').trim())),
          ].filter(Boolean),
        ),
      )
      if (guids.length === 0) return []
      return guids.map((guid) => ({
        DriverGuid: guid,
        position: index + 1,
      }))
    })
  }

  if (rows.length === 0) {
    rows = pickBestArrayFromTree(parsed)
  }

  const results: ImportedResultRow[] = rows
    .map((item, index) => toImportedRow(item, index))
    .filter((row): row is ImportedResultRow => Boolean(row))

  return { eventId, results }
}

export async function importRaceResultsJson(formData: FormData) {
  const leagueId = String(formData.get('leagueId') || '')
  const { session } = await guardLeaguePermission(leagueId, 'steward')

  if (!hasFirebase) redirect('/admin?mode=mock')
  const db = getFirestoreDb()
  if (!db) redirect('/admin?mode=mock')
  if (!leagueId) redirect('/admin?resultsError=missing-league')

  const uploadedRaw = formData.get('resultsFile')
  const uploaded =
    uploadedRaw &&
    typeof uploadedRaw === 'object' &&
    'size' in uploadedRaw &&
    'text' in uploadedRaw &&
    typeof (uploadedRaw as { size?: unknown }).size === 'number'
      ? (uploadedRaw as File)
      : null
  const rawFromTextField = String(formData.get('resultsJsonText') || '').trim()
  const selectedEventId = String(formData.get('eventId') || '').trim()
  const replaceExisting = formData.get('replaceExisting') === 'on'

  if ((!uploaded || uploaded.size === 0) && !rawFromTextField) {
    redirect(`/admin/ligas/${leagueId}?resultsError=file-required`)
  }

  let rawJson = ''
  let parsed: { eventId?: string; results: ImportedResultRow[] }
  try {
    rawJson = rawFromTextField || (uploaded ? await uploaded.text() : '')
    parsed = parseResultsJson(rawJson)
  } catch {
    redirect(`/admin/ligas/${leagueId}?resultsError=invalid-json`)
  }

  const eventId = selectedEventId || parsed.eventId || ''
  if (!eventId) {
    redirect(`/admin/ligas/${leagueId}?resultsError=event-required`)
  }

  try {
    const eventDoc = await db.collection('league_events').doc(eventId).get()
    if (!eventDoc.exists || eventDoc.data()?.league_id !== leagueId) {
      redirect(`/admin/ligas/${leagueId}?resultsError=event-not-found`)
    }

    if (parsed.results.length === 0) {
      redirect(`/admin/ligas/${leagueId}?resultsError=no-valid-rows`)
    }

    const steamIds = Array.from(new Set(parsed.results.map((row) => row.steamId).filter(Boolean))) as string[]
    const steamToUserId = new Map<string, string>()
    const userIdCandidates = Array.from(new Set(parsed.results.map((row) => row.userId).filter(Boolean))) as string[]
    const knownUserIds = new Set<string>()

    if (steamIds.length > 0) {
      // Chunk query steam_accounts
      const chunks = []
      for (let i = 0; i < steamIds.length; i += 10) {
        chunks.push(steamIds.slice(i, i + 10))
      }
      const snaps = await Promise.all(chunks.map(c => db.collection('steam_accounts').where('steam_id', 'in', c).get()))
      snaps.flatMap(s => s.docs).forEach((doc: any) => {
        steamToUserId.set(doc.data().steam_id, doc.data().user_id)
      })

      const regSnaps = await Promise.all(chunks.map(c => 
        db.collection('league_registrations')
          .where('league_id', '==', leagueId)
          .where('steam_id', 'in', c)
          .get()
      ))
      regSnaps.flatMap(s => s.docs).forEach((doc: any) => {
        if (!steamToUserId.has(doc.data().steam_id)) {
          steamToUserId.set(doc.data().steam_id, doc.data().user_id)
        }
      })
    }

    if (userIdCandidates.length > 0) {
      const chunks = []
      for (let i = 0; i < userIdCandidates.length; i += 10) {
        chunks.push(userIdCandidates.slice(i, i + 10))
      }
      const snaps = await Promise.all(chunks.map(c => db.collection('users').where('__name__', 'in', c).get()))
      snaps.flatMap(s => s.docs).forEach((doc: any) => {
        knownUserIds.add(doc.id)
      })
    }

    const resolved = parsed.results
      .map((row) => ({
        userId:
          (row.userId && knownUserIds.has(String(row.userId)) ? String(row.userId) : undefined) ||
          (row.steamId ? steamToUserId.get(row.steamId) : undefined),
        position: row.position,
        points: row.points ?? null,
      }))
      .filter((row) => Boolean(row.userId))

    const unresolvedCount = parsed.results.length - resolved.length
    if (resolved.length === 0) {
      await db.collection('league_result_imports').add({
        league_id: leagueId,
        event_id: eventId,
        uploaded_by_user_id: session.userId,
        file_name: (uploaded && uploaded.name) || 'results.json',
        payload_text: rawJson,
        rows_total: parsed.results.length,
        rows_imported: 0,
        rows_unresolved: unresolvedCount,
        rows_not_registered: 0,
        created_at: new Date(),
      })
      await db.collection('league_events').doc(eventId).update({ status: 'completed' })

      revalidatePath(`/admin/ligas/${leagueId}`)
      revalidatePath('/admin')
      revalidatePath('/ligas')
      revalidatePath('/equipos')
      const unresolvedFlag = unresolvedCount > 0 ? `&resultsUnresolved=${unresolvedCount}` : ''
      redirect(`/admin/ligas/${leagueId}?resultsImported=0${unresolvedFlag}`)
    }

    const resolvedUserIds = Array.from(new Set(resolved.map((row) => row.userId as string)))
    
    // Chunk query registrations
    const rChunks = []
    for (let i = 0; i < resolvedUserIds.length; i += 10) {
      rChunks.push(resolvedUserIds.slice(i, i + 10))
    }
    const regSnaps = await Promise.all(rChunks.map(c => 
      db.collection('league_registrations')
        .where('league_id', '==', leagueId)
        .where('user_id', 'in', c)
        .get()
    ))
    const registeredUserIds = new Set(regSnaps.flatMap(s => s.docs).map((doc: any) => doc.data().user_id))

    const filtered = resolved.filter((row) => registeredUserIds.has(String(row.userId)))
    const notRegisteredCount = resolved.length - filtered.length
    if (filtered.length === 0) {
      await db.collection('league_result_imports').add({
        league_id: leagueId,
        event_id: eventId,
        uploaded_by_user_id: session.userId,
        file_name: (uploaded && uploaded.name) || 'results.json',
        payload_text: rawJson,
        rows_total: parsed.results.length,
        rows_imported: 0,
        rows_unresolved: unresolvedCount,
        rows_not_registered: notRegisteredCount,
        created_at: new Date(),
      })
      await db.collection('league_events').doc(eventId).update({ status: 'completed' })

      revalidatePath(`/admin/ligas/${leagueId}`)
      revalidatePath('/admin')
      revalidatePath('/ligas')
      revalidatePath('/equipos')
      const unresolvedFlag = unresolvedCount > 0 ? `&resultsUnresolved=${unresolvedCount}` : ''
      const notRegisteredFlag = notRegisteredCount > 0 ? `&resultsNotRegistered=${notRegisteredCount}` : ''
      redirect(`/admin/ligas/${leagueId}?resultsImported=0${unresolvedFlag}${notRegisteredFlag}`)
    }

    if (replaceExisting) {
      const existingResultsSnap = await db
        .collection('league_results')
        .where('league_id', '==', leagueId)
        .where('event_id', '==', eventId)
        .get()
      const delBatch = db.batch()
      existingResultsSnap.docs.forEach((doc: any) => delBatch.delete(doc.ref))
      await delBatch.commit()
    }

    const payload = filtered.map((row) => ({
      league_id: leagueId,
      event_id: eventId,
      user_id: row.userId as string,
      position: row.position,
      points: row.points,
      created_at: new Date(),
    }))

    const insertBatch = db.batch()
    payload.forEach((row) => {
      const docRef = db.collection('league_results').doc()
      insertBatch.set(docRef, row)
    })
    await insertBatch.commit()

    await db.collection('league_events').doc(eventId).update({ status: 'completed' })

    await db.collection('league_result_imports').add({
      league_id: leagueId,
      event_id: eventId,
      uploaded_by_user_id: session.userId,
      file_name: (uploaded && uploaded.name) || 'results.json',
      payload_text: rawJson,
      rows_total: parsed.results.length,
      rows_imported: filtered.length,
      rows_unresolved: unresolvedCount,
      rows_not_registered: notRegisteredCount,
      created_at: new Date(),
    })

    revalidatePath(`/admin/ligas/${leagueId}`)
    revalidatePath('/admin')
    revalidatePath('/ligas')
    revalidatePath('/equipos')
    const unresolvedFlag = unresolvedCount > 0 ? `&resultsUnresolved=${unresolvedCount}` : ''
    const notRegisteredFlag = notRegisteredCount > 0 ? `&resultsNotRegistered=${notRegisteredCount}` : ''
    redirect(`/admin/ligas/${leagueId}?resultsImported=${filtered.length}${unresolvedFlag}${notRegisteredFlag}`)
  } catch (error) {
    console.error('Failed to import race results in Firestore:', error)
    redirect(`/admin/ligas/${leagueId}?resultsError=insert-failed`)
  }
}

function normalizeLeagueRole(rawRole: string): LeagueRole {
  const safeRole = rawRole as LeagueRole
  const allowedRoles: LeagueRole[] = ['league_owner', 'league_admin', 'steward', 'team_manager', 'driver']
  return allowedRoles.includes(safeRole) ? safeRole : 'driver'
}

export async function assignLeagueRole(formData: FormData) {
  const leagueId = String(formData.get('leagueId') || '')
  const steamId = String(formData.get('steamId') || '').trim()
  const role = normalizeLeagueRole(String(formData.get('role') || 'driver'))

  if (!steamId) redirect(`/admin/ligas/${leagueId}/miembros?error=user-not-found`)

  const { session, platformRole, leagueRole } = await guardLeaguePermission(leagueId, 'manage')
  if (!hasFirebase) redirect('/admin?mode=mock')
  const db = getFirestoreDb()
  if (!db) redirect('/admin?mode=mock')

  const actorCanAssignOwner = canAccessPlatformAdmin(platformRole) || leagueRole === 'league_owner'
  if (role === 'league_owner' && !actorCanAssignOwner) redirect(`/admin/ligas/${leagueId}/miembros?error=forbidden`)

  try {
    const steamSnapshot = await db.collection('steam_accounts').where('steam_id', '==', steamId).limit(1).get()
    if (steamSnapshot.empty) redirect(`/admin/ligas/${leagueId}/miembros?error=user-not-found`)

    const targetUserId = steamSnapshot.docs[0].data().user_id
    if (!targetUserId) redirect(`/admin/ligas/${leagueId}/miembros?error=user-not-found`)

    if (role === 'league_owner' && targetUserId === session.userId && !canAccessPlatformAdmin(platformRole)) {
      redirect(`/admin/ligas/${leagueId}/miembros?error=owner-self`)
    }

    await db.collection('league_members').doc(`${leagueId}_${targetUserId}`).set({
      league_id: leagueId,
      user_id: targetUserId,
      role,
      created_at: new Date(),
    }, { merge: true })
  } catch (error) {
    console.error('Failed to assign league role in Firestore:', error)
    redirect(`/admin/ligas/${leagueId}/miembros?error=user-not-found`)
  }

  revalidatePath(`/admin/ligas/${leagueId}/miembros`)
  redirect(`/admin/ligas/${leagueId}/miembros?updated=1`)
}

export async function adminDeleteMarketListing(listingId: string) {
  await guardPlatformAdmin()

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        await db.collection('market_listings').doc(listingId).delete()
      } catch (error) {
        console.error('Failed to delete market listing from Firestore:', error)
      }
    }
  } else {
    // Mock Mode Fallback
    try {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const existing = cookieStore.get('mock_market_listings')?.value
      if (existing) {
        let current = JSON.parse(existing)
        if (Array.isArray(current)) {
          current = current.filter((item: any) => item.id !== listingId)
          cookieStore.set('mock_market_listings', JSON.stringify(current), { path: '/', maxAge: 60 * 60 * 24 * 30 })
        }
      }
    } catch (e) {
      console.error('Failed to delete mock listing:', e)
    }
  }

  revalidatePath('/admin')
  revalidatePath('/market')
  redirect('/admin?deleted_listing=1')
}

export async function quickUpdateLeagueStatusAction(formData: FormData) {
  const session = await guardPlatformAdmin()
  const leagueId = String(formData.get('leagueId') || '')
  const status = String(formData.get('status') || 'draft')

  if (!leagueId) redirect('/admin?error=missing-fields')

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        await db.collection('leagues').doc(leagueId).update({ status })
      } catch (error) {
        console.error('Failed to update status in Firestore:', error)
      }
    }
  } else {
    // Mock Mode
    try {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const existing = cookieStore.get('mock_leagues')?.value
      let current = existing ? JSON.parse(existing) : []
      current = current.map((l: any) => l.id === leagueId ? { ...l, status } : l)
      cookieStore.set('mock_leagues', JSON.stringify(current), { path: '/', maxAge: 60 * 60 * 24 * 30 })
    } catch {}
  }

  revalidatePath('/admin')
  revalidatePath('/ligas')
  revalidatePath(`/admin/ligas/${leagueId}`)
  redirect('/admin?tab=leagues&updated=1')
}

export async function quickToggleLeagueRegistrationAction(formData: FormData) {
  const session = await guardPlatformAdmin()
  const leagueId = String(formData.get('leagueId') || '')

  if (!leagueId) redirect('/admin?error=missing-fields')

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        const docRef = db.collection('leagues').doc(leagueId)
        const doc = await docRef.get()
        if (doc.exists) {
          const current = Boolean(doc.data()?.registration_open)
          await docRef.update({ registration_open: !current })
        }
      } catch (error) {
        console.error('Failed to toggle registration in Firestore:', error)
      }
    }
  } else {
    // Mock Mode
    try {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const existing = cookieStore.get('mock_leagues')?.value
      let current = existing ? JSON.parse(existing) : []
      current = current.map((l: any) => l.id === leagueId ? { ...l, registrationOpen: !l.registrationOpen } : l)
      cookieStore.set('mock_leagues', JSON.stringify(current), { path: '/', maxAge: 60 * 60 * 24 * 30 })
    } catch {}
  }

  revalidatePath('/admin')
  revalidatePath('/ligas')
  revalidatePath(`/admin/ligas/${leagueId}`)
  redirect('/admin?tab=leagues&updated=1')
}

export async function quickToggleLeagueFeaturedAction(formData: FormData) {
  const session = await guardPlatformAdmin()
  const leagueId = String(formData.get('leagueId') || '')

  if (!leagueId) redirect('/admin?error=missing-fields')

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        const docRef = db.collection('leagues').doc(leagueId)
        const doc = await docRef.get()
        if (doc.exists) {
          const current = Boolean(doc.data()?.is_featured)
          await docRef.update({ is_featured: !current })
        }
      } catch (error) {
        console.error('Failed to toggle featured in Firestore:', error)
      }
    }
  } else {
    // Mock Mode
    try {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const existing = cookieStore.get('mock_leagues')?.value
      let current = existing ? JSON.parse(existing) : []
      current = current.map((l: any) => l.id === leagueId ? { ...l, featured: !l.featured } : l)
      cookieStore.set('mock_leagues', JSON.stringify(current), { path: '/', maxAge: 60 * 60 * 24 * 30 })
    } catch {}
  }

  revalidatePath('/admin')
  revalidatePath('/ligas')
  revalidatePath(`/admin/ligas/${leagueId}`)
  redirect('/admin?tab=leagues&updated=1')
}

export async function quickUpdateLeagueMaxDriversAction(formData: FormData) {
  const session = await guardPlatformAdmin()
  const leagueId = String(formData.get('leagueId') || '')
  const maxDriversRaw = formData.get('maxDrivers')
  const maxDrivers = maxDriversRaw ? Number(maxDriversRaw) : null

  if (!leagueId) redirect('/admin?error=missing-fields')

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        await db.collection('leagues').doc(leagueId).update({ max_drivers: maxDrivers })
      } catch (error) {
        console.error('Failed to update max drivers in Firestore:', error)
      }
    }
  } else {
    // Mock Mode
    try {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const existing = cookieStore.get('mock_leagues')?.value
      let current = existing ? JSON.parse(existing) : []
      current = current.map((l: any) => l.id === leagueId ? { ...l, maxDrivers } : l)
      cookieStore.set('mock_leagues', JSON.stringify(current), { path: '/', maxAge: 60 * 60 * 24 * 30 })
    } catch {}
  }

  revalidatePath('/admin')
  revalidatePath('/ligas')
  revalidatePath(`/admin/ligas/${leagueId}`)
  redirect('/admin?tab=leagues&updated=1')
}

export async function deleteLeagueAction(formData: FormData) {
  const session = await guardPlatformAdmin()
  const leagueId = String(formData.get('leagueId') || '')

  if (!leagueId) redirect('/admin?error=missing-fields')

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        const batch = db.batch()

        // 1. Delete league members
        const membersSnap = await db.collection('league_members').where('league_id', '==', leagueId).get()
        membersSnap.docs.forEach((doc: any) => batch.delete(doc.ref))

        // 2. Delete league events
        const eventsSnap = await db.collection('league_events').where('league_id', '==', leagueId).get()
        eventsSnap.docs.forEach((doc: any) => batch.delete(doc.ref))

        // 3. Delete registrations
        const registrationsSnap = await db.collection('league_registrations').where('league_id', '==', leagueId).get()
        registrationsSnap.docs.forEach((doc: any) => batch.delete(doc.ref))

        // 4. Delete team registrations if any exist
        const teamRegsSnap = await db.collection('league_team_registrations').where('league_id', '==', leagueId).get()
        teamRegsSnap.docs.forEach((doc: any) => batch.delete(doc.ref))

        // 5. Delete results
        const resultsSnap = await db.collection('league_results').where('league_id', '==', leagueId).get()
        resultsSnap.docs.forEach((doc: any) => batch.delete(doc.ref))

        // 6. Delete result imports
        const importsSnap = await db.collection('league_result_imports').where('league_id', '==', leagueId).get()
        importsSnap.docs.forEach((doc: any) => batch.delete(doc.ref))

        // 7. Delete cars
        const carsSnap = await db.collection('league_cars').where('league_id', '==', leagueId).get()
        carsSnap.docs.forEach((doc: any) => batch.delete(doc.ref))

        // 8. Delete league itself
        batch.delete(db.collection('leagues').doc(leagueId))

        await batch.commit()
      } catch (error) {
        console.error('Failed to delete league in Firestore:', error)
      }
    }
  }

  // ALWAYS filter and update the mock_leagues cookie so that the league is removed even if we combine with mock fallback
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const existing = cookieStore.get('mock_leagues')?.value
    
    let current = []
    if (existing) {
      current = JSON.parse(existing)
    } else {
      const { leagues: defaultLeagues } = await import('@/data/mock')
      current = [...defaultLeagues]
    }

    current = current.filter((l: any) => l.id !== leagueId)
    cookieStore.set('mock_leagues', JSON.stringify(current), { path: '/', maxAge: 60 * 60 * 24 * 30 })
  } catch (e) {
    console.error('Failed to update mock_leagues cookie on admin deletion:', e)
  }

  revalidatePath('/admin')
  revalidatePath('/ligas')
  redirect('/admin?tab=leagues&updated=1')
}

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
