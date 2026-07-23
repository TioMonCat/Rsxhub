'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCurrentUser, getAdminAccessContext, getLeagueRole, canManageLeague } from '@/lib/auth'
import { getFirestoreDb, hasFirebase, runWithTimeout } from '@/lib/firebase'
import { getLeagues, getRegistrations, getLeagueBySlug } from '@/lib/platform-data'

export async function createLeagueAction(formData: FormData) {
  const session = await getCurrentUser()
  if (!session) throw new Error('Unauthorized')

  const access = await getAdminAccessContext(session.userId)
  if (!access.canAccessPlatformAdmin) throw new Error('Forbidden')

  const title = String(formData.get('title') || '').trim()
  const simulator = String(formData.get('simulator') || 'ac').trim()
  const format = String(formData.get('format') || 'sprint').trim()
  const classTagsRaw = String(formData.get('classTags') || 'GT3').trim()
  const startsAt = String(formData.get('startsAt') || '').trim()
  const endsAt = String(formData.get('endsAt') || '').trim()
  const maxDrivers = Number(formData.get('maxDrivers') || 30)
  const maxDriversPerCar = formData.get('maxDriversPerCar') ? Number(formData.get('maxDriversPerCar')) : 4
  const registrationOpen = formData.has('registrationOpen') ? formData.get('registrationOpen') === 'true' : true
  const bannerUrl = String(formData.get('bannerUrl') || '').trim()
  const logoUrl = String(formData.get('logoUrl') || '').trim()
  const accentColor = String(formData.get('accentColor') || '').trim()
  const slogan = String(formData.get('slogan') || '').trim()
  const discordUrl = String(formData.get('discordUrl') || '').trim()
  const youtubeUrl = String(formData.get('youtubeUrl') || '').trim()
  const rulebookUrl = String(formData.get('rulebookUrl') || '').trim()

  if (!title || !startsAt || !endsAt) {
    throw new Error('Title, Start Date, and End Date are required.')
  }

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')

  const classLimits: Record<string, number> = {}
  ;['GT3', 'HYPERCAR', 'LMP2'].forEach((cat) => {
    const limitVal = formData.get(`max_cars_${cat}`)
    if (limitVal) {
      classLimits[cat] = Number(limitVal) || 30
    }
  })

  const payload = {
    title,
    slug,
    simulator,
    format,
    class_tags: classTagsRaw.split(',').map((tag) => tag.trim().toUpperCase()).filter(Boolean),
    class_limits: classLimits,
    starts_at: new Date(startsAt).toISOString(),
    ends_at: new Date(endsAt).toISOString(),
    max_drivers: maxDrivers,
    max_drivers_per_car: maxDriversPerCar,
    registration_open: registrationOpen,
    banner_url: bannerUrl || null,
    logo_url: logoUrl || null,
    accent_color: accentColor || null,
    slogan: slogan || null,
    discord_url: discordUrl || null,
    youtube_url: youtubeUrl || null,
    rulebook_url: rulebookUrl || null,
    status: 'open',
    is_featured: false,
    registration_mode: 'individual',
  }

  let createdViaFirestore = false

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        const docRef = db.collection('leagues').doc()
        await runWithTimeout(docRef.set({
          id: docRef.id,
          ...payload,
        }), 3500)
        createdViaFirestore = true
      } catch (error) {
        console.error('Failed to create league in Firestore (falling back to mock cookies):', error)
      }
    }
  }

  if (!createdViaFirestore) {
    // Mock Mode Fallback
    try {
      const cookieStore = await cookies()
      const existingCookie = cookieStore.get('mock_leagues')?.value
      
      let currentLeagues = []
      if (existingCookie) {
        currentLeagues = JSON.parse(existingCookie)
      } else {
        const { leagues: defaultLeagues } = await import('@/data/mock')
        currentLeagues = [...defaultLeagues]
      }

      const newLeague = {
        id: `mock_league_${Date.now()}`,
        title,
        slug,
        simulator,
        format,
        classTags: payload.class_tags,
        classLimits,
        startsAt: payload.starts_at,
        endsAt: payload.ends_at,
        maxDrivers,
        registrationOpen,
        bannerUrl: payload.banner_url,
        logoUrl: payload.logo_url,
        accentColor: payload.accent_color,
        slogan: payload.slogan,
        discordUrl: payload.discord_url,
        youtubeUrl: payload.youtube_url,
        rulebookUrl: payload.rulebook_url,
        status: 'open',
        featured: false,
        registrationMode: 'individual',
      }

      currentLeagues.push(newLeague)
      cookieStore.set('mock_leagues', JSON.stringify(currentLeagues), {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      })
    } catch (e) {
      console.error('Failed to create mock league:', e)
    }
  }

  revalidatePath('/ligas')
}

