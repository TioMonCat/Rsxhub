'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getCurrentUser, getAdminAccessContext } from '@/lib/auth'
import { getFirestoreDb, hasFirebase, runWithTimeout } from '@/lib/firebase'
import { getTeamsDashboard } from '@/lib/team-data'
import { createNotification } from '@/lib/notifications-data'

function parseSkinUrls(value: FormDataEntryValue | null) {
  return String(value || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12)
}

function parseSkinAssignments(value: FormDataEntryValue | null) {
  return String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [leagueSlugRaw, carNumberRaw, ...skinParts] = line.split('|')
      const leagueSlug = String(leagueSlugRaw || '').trim().toLowerCase()
      const carNumber = Number(String(carNumberRaw || '').trim())
      const skinUrl = skinParts.join('|').trim()
      if (!leagueSlug || !Number.isInteger(carNumber) || carNumber < 0 || carNumber > 999 || !skinUrl) return null
      return { leagueSlug, carNumber, skinUrl }
    })
    .filter((item): item is { leagueSlug: string; carNumber: number; skinUrl: string } => Boolean(item))
    .slice(0, 64)
}

function parseSkinProfilesJson(value: FormDataEntryValue | null) {
  const raw = String(value || '').trim()
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const normalized = parsed
      .map((item) => {
        const row = item as { skinUrl?: unknown; leagueSlug?: unknown; carNumber?: unknown; label?: unknown }
        const skinUrl = String(row.skinUrl || '').trim()
        const leagueSlug = String(row.leagueSlug || '').trim().toLowerCase()
        const carNumber = String(row.carNumber || row.label || '').trim()
        if (!skinUrl) return null
        return { leagueSlug, skinUrl, carNumber }
      })
      .filter((item): item is { leagueSlug: string; skinUrl: string; carNumber: string } => Boolean(item))
      .slice(0, 64)
    return normalized
  } catch {
    return []
  }
}

async function guardSession() {
  const session = await getCurrentUser()
  if (!session) redirect('/perfil')
  return session
}

async function canManageTeam(teamId: string, userId: string) {
  // Always check platform admin bypass
  try {
    const { getAdminAccessContext } = await import('@/lib/auth')
    const access = await getAdminAccessContext(userId)
    if (access.canAccessPlatformAdmin) return true
  } catch {}

  let foundInFirestore = false
  let allowedInFirestore = false

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        const teamDoc = await runWithTimeout(db.collection('teams').doc(teamId).get(), 3000)
        if (teamDoc.exists) {
          foundInFirestore = true
          const team = teamDoc.data()
          if (team?.owner_user_id === userId) {
            allowedInFirestore = true
          } else {
            const memberDoc = await runWithTimeout(db.collection('team_members').doc(`${teamId}_${userId}`).get(), 3000)
            if (memberDoc.exists) {
              const member = memberDoc.data()
              if (member?.role === 'owner' || member?.role === 'manager') {
                allowedInFirestore = true
              }
            }
          }
        }
      } catch (err) {
        console.error('Error checking canManageTeam in Firestore:', err)
      }
    }
  }

  if (foundInFirestore) {
    return allowedInFirestore
  }

  // Fallback: check Mock Mode in cookies
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const existing = cookieStore.get('mock_teams')?.value
    if (existing) {
      const current = JSON.parse(existing)
      const mockTeam = current.find((t: any) => t.id === teamId)
      if (mockTeam) {
        if (mockTeam.ownerUserId === userId) return true
        if (Array.isArray(mockTeam.members)) {
          const m = mockTeam.members.find((member: any) => member.userId === userId)
          if (m && (m.role === 'owner' || m.role === 'manager')) return true
        }
      }
    }
  } catch (e) {
    console.error('Error checking canManageTeam in mock cookies:', e)
  }

  return false
}

function cleanPilotName(carNumber: string): string {
  const parts = carNumber.split('-');
  if (parts.length > 1) {
    return parts[parts.length - 1].trim();
  }
  return carNumber.trim();
}

