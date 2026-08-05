'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getAdminAccessContext } from '@/lib/auth'
import { getFirestoreDb, hasFirebase, runWithTimeout } from '@/lib/firebase'
import { getTeamsDashboard } from '@/lib/team-data'
import { invalidateCache } from '@/lib/ttl-cache'
import { cleanupDriverMarketDataOnTeamJoin } from '@/lib/market-cleanup'
import { guardSession, canManageTeam, cleanPilotName, parseSkinProfilesJson } from './team-parsers'

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

  await cleanupDriverMarketDataOnTeamJoin(session.userId)
  invalidateCache(['teams_dashboard', 'platform_leagues'])
  revalidatePath('/equipos')
  revalidatePath('/perfil')
  if (redirectUrl) {
    redirect(redirectUrl)
  } else {
    redirect('/equipos')
  }
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
          .map((car: any) => {
            let skinUrl = String(car.skinUrl || car.skin_url || '').trim()
            if (skinUrl.startsWith('data:') && skinUrl.length > 200000) {
              skinUrl = ''
            }
            return {
              ...car,
              id: car.id || `car_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              category: String(car.category || 'GT3').toUpperCase(),
              dorsal: String(car.dorsal || '').replace(/[^0-9]/g, '').slice(0, 3),
              skinUrl,
              skinName: car.skinName || car.skin_name || '',
              driverUserIds: (car.driverUserIds || car.driver_user_ids || []).map((d: any) => String(d || '').trim()),
              driverUserIdsByLeague: car.driverUserIdsByLeague || car.driver_user_ids_by_league || {},
              leagueId: car.leagueId || car.league_id || null,
            }
          })
          .filter((car: any) => Boolean(car.id || car.dorsal || car.category))

        // Validate internal uniqueness of dorsals per category & league
        const dorsalsSeen = new Set<string>()
        for (const car of teamCars) {
          const d = String(car.dorsal || '').trim()
          if (d) {
            const key = `${String(car.category || 'GT3').toUpperCase()}_${String(car.leagueId || 'general')}_${d}`
            if (dorsalsSeen.has(key)) {
              redirect(`${redirectTo}?error=dorsal-duplicate`)
            }
            dorsalsSeen.add(key)
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
                  const carDorsal = String(car.dorsal || '').trim()

                  let regCarNumber = carDorsal
                  if (!regCarNumber) {
                    for (let num = 12; num <= 99; num++) {
                      const numStr = String(num)
                      const taken = otherRegs.some(
                        (r: any) => r.class_tag === carClassTag && String(r.assigned_number ?? '').trim() === numStr && r.status !== 'rejected'
                      )
                      if (!taken) {
                        regCarNumber = numStr
                        break
                      }
                    }
                  } else {
                    const isTaken = otherRegs.some(
                      (r: any) => r.class_tag === carClassTag && String(r.assigned_number ?? '').trim() === regCarNumber && r.status !== 'rejected'
                    )
                    if (isTaken) {
                      for (let num = 12; num <= 99; num++) {
                        const numStr = String(num)
                        const taken = otherRegs.some(
                          (r: any) => r.class_tag === carClassTag && String(r.assigned_number ?? '').trim() === numStr && r.status !== 'rejected'
                        )
                        if (!taken) {
                          regCarNumber = numStr
                          break
                        }
                      }
                    }
                  }

                  let carDrivers: string[] = []
                  const byLeague = car.driverUserIdsByLeague || car.driver_user_ids_by_league || {}
                  if (byLeague[leagueId] && Array.isArray(byLeague[leagueId])) {
                    carDrivers = byLeague[leagueId].filter(Boolean).map(String)
                  } else if (Array.isArray(car.driverUserIds)) {
                    carDrivers = car.driverUserIds.filter(Boolean).map(String)
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
              const carDorsal = String(car.dorsal || '').trim()

              let regCarNumber = carDorsal
              if (!regCarNumber) {
                for (let num = 12; num <= 99; num++) {
                  const numStr = String(num)
                  const taken = otherRegs.some(
                    (r: any) => r.classTag === carClassTag && String(r.assignedNumber ?? '').trim() === numStr && r.status !== 'rejected'
                  )
                  if (!taken) {
                    regCarNumber = numStr
                    break
                  }
                }
              } else {
                const isTaken = otherRegs.some(
                  (r: any) => r.classTag === carClassTag && String(r.assignedNumber ?? '').trim() === regCarNumber && r.status !== 'rejected'
                )
                if (isTaken) {
                  for (let num = 12; num <= 99; num++) {
                    const numStr = String(num)
                    const taken = otherRegs.some(
                      (r: any) => r.classTag === carClassTag && String(r.assignedNumber ?? '').trim() === numStr && r.status !== 'rejected'
                    )
                    if (!taken) {
                      regCarNumber = numStr
                      break
                    }
                  }
                }
              }

              let carDrivers: string[] = []
              const byLeagueMock = car.driverUserIdsByLeague || car.driver_user_ids_by_league || {}
              if (byLeagueMock[leagueId] && Array.isArray(byLeagueMock[leagueId])) {
                carDrivers = byLeagueMock[leagueId].filter(Boolean).map(String)
              } else if (Array.isArray(car.driverUserIds)) {
                carDrivers = car.driverUserIds.filter(Boolean).map(String)
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

  invalidateCache(['teams_dashboard', 'platform_leagues'])
  revalidatePath('/equipos')
  revalidatePath(`/equipos/${teamId}`)
  revalidatePath('/perfil')
  redirect(`${redirectTo}?updated=1`)
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

            // 3.2. Delete team market listings
            const mListingsSnap = await runWithTimeout(db.collection('market_listings').where('team_id', '==', teamId).get(), 3000).catch(() => null)
            if (mListingsSnap) mListingsSnap.docs.forEach((doc: any) => batch.delete(doc.ref))

            // 3.3. Delete team market applications
            const mAppsSnap = await runWithTimeout(db.collection('market_applications').where('team_id', '==', teamId).get(), 3000).catch(() => null)
            if (mAppsSnap) mAppsSnap.docs.forEach((doc: any) => batch.delete(doc.ref))

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

          // Clean up mock market listings associated with this team
          const mockListingsVal = cookieStore.get('mock_market_listings')?.value
          if (mockListingsVal) {
            let mListings = JSON.parse(mockListingsVal)
            if (Array.isArray(mListings)) {
              mListings = mListings.filter((l: any) => l.team_id !== teamId && l.teamId !== teamId)
              cookieStore.set('mock_market_listings', JSON.stringify(mListings), { path: '/', maxAge: 60 * 60 * 24 * 30 })
            }
          }

          // Clean up mock market applications associated with this team
          const mockAppsVal = cookieStore.get('mock_market_applications')?.value
          if (mockAppsVal) {
            let mApps = JSON.parse(mockAppsVal)
            if (Array.isArray(mApps)) {
              mApps = mApps.filter((a: any) => a.teamId !== teamId && a.team_id !== teamId)
              cookieStore.set('mock_market_applications', JSON.stringify(mApps), { path: '/', maxAge: 60 * 60 * 24 * 30 })
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

  invalidateCache(['teams_dashboard', 'platform_leagues'])
  revalidatePath('/equipos')
  revalidatePath('/perfil')
  redirect('/equipos?deleted=1')
}