export async function updateLeagueDetailsAction(formData: FormData) {
  const session = await getCurrentUser()
  if (!session) throw new Error('Unauthorized')

  const leagueId = String(formData.get('leagueId') || '').trim()
  if (!leagueId) {
    throw new Error('League ID is required.')
  }

  const access = await getAdminAccessContext(session.userId)
  const isPlatformAdmin = access.canAccessPlatformAdmin

  const leagueRole = await getLeagueRole(leagueId, session.userId)
  const isLeagueManager = canManageLeague(leagueRole)

  if (!isPlatformAdmin && !isLeagueManager) {
    throw new Error('Forbidden: Only platform admins or league managers can customize league settings.')
  }

  const title = String(formData.get('title') || '').trim()
  const slug = String(formData.get('slug') || '').trim()
  const simulator = String(formData.get('simulator') || 'ac').trim()
  const format = String(formData.get('format') || 'sprint').trim()
  const status = String(formData.get('status') || 'open').trim()
  const registrationMode = String(formData.get('registrationMode') || 'team').trim()
  const classTagsRaw = String(formData.get('classTags') || '').trim()
  const startsAt = String(formData.get('startsAt') || '').trim()
  const endsAt = String(formData.get('endsAt') || '').trim()
  const maxDrivers = Number(formData.get('maxDrivers') || 30)
  const maxDriversPerCar = formData.get('maxDriversPerCar') ? Number(formData.get('maxDriversPerCar')) : 4
  const registrationOpen = status === 'open'
  const bannerUrl = String(formData.get('bannerUrl') || '').trim()
  const logoUrl = String(formData.get('logoUrl') || '').trim()
  const accentColor = String(formData.get('accentColor') || '').trim()
  const slogan = String(formData.get('slogan') || '').trim()
  const discordUrl = String(formData.get('discordUrl') || '').trim()
  const youtubeUrl = String(formData.get('youtubeUrl') || '').trim()
  const rulebookUrl = String(formData.get('rulebookUrl') || '').trim()

  if (!leagueId || !startsAt || !endsAt) {
    throw new Error('League ID, Start Date, and End Date are required.')
  }

  const classTags = classTagsRaw
    ? classTagsRaw.split(',').map((tag) => tag.trim().toUpperCase()).filter(Boolean)
    : undefined

  const classLimits: Record<string, number> = {}
  ;['GT3', 'HYPERCAR', 'LMP2'].forEach((cat) => {
    const limitVal = formData.get(`max_cars_${cat}`)
    if (limitVal) {
      classLimits[cat] = Number(limitVal) || 30
    }
  })

  const payload: any = {
    starts_at: new Date(startsAt).toISOString(),
    ends_at: new Date(endsAt).toISOString(),
    max_drivers: maxDrivers,
    max_drivers_per_car: maxDriversPerCar,
    registration_open: registrationOpen,
    banner_url: bannerUrl || null,
    logo_url: logoUrl || null,
    accent_color: accentColor || null,
    slogan: slogan || null,
    discord_url: discordUrl || null,
    youtube_url: youtubeUrl || null,
    rulebook_url: rulebookUrl || null,
    class_limits: classLimits,
  }

  if (title) payload.title = title
  if (slug) payload.slug = slug
  if (simulator) payload.simulator = simulator
  if (format) payload.format = format
  if (status) payload.status = status
  if (registrationMode) payload.registration_mode = registrationMode
  if (classTags) payload.class_tags = classTags

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      await db.collection('leagues').doc(leagueId).update(payload)
    }
  } else {
    // Mock Mode Fallback
    try {
      const cookieStore = await cookies()
      const existingCookie = cookieStore.get('mock_leagues')?.value
      
      let currentLeagues = []
      if (existingCookie) {
        currentLeagues = JSON.parse(existingCookie)
      } else {
        const { leagues: defaultLeagues } = await import('@/data/mock')
        currentLeagues = [...defaultLeagues]
      }

      currentLeagues = currentLeagues.map((lg: any) => {
        if (lg.id === leagueId) {
          return {
            ...lg,
            title: title || lg.title,
            slug: slug || lg.slug,
            simulator: simulator || lg.simulator,
            format: format || lg.format,
            status: status || lg.status,
            registrationMode: registrationMode || lg.registrationMode,
            classTags: classTags || lg.classTags,
            classLimits: { ...(lg.classLimits || {}), ...classLimits },
            startsAt: payload.starts_at,
            endsAt: payload.ends_at,
            maxDrivers,
            registrationOpen,
            bannerUrl: payload.banner_url,
            logoUrl: payload.logo_url,
            accentColor: payload.accent_color,
            slogan: payload.slogan,
            discordUrl: payload.discord_url,
            youtubeUrl: payload.youtube_url,
            rulebookUrl: payload.rulebook_url,
          }
        }
        return lg
      })

      cookieStore.set('mock_leagues', JSON.stringify(currentLeagues), {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      })
    } catch (e) {
      console.error('Failed to update mock league:', e)
    }
  }

  revalidatePath('/ligas')
  if (slug) {
    revalidatePath(`/ligas/${slug}`)
  }
}