export async function createTeam(formData: FormData) {
  const session = await guardSession()

  // Verify they don't belong to any team
  const { teams } = await getTeamsDashboard(session.userId)
  const isAlreadyInTeam = teams.some((team: any) =>
    team.ownerUserId === session.userId ||
    (Array.isArray(team.members) && team.members.some((m: any) => m.userId === session.userId))
  )
  if (isAlreadyInTeam) {
    redirect('/equipos?error=already-in-a-team')
  }

  const name = String(formData.get('name') || '').trim()
  const description = String(formData.get('description') || '').trim()
  const logoUrl = String(formData.get('logoUrl') || '').trim()
  const classTagsRaw = formData.getAll('classTags').flatMap(val => String(val).split(',')).map(t => t.trim().toUpperCase()).filter(Boolean)
  const classTags = Array.from(new Set(classTagsRaw))
  const skinProfilesJson = String(formData.get('skinProfilesJson') || '').trim()
  const skinProfiles = parseSkinProfilesJson(skinProfilesJson)

  const accentColor = String(formData.get('accentColor') || '#3b82f6').trim()
  const slogan = String(formData.get('slogan') || '').trim()
  const discordUrl = String(formData.get('discordUrl') || '').trim()
  const youtubeUrl = String(formData.get('youtubeUrl') || '').trim()

  if (!name) redirect('/equipos?error=name-required')

  let createdViaFirestore = false
  let redirectUrl: string | null = null

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        const featuredSkin = skinProfiles[0]?.skinUrl || ''
        const mergedSkinUrls = Array.from(
          new Set([featuredSkin, ...skinProfiles.map((item) => item.skinUrl)].filter(Boolean)),
        ).slice(0, 12)

        const payload = {
          league_id: null,
          name,
          description: description || null,
          logo_url: logoUrl || null,
          class_tags: classTags,
          owner_user_id: session.userId,
          car_skin_urls: mergedSkinUrls,
          skin_assignments: skinProfiles,
          created_at: new Date(),
          accent_color: accentColor,
          slogan: slogan || null,
          discord_url: discordUrl || null,
          youtube_url: youtubeUrl || null,
        }

        const docRef = await runWithTimeout(db.collection('teams').add(payload))
        const teamId = docRef.id

        const dbWrites: Promise<any>[] = []

        // Resolve details for the owner
        let ownerDisplayName = session.steamDisplayName || 'Team Leader'
        let ownerAvatarUrl = session.avatarUrl || null
        let ownerSteamId = session.userId.replace('steam_', '')

        try {
          const { cookies } = await import('next/headers')
          const cookieStore = await cookies()
          const mockProfileStr = cookieStore.get(`mock_profile_${session.userId}`)?.value || cookieStore.get('mock_profile')?.value
          if (mockProfileStr) {
            const parsed = JSON.parse(mockProfileStr)
            ownerDisplayName = parsed.display_name || parsed.displayName || ownerDisplayName
            ownerAvatarUrl = parsed.avatar_url || parsed.avatarUrl || ownerAvatarUrl
            if (parsed.steam_id) ownerSteamId = parsed.steam_id
          }
        } catch {}

        // Add owner member set
        const ownerMemberRef = db.collection('team_members').doc(`${teamId}_${session.userId}`)
        dbWrites.push(ownerMemberRef.set({
          team_id: teamId,
          user_id: session.userId,
          role: 'owner',
          display_name: ownerDisplayName,
          steam_id: ownerSteamId,
          avatar_url: ownerAvatarUrl,
          created_at: new Date(),
        }))

        // Prepare writes for each pilot in skinProfiles
        for (const profile of skinProfiles) {
          const pilotName = cleanPilotName(profile.carNumber);
          if (pilotName && pilotName.toLowerCase() !== 'vacant') {
            const pilotUserId = `pilot_${pilotName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
            const dummySteamId = `7656119${Math.floor(Math.random() * 9000000000 + 1000000000)}`
            const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(pilotName)}`

            const pmRef = db.collection('team_members').doc(`${teamId}_${pilotUserId}`)
            dbWrites.push(pmRef.set({
              team_id: teamId,
              user_id: pilotUserId,
              role: 'driver',
              display_name: pilotName,
              steam_id: dummySteamId,
              avatar_url: avatarUrl,
              created_at: new Date(),
            }))

            const profRef = db.collection('profiles').doc(pilotUserId)
            dbWrites.push(profRef.set({
              user_id: pilotUserId,
              display_name: pilotName,
              created_at: new Date(),
            }))

            const steamRef = db.collection('steam_accounts').doc(pilotUserId)
            dbWrites.push(steamRef.set({
              user_id: pilotUserId,
              steam_id: dummySteamId,
              steam_display_name: pilotName,
              created_at: new Date(),
            }))
          }
        }

        // Run all DB writes in parallel with a safe timeout!
        await runWithTimeout(Promise.all(dbWrites), 4000)

        // Also update mock_role cookie for local simulator alignment
        try {
          const { cookies } = await import('next/headers')
          const cookieStore = await cookies()
          cookieStore.set('mock_role', 'leader', { path: '/', maxAge: 60 * 60 * 24 * 30 })
        } catch {}

        createdViaFirestore = true
        redirectUrl = '/equipos?created=1'
      } catch (error) {
        console.error('Failed to create team in Firestore (falling back to mock):', error)
      }
    }
  }

  if (redirectUrl) {
    revalidatePath('/equipos')
    redirect(redirectUrl)
  }

  if (!createdViaFirestore) {
    // Mock Mode Fallback
    try {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const existing = cookieStore.get('mock_teams')?.value
      const current: any[] = existing ? JSON.parse(existing) : []
      
      // Get current user profile or steam details to populate the owner member correctly!
      let ownerDisplayName = 'Team Leader'
      let ownerAvatarUrl: string | null = null
      let ownerSteamId = session.userId.replace('steam_', '')
      try {
        const mockProfileStr = cookieStore.get(`mock_profile_${session.userId}`)?.value || cookieStore.get('mock_profile')?.value
        if (mockProfileStr) {
          const parsed = JSON.parse(mockProfileStr)
          ownerDisplayName = parsed.display_name || parsed.displayName || ownerDisplayName
          ownerAvatarUrl = parsed.avatar_url || parsed.avatarUrl || null
          if (parsed.steam_id) ownerSteamId = parsed.steam_id
        }
      } catch {}
      if (ownerDisplayName === 'Team Leader') {
        ownerDisplayName = session.steamDisplayName || 'Team Leader'
        ownerAvatarUrl = session.avatarUrl || null
      }

      const teamId = `mock_team_${Date.now()}`
      const newTeamMembers = [
        {
          id: `member_${teamId}_owner`,
          teamId,
          userId: session.userId,
          role: 'owner',
          createdAt: new Date().toISOString(),
          displayName: ownerDisplayName,
          avatarUrl: ownerAvatarUrl,
          steamId: ownerSteamId,
        }
      ]

      for (const profile of skinProfiles) {
        const pilotName = cleanPilotName(profile.carNumber);
        if (pilotName && pilotName.toLowerCase() !== 'vacant') {
          const pilotUserId = `pilot_${pilotName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
          if (!newTeamMembers.some((m) => m.userId === pilotUserId)) {
            const dummySteamId = `7656119${Math.floor(Math.random() * 9000000000 + 1000000000)}`
            newTeamMembers.push({
              id: `member_${teamId}_${pilotUserId}`,
              teamId,
              userId: pilotUserId,
              role: 'driver',
              createdAt: new Date().toISOString(),
              displayName: pilotName,
              avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(pilotName)}`,
              steamId: dummySteamId,
            } as any)
          }
        }
      }

      if (logoUrl) {
        cookieStore.set(`mock_team_logo_${teamId}`, logoUrl, { path: '/', maxAge: 60 * 60 * 24 * 30 })
      }

      const newTeam = {
        id: teamId,
        name,
        description: description || null,
        logoUrl: null, // Keep main cookie tiny
        classTags,
        skinAssignments: skinProfiles,
        carSkinUrls: skinProfiles.map((s) => s.skinUrl),
        ownerUserId: session.userId,
        createdAt: new Date().toISOString(),
        members: newTeamMembers,
        accentColor,
        slogan: slogan || null,
        discordUrl: discordUrl || null,
        youtubeUrl: youtubeUrl || null,
      }
      current.push(newTeam)
      cookieStore.set('mock_teams', JSON.stringify(current), { path: '/', maxAge: 60 * 60 * 24 * 30 })
      cookieStore.set('mock_role', 'leader', { path: '/', maxAge: 60 * 60 * 24 * 30 })
      redirectUrl = '/equipos?created=1'
    } catch (e) {
      console.error('Failed to create mock team:', e)
    }
  }

  revalidatePath('/equipos')
  if (redirectUrl) {
    redirect(redirectUrl)
  } else {
    redirect('/equipos')
  }
}