export async function deleteLeagueAction(leagueId: string, slug?: string) {
  const session = await getCurrentUser()
  if (!session) throw new Error('Unauthorized')

  const access = await getAdminAccessContext(session.userId)
  if (!access.canAccessPlatformAdmin) throw new Error('Forbidden')

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

        // 6. Delete cars
        const carsSnap = await db.collection('league_cars').where('league_id', '==', leagueId).get()
        carsSnap.docs.forEach((doc: any) => batch.delete(doc.ref))

        // 7. Delete league itself
        batch.delete(db.collection('leagues').doc(leagueId))

        await batch.commit()
      } catch (error) {
        console.error('Failed to delete Firestore references:', error)
      }
    }
  }

  // ALWAYS filter and update the mock_leagues cookie so that the league is removed even if we combine with mock fallback
  try {
    const cookieStore = await cookies()
    const existingCookie = cookieStore.get('mock_leagues')?.value
    
    let currentLeagues = []
    if (existingCookie) {
      currentLeagues = JSON.parse(existingCookie)
    } else {
      const { leagues: defaultLeagues } = await import('@/data/mock')
      currentLeagues = [...defaultLeagues]
    }

    currentLeagues = currentLeagues.filter((lg: any) => lg.id !== leagueId)
    cookieStore.set('mock_leagues', JSON.stringify(currentLeagues), {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })
  } catch (e) {
    console.error('Failed to update mock_leagues cookie on deletion:', e)
  }

  revalidatePath('/ligas')
  if (slug) {
    revalidatePath(`/ligas/${slug}`)
    redirect('/ligas')
  }
}

function parseCarNumber(dorsal: any): number {
  if (dorsal == null) return 0
  const str = String(dorsal).replace(/[^0-9]/g, '')
  const num = parseInt(str, 10)
  return isNaN(num) ? 0 : num
}