function parseCarNumber(dorsal: any): number {
  if (dorsal == null) return 0
  const str = String(dorsal).replace(/[^0-9]/g, '')
  const num = parseInt(str, 10)
  return isNaN(num) ? 0 : num
}

export async function updateTeam(formData: FormData) {
  const session = await guardSession()

  const redirectTo = String(formData.get('redirectTo') || '/equipos')
  const teamId = String(formData.get('teamId') || '')
  if (!teamId) redirect(`${redirectTo}?error=team-required`)

  const allowed = await canManageTeam(teamId, session.userId)
  if (!allowed) redirect(`${redirectTo}?error=forbidden`)

  let existingTeam: any = null
  let firebaseFetched = false
  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        const doc = await runWithTimeout(db.collection('teams').doc(teamId).get())
        if (doc.exists) {
          existingTeam = doc.data()
          firebaseFetched = true
        }
      } catch (err) {
        console.error('Failed to fetch team from Firestore (falling back to mock):', err)
      }
    }
  }

  if (!firebaseFetched) {
    try {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const existing = cookieStore.get('mock_teams')?.value
      const current = existing ? JSON.parse(existing) : []
      existingTeam = current.find((t: any) => t.id === teamId)
    } catch {}
  }

  const name = formData.has('name') ? String(formData.get('name') || '').trim() : (existingTeam?.name || '')
  const description = formData.has('description') ? String(formData.get('description') || '').trim() : (existingTeam?.description || existingTeam?.description_short || '')
  const logoUrl = formData.has('logoUrl') ? String(formData.get('logoUrl') || '').trim() : (existingTeam?.logoUrl || existingTeam?.logo_url || '')
  
  let classTags = existingTeam?.classTags || existingTeam?.class_tags || []
  if (formData.has('classTags')) {
    const classTagsRaw = formData.getAll('classTags').flatMap(val => String(val).split(',')).map(t => t.trim().toUpperCase()).filter(Boolean)
    classTags = Array.from(new Set(classTagsRaw))
  }

  const teamCarsJson = String(formData.get('teamCarsJson') || '').trim()
  let teamCars = existingTeam?.cars || []
  if (formData.has('teamCarsJson')) {
    try {
      const rawCars = JSON.parse(teamCarsJson)
      if (Array.isArray(rawCars)) {
        teamCars = rawCars
          .map((car: any) => ({
            ...car,
            dorsal: String(car.dorsal || '').replace(/[^0-9]/g, '').slice(0, 3),
            driverUserIds: (car.driverUserIds || car.driver_user_ids || []).filter(Boolean),
          }))
          .filter((car: any) => car.driverUserIds.length > 0)

        // Validate internal uniqueness of dorsals
        const dorsalsSeen = new Set<string>()
        for (const car of teamCars) {
          const d = String(car.dorsal || '').trim()
          if (d) {
            if (dorsalsSeen.has(d)) {
              redirect(`${redirectTo}?error=dorsal-duplicate`)
            }
            dorsalsSeen.add(d)
          }
        }
      }
    } catch (e: any) {
      if (e?.digest?.startsWith('NEXT_REDIRECT')) throw e
    }
  }

  const accentColor = formData.has('accentColor') ? String(formData.get('accentColor') || '').trim() : (existingTeam?.accentColor || existingTeam?.accent_color || '#3b82f6')
  const slogan = formData.has('slogan') ? String(formData.get('slogan') || '').trim() : (existingTeam?.slogan || null)
  const discordUrl = formData.has('discordUrl') ? String(formData.get('discordUrl') || '').trim() : (existingTeam?.discordUrl || existingTeam?.discord_url || null)
  const youtubeUrl = formData.has('youtubeUrl') ? String(formData.get('youtubeUrl') || '').trim() : (existingTeam?.youtubeUrl || existingTeam?.youtube_url || null)

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        await runWithTimeout(db.collection('teams').doc(teamId).update({
          name,
          description: description || null,
          logo_url: logoUrl || null,
          class_tags: classTags,
          cars: teamCars,
          accent_color: accentColor,
          slogan: slogan || null,
          discord_url: discordUrl || null,
          youtube_url: youtubeUrl || null,
        }))

        // Auto Sync: Find all unique league_id where this team is registered and update registrations
        try {
          const regSnap = await db.collection('league_registrations').where('team_id', '==', teamId).get()
          const leagueIds = Array.from(new Set(regSnap.docs.map((doc: any) => doc.data()?.league_id).filter(Boolean))) as string[]

          if (leagueIds.length > 0) {
            for (const leagueId of leagueIds) {
              const leagueDoc = await db.collection('leagues').doc(leagueId).get()
              if (leagueDoc.exists) {
                const leagueClassTags = leagueDoc.data()?.class_tags || leagueDoc.data()?.classTags || []
                
                // Filter updated cars matching this league's classTags
                const matchingCars = teamCars.filter((car: any) => {
                  if (!car.category) return false
                  const c1 = car.category.toUpperCase()
                  return leagueClassTags.some((tag: any) => {
                    const c2 = tag.toUpperCase()
                    return c1 === c2 || (c1.startsWith('LMP') && c2.startsWith('LMP'))
                  })
                })

                // Get other team registrations to prevent number/dorsal collisions
                const otherRegsSnap = await db.collection('league_registrations').where('league_id', '==', leagueId).get()
                const otherRegs = otherRegsSnap.docs
                  .map((d: any) => d.data())
                  .filter((r: any) => r.team_id !== teamId)

                const registrationsInThisLeague: any[] = []

                for (const car of matchingCars) {
                  const carClassTag = String(car.category || '').toUpperCase()
                  const carNum = parseCarNumber(car.dorsal)

                  let regCarNumber = carNum
                  if (regCarNumber <= 0) {
                    for (let num = 12; num <= 99; num++) {
                      const taken = otherRegs.some(
                        (r: any) => r.class_tag === carClassTag && Number(r.assigned_number) === num && r.status !== 'rejected'
                      )
                      if (!taken) {
                        regCarNumber = num
                        break
                      }
                    }
                  } else {
                    const isTaken = otherRegs.some(
                      (r: any) => r.class_tag === carClassTag && Number(r.assigned_number) === regCarNumber && r.status !== 'rejected'
                    )
                    if (isTaken) {
                      for (let num = 12; num <= 99; num++) {
                        const taken = otherRegs.some(
                          (r: any) => r.class_tag === carClassTag && Number(r.assigned_number) === num && r.status !== 'rejected'
                        )
                        if (!taken) {
                          regCarNumber = num
                          break
                        }
                      }
                    }
                  }

                  let carDrivers = Array.isArray(car.driverUserIds) ? car.driverUserIds.filter(Boolean).map(String) : []
                  if (carDrivers.length === 0) {
                    carDrivers = [session.userId]
                  }

                  for (const userId of carDrivers) {
                    let displayName = `Pilot ${userId.slice(0, 4)}`
                    try {
                      const profileDoc = await db.collection('profiles').doc(userId).get()
                      if (profileDoc.exists) {
                        displayName = profileDoc.data()?.display_name || displayName
                      } else {
                        const steamDoc = await db.collection('steam_accounts').doc(userId).get()
                        if (steamDoc.exists) {
                          displayName = steamDoc.data()?.steam_display_name || displayName
                        }
                      }
                    } catch (e) {
                      console.error('Failed to resolve display name:', e)
                    }

                    registrationsInThisLeague.push({
                      league_id: leagueId,
                      user_id: userId,
                      team_id: teamId,
                      display_name: displayName,
                      status: 'approved',
                      class_tag: carClassTag,
                      assigned_number: regCarNumber,
                      created_at: new Date().toISOString()
                    })
                  }
                }

                // Apply changes in a batch
                const existingRegsSnap = await db.collection('league_registrations')
                  .where('league_id', '==', leagueId)
                  .where('team_id', '==', teamId)
                  .get()

                const batch = db.batch()
                existingRegsSnap.docs.forEach((doc: any) => {
                  batch.delete(doc.ref)
                })

                for (const newReg of registrationsInThisLeague) {
                  const docId = `${leagueId}_${newReg.class_tag}_${newReg.user_id}_${newReg.assigned_number}`
                  const docRef = db.collection('league_registrations').doc(docId)
                  batch.set(docRef, newReg, { merge: true })
                }

                await batch.commit()
              }
            }
          }
        } catch (err) {
          console.error('Failed auto-syncing league registrations on team update (Firestore):', err)
        }

        revalidatePath('/equipos')
        revalidatePath(`/equipos/${teamId}`)
        redirect(`${redirectTo}?updated=1`)
      } catch (error) {
        console.error('Failed to update team in Firestore (falling back to mock):', error)
      }
    }
  }

  // Fallback to Mock Mode
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const existing = cookieStore.get('mock_teams')?.value
    let current: any[] = existing ? JSON.parse(existing) : []
    current = current.map((t) => {
      if (t.id === teamId) {
        if (logoUrl) {
          cookieStore.set(`mock_team_logo_${teamId}`, logoUrl, { path: '/', maxAge: 60 * 60 * 24 * 30 })
        }
        return {
          ...t,
          name,
          description: description || null,
          logoUrl: null, // Keep main cookie tiny
          classTags,
          cars: teamCars,
          accentColor,
          slogan: slogan || null,
          discordUrl: discordUrl || null,
          youtubeUrl: youtubeUrl || null,
        }
      }
      return t
    })
    cookieStore.set('mock_teams', JSON.stringify(current), { path: '/', maxAge: 60 * 60 * 24 * 30 })

    // Auto Sync Mock Mode
    try {
      const mockRegsCookie = cookieStore.get('mock_registrations')?.value
      let listRegs: any[] = []
      if (mockRegsCookie) {
        listRegs = JSON.parse(mockRegsCookie)
      } else {
        const { mockRegistrations: defaultRegs } = await import('@/data/mock')
        listRegs = [...defaultRegs]
      }

      // Find all unique leagueIds where this team is registered
      const registeredLeagues = Array.from(new Set(
        listRegs.filter((r: any) => r.teamId === teamId).map((r: any) => r.leagueId).filter(Boolean)
      )) as string[]

      if (registeredLeagues.length > 0) {
        const mockLeaguesCookie = cookieStore.get('mock_leagues')?.value
        let listLeagues: any[] = []
        if (mockLeaguesCookie) {
          listLeagues = JSON.parse(mockLeaguesCookie)
        } else {
          const { leagues: defaultLeagues } = await import('@/data/mock')
          listLeagues = [...defaultLeagues]
        }

        for (const leagueId of registeredLeagues) {
          const league = listLeagues.find((l: any) => l.id === leagueId)
          if (league) {
            const leagueClassTags = league.classTags || []

            // Filter matching cars
            const matchingCars = teamCars.filter((car: any) => {
              if (!car.category) return false
              const c1 = car.category.toUpperCase()
              return leagueClassTags.some((tag: any) => {
                const c2 = tag.toUpperCase()
                return c1 === c2 || (c1.startsWith('LMP') && c2.startsWith('LMP'))
              })
            })

            const otherRegs = listRegs.filter((r: any) => r.leagueId === leagueId && r.teamId !== teamId)
            const newRegistrationsForLeague: any[] = []

            for (const car of matchingCars) {
              const carClassTag = String(car.category || '').toUpperCase()
              const carNum = parseCarNumber(car.dorsal)

              let regCarNumber = carNum
              if (regCarNumber <= 0) {
                for (let num = 12; num <= 99; num++) {
                  const taken = otherRegs.some(
                    (r: any) => r.classTag === carClassTag && Number(r.assignedNumber) === num && r.status !== 'rejected'
                  )
                  if (!taken) {
                    regCarNumber = num
                    break
                  }
                }
              } else {
                const isTaken = otherRegs.some(
                  (r: any) => r.classTag === carClassTag && Number(r.assignedNumber) === regCarNumber && r.status !== 'rejected'
                )
                if (isTaken) {
                  for (let num = 12; num <= 99; num++) {
                    const taken = otherRegs.some(
                      (r: any) => r.classTag === carClassTag && Number(r.assignedNumber) === num && r.status !== 'rejected'
                    )
                    if (!taken) {
                      regCarNumber = num
                      break
                    }
                  }
                }
              }

              let carDrivers = Array.isArray(car.driverUserIds) ? car.driverUserIds.filter(Boolean).map(String) : []
              if (carDrivers.length === 0) {
                carDrivers = [session.userId]
              }

              for (const userId of carDrivers) {
                newRegistrationsForLeague.push({
                  id: `mock_reg_${Date.now()}_${carClassTag}_${userId}_${regCarNumber}`,
                  leagueId,
                  userId,
                  teamId,
                  displayName: userId === session.userId ? (session.steamDisplayName || 'Team Leader') : `Driver ${userId.slice(0, 4)}`,
                  steamId: `steam_${userId}`,
                  classTag: carClassTag,
                  assignedNumber: regCarNumber,
                  createdAt: new Date().toISOString(),
                  status: 'approved',
                })
              }
            }

            // Remove previous registrations for this team in this league
            listRegs = listRegs.filter((r: any) => !(r.leagueId === leagueId && r.teamId === teamId))
            // Add new ones
            listRegs.push(...newRegistrationsForLeague)
          }
        }

        cookieStore.set('mock_registrations', JSON.stringify(listRegs), {
          path: '/',
          maxAge: 60 * 60 * 24 * 30, // 30 days
        })
      }
    } catch (err) {
      console.error('Failed auto-syncing league registrations on team update (Mock):', err)
    }

  } catch (e) {
    console.error('Failed to update mock team:', e)
  }

  revalidatePath('/equipos')
  revalidatePath(`/equipos/${teamId}`)
  redirect(`${redirectTo}?updated=1`)
}