export async function registerTeamAction(formData: FormData) {
  const session = await getCurrentUser()
  if (!session) throw new Error('Unauthorized')

  const slug = String(formData.get('slug') || '')
  const leagueId = String(formData.get('leagueId') || '')
  const teamId = String(formData.get('teamId') || '')
  const inputClassTag = String(formData.get('classTag') || '').trim().toUpperCase()
  const carModel = String(formData.get('carModel') || '')
  const carNumberInput = parseCarNumber(formData.get('carNumber'))
  const driverUserIds = formData.getAll('driverUserIds').map(String)

  if (!leagueId || !teamId) {
    throw new Error('League ID and Team ID are required.')
  }

  // Fetch the league and its classTags
  let leagueClassTags: string[] = []
  try {
    const league = await getLeagueBySlug(slug)
    leagueClassTags = league?.classTags || []
  } catch (err) {
    console.error('Failed to resolve league details:', err)
  }

  // Load team cars/members to perform automatic complete team registration (GT3, LMP2, etc.)
  let teamCars: any[] = []
  let teamMembers: any[] = []

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        const teamDoc = await db.collection('teams').doc(teamId).get()
        if (teamDoc.exists) {
          const teamData = teamDoc.data()
          teamCars = teamData?.cars || []
        }
        const membersSnap = await db.collection('team_members').where('team_id', '==', teamId).get()
        teamMembers = membersSnap.docs.map((doc: any) => ({
          userId: doc.data()?.user_id || '',
          role: doc.data()?.role || '',
        }))
      } catch (e) {
        console.error('Failed to load team data in Firestore action:', e)
      }
    }
  } else {
    try {
      const cookieStore = await cookies()
      const existingTeams = cookieStore.get('mock_teams')?.value
      if (existingTeams) {
        const teams = JSON.parse(existingTeams)
        const foundTeam = teams.find((t: any) => t.id === teamId)
        if (foundTeam) {
          teamCars = foundTeam.cars || []
          teamMembers = foundTeam.members || []
        }
      }
    } catch (e) {
      console.error('Failed to load team data from cookies:', e)
    }
  }

  // Find all cars in the team's workshop that match the league's classTags
  const matchingCars = teamCars.filter((car: any) => {
    if (!car.category) return false
    const c1 = car.category.toUpperCase()
    return leagueClassTags.some((tag: any) => {
      const c2 = tag.toUpperCase()
      return c1 === c2 || (c1.startsWith('LMP') && c2.startsWith('LMP'))
    })
  })

  type CarToRegister = {
    classTag: string
    carModel: string
    carNumber: number
    driverUserIds: string[]
  }

  const carsToRegister: CarToRegister[] = []

  if (matchingCars.length > 0) {
    for (const car of matchingCars) {
      const carClassTag = String(car.category || '').toUpperCase()
      const carNum = parseCarNumber(car.dorsal)
      const carMod = String(car.model || '')
      
      // Get the drivers assigned to this car in the workshop
      let carDrivers = Array.isArray(car.driverUserIds) ? car.driverUserIds.filter(Boolean).map(String) : []
      
      // Fallback to form's driverUserIds (all team members) if the car has no drivers configured
      if (carDrivers.length === 0) {
        carDrivers = driverUserIds.length > 0 ? driverUserIds : [session.userId]
      }

      carsToRegister.push({
        classTag: carClassTag,
        carModel: carMod,
        carNumber: carNum,
        driverUserIds: carDrivers,
      })
    }
  } else {
    // Fallback: register the single selected class from the form
    let fallbackClassTag = inputClassTag
    if (!fallbackClassTag || fallbackClassTag === 'GENERAL' || !leagueClassTags.map(t => t.toUpperCase()).includes(fallbackClassTag)) {
      fallbackClassTag = (leagueClassTags[0] || 'GT3').toUpperCase()
    }

    carsToRegister.push({
      classTag: fallbackClassTag,
      carModel: carModel,
      carNumber: carNumberInput,
      driverUserIds: driverUserIds.length > 0 ? driverUserIds : [session.userId],
    })
  }

  // Get current registrations to check for taken numbers
  const registrations = await getRegistrations(leagueId)

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      // 1. Clean up previous registrations for this team in this league to prevent orphans
      try {
        const oldRegsSnap = await db
          .collection('league_registrations')
          .where('league_id', '==', leagueId)
          .where('team_id', '==', teamId)
          .get()
        const deleteBatch = db.batch()
        oldRegsSnap.docs.forEach((d: any) => deleteBatch.delete(d.ref))
        await deleteBatch.commit()
      } catch (err) {
        console.error('Failed to clean up old registrations in Firestore:', err)
      }

      // 2. Insert new registrations
      const batch = db.batch()
      
      for (const carToReg of carsToRegister) {
        // Resolve display names for each user in driverUserIds
        const driverInfos = await Promise.all(
          carToReg.driverUserIds.map(async (userId) => {
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
              console.error('Failed to resolve display name for driver registration:', e)
            }
            return { userId, displayName }
          })
        )

        // Make sure carNumber is valid and not taken in this specific category
        let regCarNumber = carToReg.carNumber
        if (regCarNumber <= 0) {
          // Generate a free number
          for (let num = 12; num <= 99; num++) {
            const taken = registrations.some(
              (r) => r.classTag === carToReg.classTag && r.assignedNumber === num && r.status !== 'rejected'
            )
            if (!taken) {
              regCarNumber = num
              break
            }
          }
        } else {
          const isTaken = registrations.some(
            (r) => r.classTag === carToReg.classTag && r.assignedNumber === regCarNumber && r.status !== 'rejected'
          )
          if (isTaken) {
            // Find a free fallback number instead of crashing the batch
            for (let num = 12; num <= 99; num++) {
              const taken = registrations.some(
                (r) => r.classTag === carToReg.classTag && r.assignedNumber === num && r.status !== 'rejected'
              )
              if (!taken) {
                regCarNumber = num
                break
              }
            }
          }
        }

        // Create a league_registration for each driver in this category
        for (const info of driverInfos) {
          // Ensure docId is unique per car number to support multiple cars of same class
          const docId = `${leagueId}_${carToReg.classTag}_${info.userId}_${regCarNumber}`
          const docRef = db.collection('league_registrations').doc(docId)
          batch.set(docRef, {
            league_id: leagueId,
            user_id: info.userId,
            team_id: teamId,
            display_name: info.displayName,
            status: 'approved',
            class_tag: carToReg.classTag,
            assigned_number: regCarNumber,
            created_at: new Date().toISOString(),
          }, { merge: true })
        }
      }
      
      await batch.commit()
    }
  } else {
    // Mock Mode
    try {
      const cookieStore = await cookies()
      const existing = cookieStore.get('mock_registrations')?.value
      
      let list = []
      if (existing) {
        list = JSON.parse(existing)
      } else {
        const { mockRegistrations: defaultRegs } = await import('@/data/mock')
        list = [...defaultRegs]
      }

      // 1. Remove ALL existing registrations for this team in this league ONCE before registering new ones
      list = list.filter((r: any) => !(r.leagueId === leagueId && r.teamId === teamId))

      for (const carToReg of carsToRegister) {
        // Resolve car number
        let regCarNumber = carToReg.carNumber
        if (regCarNumber <= 0) {
          for (let num = 12; num <= 99; num++) {
            const taken = registrations.some(
              (r) => r.classTag === carToReg.classTag && r.assignedNumber === num && r.status !== 'rejected'
            )
            if (!taken) {
              regCarNumber = num
              break
            }
          }
        } else {
          const isTaken = registrations.some(
            (r) => r.classTag === carToReg.classTag && r.assignedNumber === regCarNumber && r.status !== 'rejected'
          )
          if (isTaken) {
            for (let num = 12; num <= 99; num++) {
              const taken = registrations.some(
                (r) => r.classTag === carToReg.classTag && r.assignedNumber === num && r.status !== 'rejected'
              )
              if (!taken) {
                regCarNumber = num
                break
              }
            }
          }
        }

        // Create registrations for selected drivers for this category
        const newRegs = carToReg.driverUserIds.map((userId) => ({
          id: `mock_reg_${Date.now()}_${carToReg.classTag}_${userId}_${regCarNumber}`,
          leagueId,
          userId,
          teamId,
          displayName: userId === session.userId ? (session.steamDisplayName || 'Team Leader') : `Driver ${userId.slice(0, 4)}`,
          steamId: `steam_${userId}`,
          classTag: carToReg.classTag,
          assignedNumber: regCarNumber,
          createdAt: new Date().toISOString(),
          status: 'approved',
        }))

        // Just push them to the list (we already filtered once at the start!)
        list.push(...newRegs)
      }

      cookieStore.set('mock_registrations', JSON.stringify(list), {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      })
    } catch (e) {
      console.error('Failed to save mock registrations:', e)
    }
  }

  revalidatePath(`/ligas/${slug}`)
}