export async function invitePilot(formData: FormData) {
  const session = await guardSession()
  const redirectTo = String(formData.get('redirectTo') || '/equipos')
  const teamId = String(formData.get('teamId') || '')
  const invitedUserIdFromForm = String(formData.get('invitedUserId') || '').trim()
  const steamIdFromForm = String(formData.get('steamId') || '').trim()
  const message = String(formData.get('message') || '').trim()
  if (!teamId || (!invitedUserIdFromForm && !steamIdFromForm)) redirect(`${redirectTo}?error=invite-required`)

  const allowed = await canManageTeam(teamId, session.userId)
  if (!allowed) redirect(`${redirectTo}?error=forbidden`)

  let invitedUserId: string | null = invitedUserIdFromForm || null
  let steamId = steamIdFromForm
  let invitedViaFirestore = false
  let redirectUrl: string | null = null

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        if (invitedUserId && !steamId) {
          const snapshot = await runWithTimeout(db.collection('steam_accounts').where('user_id', '==', invitedUserId).limit(1).get(), 3000)
          if (!snapshot.empty) {
            steamId = snapshot.docs[0].data().steam_id || ''
          }
        } else if (!invitedUserId && steamId) {
          const snapshot = await runWithTimeout(db.collection('steam_accounts').where('steam_id', '==', steamId).limit(1).get(), 3000)
          if (!snapshot.empty) {
            invitedUserId = snapshot.docs[0].data().user_id || null
          }
        }

        if (steamId) {
          if (invitedUserId) {
            const memberDoc = await runWithTimeout(db.collection('team_members').doc(`${teamId}_${invitedUserId}`).get(), 3000)
            if (memberDoc.exists) {
              redirectUrl = `${redirectTo}?error=already-member`
            }
          }

          if (!redirectUrl) {
            await runWithTimeout(db.collection('team_invites').add({
              team_id: teamId,
              invited_by_user_id: session.userId,
              invited_user_id: invitedUserId,
              invited_steam_id: steamId,
              message: message || null,
              status: 'pending',
              created_at: new Date(),
            }), 4000)

            invitedViaFirestore = true
          }
        }
      } catch (error) {
        console.error('Failed to invite pilot in Firestore (falling back to mock):', error)
      }
    }
  }

  if (redirectUrl) {
    redirect(redirectUrl)
  }

  // Fallback / Dual-mode Mock Invite
  if (!invitedViaFirestore) {
    try {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const existingInvites = cookieStore.get('mock_invites')?.value
      const invites = existingInvites ? JSON.parse(existingInvites) : []
      invites.push({
        id: `mock_invite_${Date.now()}`,
        team_id: teamId,
        invited_by_user_id: session.userId,
        invited_user_id: invitedUserId,
        invited_steam_id: steamId || 'mock_steam',
        message: message || null,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      cookieStore.set('mock_invites', JSON.stringify(invites), { path: '/', maxAge: 60 * 60 * 24 * 30 })
    } catch (e) {
      console.error('Failed to invite mock pilot:', e)
      redirect(`${redirectTo}?error=invite-failed`)
    }
  }

  revalidatePath('/equipos')
  revalidatePath(`/equipos/${teamId}`)
  redirect(`${redirectTo}?invite=1`)
}

export async function removeTeamMember(formData: FormData) {
  const session = await guardSession()
  const redirectTo = String(formData.get('redirectTo') || '/equipos')
  const teamId = String(formData.get('teamId') || '')
  const memberUserId = String(formData.get('memberUserId') || '')
  if (!teamId || !memberUserId) redirect(`${redirectTo}?error=member-required`)

  const allowed = await canManageTeam(teamId, session.userId)
  if (!allowed) redirect(`${redirectTo}?error=forbidden`)

  let removedFromFirestore = false
  let redirectUrl: string | null = null
  let removedDriverName = 'Piloto'
  let teamName = ''
  let ownerUserIdToNotify = ''
  const removedCarsList: string[] = []

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        const teamDoc = await runWithTimeout(db.collection('teams').doc(teamId).get(), 3000)
        if (teamDoc.exists) {
          const team = teamDoc.data()
          teamName = team?.name || ''
          ownerUserIdToNotify = team?.owner_user_id || ''

          if (team?.owner_user_id === memberUserId) {
            redirectUrl = `${redirectTo}?error=owner-protected`
          } else {
            // Get member display name before deleting
            const memberDoc = await db.collection('team_members').doc(`${teamId}_${memberUserId}`).get()
            if (memberDoc.exists) {
              removedDriverName = memberDoc.data()?.display_name || removedDriverName
            }

            // 1. Delete member from team_members collection
            await runWithTimeout(db.collection('team_members').doc(`${teamId}_${memberUserId}`).delete(), 3000)

            // 2. Remove member from league_registrations for this team
            try {
              const regSnap = await db
                .collection('league_registrations')
                .where('team_id', '==', teamId)
                .where('user_id', '==', memberUserId)
                .get()

              if (!regSnap.empty) {
                const batch = db.batch()
                regSnap.docs.forEach((doc: any) => batch.delete(doc.ref))
                await batch.commit()
              }
            } catch (errReg) {
              console.error('Failed to remove league registrations for member:', errReg)
            }

            // 3. Update team.cars: remove driver from slots, and delete car if 0 drivers remaining
            const currentCars = Array.isArray(team?.cars) ? team.cars : []
            const updatedCars: any[] = []

            for (const car of currentCars) {
              const currentDrivers = Array.isArray(car.driverUserIds)
                ? car.driverUserIds
                : Array.isArray(car.driver_user_ids)
                ? car.driver_user_ids
                : []

              const filteredDrivers = currentDrivers.filter((id: string) => id && id !== memberUserId)

              if (filteredDrivers.length > 0) {
                updatedCars.push({
                  ...car,
                  driverUserIds: filteredDrivers,
                })
              } else {
                // Car has 0 drivers left -> automatically removed!
                removedCarsList.push(`${car.category || 'Coche'} #${car.dorsal || 'N/A'}`)
              }
            }

            await db.collection('teams').doc(teamId).update({ cars: updatedCars })

            removedFromFirestore = true
          }
        }
      } catch (error) {
        console.error('Failed to remove team member in Firestore (falling back to mock):', error)
      }
    }
  }

  if (redirectUrl) {
    redirect(redirectUrl)
  }

  // Fallback / Dual-mode Mock Remove
  let mockRemoveSucceeded = false
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const teamsVal = cookieStore.get('mock_teams')?.value
    if (teamsVal) {
      const teams = JSON.parse(teamsVal)
      const teamIdx = teams.findIndex((t: any) => t.id === teamId)
      if (teamIdx !== -1) {
        const team = teams[teamIdx]
        teamName = team.name || teamName
        ownerUserIdToNotify = team.ownerUserId || ownerUserIdToNotify

        if (team.ownerUserId === memberUserId) {
          redirectUrl = `${redirectTo}?error=owner-protected`
        } else {
          // Find member name
          if (Array.isArray(team.members)) {
            const memberObj = team.members.find((m: any) => m.userId === memberUserId)
            if (memberObj) {
              removedDriverName = memberObj.displayName || memberObj.name || removedDriverName
            }
            team.members = team.members.filter((m: any) => m.userId !== memberUserId)
          }

          // Clean up cars in mock team
          if (Array.isArray(team.cars)) {
            const updatedCars: any[] = []
            for (const car of team.cars) {
              const filteredDrivers = (car.driverUserIds || []).filter((id: string) => id && id !== memberUserId)
              if (filteredDrivers.length > 0) {
                updatedCars.push({
                  ...car,
                  driverUserIds: filteredDrivers,
                })
              } else {
                removedCarsList.push(`${car.category || 'Coche'} #${car.dorsal || 'N/A'}`)
              }
            }
            team.cars = updatedCars
          }

          cookieStore.set('mock_teams', JSON.stringify(teams), { path: '/', maxAge: 60 * 60 * 24 * 30 })

          // Clean up mock registrations
          try {
            const mockRegsVal = cookieStore.get('mock_registrations')?.value
            if (mockRegsVal) {
              const regs = JSON.parse(mockRegsVal)
              const updatedRegs = regs.filter((r: any) => !(r.teamId === teamId && r.userId === memberUserId))
              cookieStore.set('mock_registrations', JSON.stringify(updatedRegs), { path: '/', maxAge: 60 * 60 * 24 * 30 })
            }
          } catch {}

          mockRemoveSucceeded = true
        }
      }
    }
  } catch (e) {
    console.error('Failed to remove mock team member:', e)
  }

  if (redirectUrl) {
    redirect(redirectUrl)
  }

  if (!removedFromFirestore && !mockRemoveSucceeded) {
    redirect(`${redirectTo}?error=remove-failed`)
  }

  // Create Notification for Team Leader
  if (ownerUserIdToNotify) {
    const carNoticeMsg = removedCarsList.length > 0
      ? ` Además, el/los vehículo(s) ${removedCarsList.join(', ')} fueron eliminados automáticamente al quedarse sin pilotos asignados.`
      : ''

    await createNotification({
      userId: ownerUserIdToNotify,
      title: 'Salida de Piloto y Actualización de Vehículos',
      message: `El piloto ${removedDriverName} ha dejado de pertenecer al equipo ${teamName}.${carNoticeMsg}`,
      link: `/equipos/${teamId}`
    })
  }

  revalidatePath('/equipos')
  revalidatePath(`/equipos/${teamId}`)
  revalidatePath('/ligas')
  redirect(`${redirectTo}?memberRemoved=1`)
}