export async function unregisterTeamAction(formData: FormData) {
  const session = await getCurrentUser()
  if (!session) throw new Error('Unauthorized')

  const slug = String(formData.get('slug') || '')
  const leagueId = String(formData.get('leagueId') || '')
  const teamId = String(formData.get('teamId') || '')
  const classTag = String(formData.get('classTag') || '')

  if (!leagueId || !teamId || !classTag) {
    throw new Error('League ID, Team ID and Class Tag are required.')
  }

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      const snapshot = await db
        .collection('league_registrations')
        .where('league_id', '==', leagueId)
        .where('team_id', '==', teamId)
        .where('class_tag', '==', classTag)
        .get()

      const batch = db.batch()
      snapshot.docs.forEach((doc: any) => batch.delete(doc.ref))
      await batch.commit()
    }
  } else {
    // Mock Mode
    try {
      const cookieStore = await cookies()
      const existing = cookieStore.get('mock_registrations')?.value
      
      let list = []
      if (existing) {
        list = JSON.parse(existing)
      } else {
        const { mockRegistrations: defaultRegs } = await import('@/data/mock')
        list = [...defaultRegs]
      }

      list = list.filter((r: any) => !(r.leagueId === leagueId && r.teamId === teamId && r.classTag === classTag))

      cookieStore.set('mock_registrations', JSON.stringify(list), {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      })
    } catch (e) {
      console.error('Failed to delete mock registration:', e)
    }
  }

  revalidatePath(`/ligas/${slug}`)
}