export async function updateTeamMemberRole(formData: FormData) {
  const session = await guardSession()
  const redirectTo = String(formData.get('redirectTo') || '/equipos')
  const teamId = String(formData.get('teamId') || '')
  const memberUserId = String(formData.get('memberUserId') || '')
  const role = String(formData.get('role') || '').trim().toLowerCase()
  if (!teamId || !memberUserId) redirect(`${redirectTo}?error=member-required`)

  const allowed = await canManageTeam(teamId, session.userId)
  if (!allowed) redirect(`${redirectTo}?error=forbidden`)

  if (role !== 'driver' && role !== 'manager') {
    redirect(`${redirectTo}?error=invalid-role`)
  }

  let updatedInFirestore = false
  let redirectUrl: string | null = null

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        const teamDoc = await runWithTimeout(db.collection('teams').doc(teamId).get(), 3000)
        if (teamDoc.exists) {
          const team = teamDoc.data()
          if (team?.owner_user_id === memberUserId) {
            redirectUrl = `${redirectTo}?error=owner-protected`
          } else {
            await runWithTimeout(db.collection('team_members').doc(`${teamId}_${memberUserId}`).update({ role }), 3000)
            updatedInFirestore = true
          }
        }
      } catch (error) {
        console.error('Failed to update member role in Firestore (falling back to mock):', error)
      }
    }
  }

  if (redirectUrl) {
    redirect(redirectUrl)
  }

  // Fallback / Dual-mode Mock Update
  let mockUpdateSucceeded = false
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const teamsVal = cookieStore.get('mock_teams')?.value
    if (teamsVal) {
      const teams = JSON.parse(teamsVal)
      const teamIdx = teams.findIndex((t: any) => t.id === teamId)
      if (teamIdx !== -1) {
        const team = teams[teamIdx]
        if (team.ownerUserId === memberUserId) {
          redirectUrl = `${redirectTo}?error=owner-protected`
        } else {
          if (Array.isArray(team.members)) {
            const mIdx = team.members.findIndex((m: any) => m.userId === memberUserId)
            if (mIdx !== -1) {
              team.members[mIdx].role = role
              cookieStore.set('mock_teams', JSON.stringify(teams), { path: '/', maxAge: 60 * 60 * 24 * 30 })
            }
          }
          mockUpdateSucceeded = true
        }
      }
    }
  } catch (e) {
    console.error('Failed to update mock role:', e)
  }

  if (redirectUrl) {
    redirect(redirectUrl)
  }

  if (!updatedInFirestore && !mockUpdateSucceeded) {
    redirect(`${redirectTo}?error=role-update-failed`)
  }

  revalidatePath('/equipos')
  revalidatePath(`/equipos/${teamId}`)
  redirect(`${redirectTo}?roleUpdated=1`)
}

export async function deleteTeamAction(teamId: string) {
  const session = await guardSession()

  let isAllowed = false
  let deletedFromFirestore = false
  let redirectUrl: string | null = null

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        const teamDoc = await runWithTimeout(db.collection('teams').doc(teamId).get(), 3000)
        if (teamDoc.exists) {
          const team = teamDoc.data()
          const access = await getAdminAccessContext(session.userId)
          
          if (team?.owner_user_id === session.userId || access.canAccessPlatformAdmin) {
            isAllowed = true
          }

          if (!isAllowed) {
            redirectUrl = '/equipos?error=forbidden'
          } else {
            // 1. Delete team invites
            const invitesSnap = await runWithTimeout(db.collection('team_invites').where('team_id', '==', teamId).get(), 3000)
            const batch = db.batch()
            invitesSnap.docs.forEach((doc: any) => batch.delete(doc.ref))

            // 2. Delete team members
            const membersSnap = await runWithTimeout(db.collection('team_members').where('team_id', '==', teamId).get(), 3000)
            membersSnap.docs.forEach((doc: any) => batch.delete(doc.ref))

            // 3. Delete team registrations
            const regsSnap = await runWithTimeout(db.collection('league_team_registrations').where('team_id', '==', teamId).get(), 3000)
            regsSnap.docs.forEach((doc: any) => batch.delete(doc.ref))

            // 3.1. Delete pilot registrations associated with this team
            const pilotRegsSnap = await runWithTimeout(db.collection('league_registrations').where('team_id', '==', teamId).get(), 3000)
            pilotRegsSnap.docs.forEach((doc: any) => batch.delete(doc.ref))

            // 4. Delete team itself
            batch.delete(db.collection('teams').doc(teamId))

            await runWithTimeout(batch.commit(), 4000)
            deletedFromFirestore = true
          }
        }
      } catch (error) {
        console.error('Failed to delete team in Firestore (will try fallback):', error)
      }
    }
  }

  // If already flagged for redirect, execute it here (outside try-catch)
  if (redirectUrl) {
    redirect(redirectUrl)
  }

  // Always check and clean up mock cookies
  let mockDeleteSucceeded = false
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const existing = cookieStore.get('mock_teams')?.value
    if (existing) {
      let current: any[] = JSON.parse(existing)
      const team = current.find(t => t.id === teamId)
      const access = await getAdminAccessContext(session.userId)
      
      let isMockAllowed = false
      if (team) {
        if (team.ownerUserId === session.userId || access.canAccessPlatformAdmin) {
          isMockAllowed = true
        }

        if (!isMockAllowed && !deletedFromFirestore) {
          redirectUrl = '/equipos?error=forbidden'
        } else {
          current = current.filter(t => t.id !== teamId)
          cookieStore.set('mock_teams', JSON.stringify(current), { path: '/', maxAge: 60 * 60 * 24 * 30 })

          // Clean up mock registrations associated with this team
          const existingRegs = cookieStore.get('mock_registrations')?.value
          if (existingRegs) {
            let regs = JSON.parse(existingRegs)
            if (Array.isArray(regs)) {
              regs = regs.filter((r: any) => r.teamId !== teamId)
              cookieStore.set('mock_registrations', JSON.stringify(regs), { path: '/', maxAge: 60 * 60 * 24 * 30 })
            }
          }
          mockDeleteSucceeded = true
        }
      }
    }
  } catch (e) {
    console.error('Failed to delete mock team:', e)
  }

  if (redirectUrl) {
    redirect(redirectUrl)
  }

  if (!deletedFromFirestore && !mockDeleteSucceeded) {
    redirect('/equipos?error=delete-failed')
  }

  revalidatePath('/equipos')
  redirect('/equipos?deleted=1')
}