export async function confirmAttendanceAction(formData: FormData) {
  const session = await getCurrentUser()
  if (!session) throw new Error('Unauthorized')

  const eventId = String(formData.get('eventId') || '')
  const leagueId = String(formData.get('leagueId') || '')
  const teamId = String(formData.get('teamId') || '')
  const classTag = String(formData.get('classTag') || '').trim().toUpperCase()
  const carNumber = Number(formData.get('carNumber') || 0)
  const carModel = String(formData.get('carModel') || '')
  const slug = String(formData.get('slug') || '')

  if (!eventId || !leagueId || !teamId || !classTag || !carNumber) {
    throw new Error('All fields are required.')
  }

  // 1. Get the league's category limit
  let categoryLimit = 30
  try {
    const league = await getLeagueBySlug(slug)
    if (league) {
      if (league.classLimits && league.classLimits[classTag] !== undefined) {
        categoryLimit = league.classLimits[classTag]
      }
    }
  } catch (e) {
    console.error('Failed to get league classLimits:', e)
  }

  // 2. Count current confirmed cars in this category for this event
  let currentConfirmed = 0
  const docId = `${eventId}_${teamId}_${classTag}_${carNumber}`

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      const existingSnaps = await db
        .collection('league_event_confirmations')
        .where('event_id', '==', eventId)
        .where('class_tag', '==', classTag)
        .where('status', '==', 'confirmed')
        .get()
      
      currentConfirmed = existingSnaps.size
    }
  } else {
    try {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const existing = cookieStore.get('mock_event_confirmations')?.value
      const list = existing ? JSON.parse(existing) : []
      currentConfirmed = list.filter(
        (c: any) => c.eventId === eventId && c.classTag === classTag && c.status === 'confirmed'
      ).length
    } catch (e) {
      console.error('Error counting mock confirmations:', e)
    }
  }

  if (currentConfirmed >= categoryLimit) {
    throw new Error(`¡La parrilla para la categoría ${classTag} está llena (${categoryLimit} coches máximo)!`)
  }

  // 3. Save the confirmation
  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      await db.collection('league_event_confirmations').doc(docId).set({
        id: docId,
        event_id: eventId,
        league_id: leagueId,
        team_id: teamId,
        class_tag: classTag,
        car_number: carNumber,
        car_model: carModel,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      }, { merge: true })
    }
  } else {
    try {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const existing = cookieStore.get('mock_event_confirmations')?.value
      let list = existing ? JSON.parse(existing) : []

      // Remove existing for this exact car if any
      list = list.filter((c: any) => !(c.id === docId))

      list.push({
        id: docId,
        eventId,
        leagueId,
        teamId,
        classTag,
        carNumber,
        carModel,
        status: 'confirmed',
        confirmedAt: new Date().toISOString(),
      })

      cookieStore.set('mock_event_confirmations', JSON.stringify(list), {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      })
    } catch (e) {
      console.error('Failed to save mock confirmation:', e)
    }
  }

  revalidatePath(`/ligas/${slug}`)
}

export async function cancelAttendanceAction(formData: FormData) {
  const session = await getCurrentUser()
  if (!session) throw new Error('Unauthorized')

  const eventId = String(formData.get('eventId') || '')
  const teamId = String(formData.get('teamId') || '')
  const classTag = String(formData.get('classTag') || '').trim().toUpperCase()
  const carNumber = Number(formData.get('carNumber') || 0)
  const slug = String(formData.get('slug') || '')

  if (!eventId || !teamId || !classTag || !carNumber) {
    throw new Error('All fields are required.')
  }

  const docId = `${eventId}_${teamId}_${classTag}_${carNumber}`

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      await db.collection('league_event_confirmations').doc(docId).delete()
    }
  } else {
    try {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const existing = cookieStore.get('mock_event_confirmations')?.value
      let list = existing ? JSON.parse(existing) : []

      list = list.filter((c: any) => !(c.id === docId))

      cookieStore.set('mock_event_confirmations', JSON.stringify(list), {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      })
    } catch (e) {
      console.error('Failed to cancel mock confirmation:', e)
    }
  }

  revalidatePath(`/ligas/${slug}`)
}