export async function acceptDriverApplicationAction(formData: FormData) {
  const session = await guardSession()
  const teamId = String(formData.get('teamId') || '')
  const applicationId = String(formData.get('applicationId') || '')
  const redirectTo = `/equipos/${teamId}`

  if (!teamId || !applicationId) redirect(`${redirectTo}?error=invalid-app`)

  const allowed = await canManageTeam(teamId, session.userId)
  if (!allowed) redirect(`${redirectTo}?error=forbidden`)

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        const appRef = db.collection('market_applications').doc(applicationId)
        const appDoc = await appRef.get()
        if (!appDoc.exists) redirect(`${redirectTo}?error=app-not-found`)
        const appData = appDoc.data()
        const hiredUserId = appData?.user_id

        // Add to team_members
        await db.collection('team_members').doc(`${teamId}_${hiredUserId}`).set({
          team_id: teamId,
          user_id: hiredUserId,
          role: 'driver',
          created_at: new Date(),
        })

        // Update application status
        await appRef.update({ status: 'accepted' })

        // Cleanup: Delete hired driver's listings from market
        const listingsSnap = await db.collection('market_listings').where('user_id', '==', hiredUserId).get()
        const batch = db.batch()
        listingsSnap.docs.forEach((doc: any) => batch.delete(doc.ref))

        // Cleanup: Delete pending applications of the driver
        const appsSnap = await db.collection('market_applications')
          .where('user_id', '==', hiredUserId)
          .where('status', '==', 'pending')
          .get()
        appsSnap.docs.forEach((doc: any) => batch.delete(doc.ref))

        // Cleanup: Delete pending invites of the driver (from team_invites too)
        const invitesSnap = await db.collection('team_invites')
          .where('invited_user_id', '==', hiredUserId)
          .where('status', '==', 'pending')
          .get()
        invitesSnap.docs.forEach((doc: any) => batch.delete(doc.ref))

        await batch.commit()
      } catch (err) {
        console.error('Failed to accept application:', err)
        redirect(`${redirectTo}?error=accept-failed`)
      }
    }
  } else {
    // Mock Mode Fallback
    try {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()

      const appsVal = cookieStore.get('mock_market_applications')?.value
      let apps = appsVal ? JSON.parse(appsVal) : []
      const appIdx = apps.findIndex((a: any) => a.id === applicationId)

      if (appIdx !== -1) {
        const appData = apps[appIdx]
        const hiredUserId = appData.userId

        // Add to mock teams members
        const teamsVal = cookieStore.get('mock_teams')?.value
        const teams = teamsVal ? JSON.parse(teamsVal) : []
        const teamIdx = teams.findIndex((t: any) => t.id === teamId)

        if (teamIdx !== -1) {
          const team = teams[teamIdx]
          if (!team.members) team.members = []
          if (!team.members.some((m: any) => m.userId === hiredUserId)) {
            team.members.push({
              id: `member_${teamId}_${hiredUserId}`,
              teamId,
              userId: hiredUserId,
              role: 'driver',
              createdAt: new Date().toISOString(),
              displayName: appData.userName,
            })
          }
          cookieStore.set('mock_teams', JSON.stringify(teams), { path: '/', maxAge: 60 * 60 * 24 * 30 })
        }

        apps[appIdx].status = 'accepted'
        apps = apps.filter((a: any) => a.id === applicationId || !(a.userId === hiredUserId && a.status === 'pending'))
        cookieStore.set('mock_market_applications', JSON.stringify(apps), { path: '/', maxAge: 60 * 60 * 24 * 7 })

        // Cleanup driver's mock listings
        const listingsVal = cookieStore.get('mock_market_listings')?.value
        if (listingsVal) {
          let listings = JSON.parse(listingsVal)
          listings = listings.filter((l: any) => l.user_id !== hiredUserId)
          cookieStore.set('mock_market_listings', JSON.stringify(listings), { path: '/', maxAge: 60 * 60 * 24 * 7 })
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  revalidatePath('/market')
  revalidatePath(`/equipos/${teamId}`)
  redirect(`${redirectTo}?roleUpdated=1`)
}

export async function declineDriverApplicationAction(formData: FormData) {
  const session = await guardSession()
  const teamId = String(formData.get('teamId') || '')
  const applicationId = String(formData.get('applicationId') || '')
  const redirectTo = `/equipos/${teamId}`

  if (!teamId || !applicationId) redirect(`${redirectTo}?error=invalid-app`)

  const allowed = await canManageTeam(teamId, session.userId)
  if (!allowed) redirect(`${redirectTo}?error=forbidden`)

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        await db.collection('market_applications').doc(applicationId).update({ status: 'declined' })
      } catch (err) {
        console.error('Failed to decline application:', err)
        redirect(`${redirectTo}?error=decline-failed`)
      }
    }
  } else {
    // Mock Mode
    try {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const appsVal = cookieStore.get('mock_market_applications')?.value
      const apps = appsVal ? JSON.parse(appsVal) : []
      const appIdx = apps.findIndex((a: any) => a.id === applicationId)
      if (appIdx !== -1) {
        apps[appIdx].status = 'declined'
        cookieStore.set('mock_market_applications', JSON.stringify(apps), { path: '/', maxAge: 60 * 60 * 24 * 7 })
      }
    } catch (e) {
      console.error(e)
    }
  }

  revalidatePath(`/equipos/${teamId}`)
  redirect(`${redirectTo}?updated=1`)
}
