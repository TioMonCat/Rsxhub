'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getLeagueBySlug } from '@/lib/platform-data'
import { getCurrentUser } from '@/lib/auth'
import { getFirestoreDb, hasFirebase } from '@/lib/firebase'

type SteamRow = { user_id: string; steam_id: string; steam_display_name: string }
type ProfileRow = { user_id: string; display_name: string | null; racing_number: number | null }

function parseClassTag(leagueClassTags: string[] | undefined, rawClassTag: string) {
  const normalized = rawClassTag.trim().toUpperCase()
  if (!leagueClassTags || leagueClassTags.length === 0) return normalized || null
  if (!normalized) return null
  const allowed = new Set(leagueClassTags.map((item) => item.toUpperCase()))
  return allowed.has(normalized) ? normalized : null
}

async function getPreferredNumbers({
  db,
  userId,
  classTag,
}: {
  db: any
  userId: string
  classTag: string | null
}) {
  const preferred: number[] = []

  if (classTag) {
    const snapshot = await db
      .collection('driver_number_preferences')
      .where('user_id', '==', userId)
      .where('class_tag', '==', classTag)
      .limit(1)
      .get()

    if (!snapshot.empty) {
      const data = snapshot.docs[0].data()
      const candidates = [data.number_1, data.number_2, data.number_3]
      for (const value of candidates) {
        if (typeof value === 'number' && value >= 0 && value <= 999 && !preferred.includes(value)) {
          preferred.push(value)
        }
      }
    }
  }

  const profileDoc = await db.collection('profiles').doc(userId).get()
  if (profileDoc.exists) {
    const fallback = profileDoc.data().racing_number
    if (typeof fallback === 'number' && fallback >= 0 && fallback <= 999 && !preferred.includes(fallback)) {
      preferred.push(fallback)
    }
  }

  return preferred
}

async function pickAssignedNumber({
  db,
  leagueId,
  classTag,
  preferred,
}: {
  db: any
  leagueId: string
  classTag: string | null
  preferred: number[]
}) {
  let query = db.collection('league_registrations').where('league_id', '==', leagueId)
  if (classTag) query = query.where('class_tag', '==', classTag)
  const snapshot = await query.get()

  const used = new Set(
    snapshot.docs
      .map((doc: any) => doc.data().assigned_number)
      .filter((value: any): value is number => typeof value === 'number' && value >= 0),
  )

  for (const candidate of preferred) {
    if (!used.has(candidate)) return candidate
  }

  for (let number = 0; number <= 999; number += 1) {
    if (!used.has(number)) return number
  }

  return null
}

async function isNumberAvailable({
  db,
  leagueId,
  classTag,
  number,
  currentUserId,
  teamId,
}: {
  db: any
  leagueId: string
  classTag: string | null
  number: number
  currentUserId: string
  teamId?: string | null
}) {
  let query = db
    .collection('league_registrations')
    .where('league_id', '==', leagueId)
    .where('assigned_number', '==', number)
  if (classTag) query = query.where('class_tag', '==', classTag)
  const snapshot = await query.get()

  const rows = snapshot.docs.map((doc: any) => doc.data())
  return !rows.some((row: any) => {
    if (row.user_id === currentUserId) return false
    if (teamId && row.team_id === teamId) return false
    return true
  })
}

function parseDesiredNumber(value: FormDataEntryValue | null) {
  const raw = String(value || '').trim()
  if (!raw) return null
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 999) return -1
  return parsed
}

async function upsertLeagueRegistration({
  db,
  leagueId,
  userId,
  teamId,
  classTag,
  desiredNumber,
}: {
  db: any
  leagueId: string
  userId: string
  teamId: string | null
  classTag: string | null
  desiredNumber?: number | null
}) {
  const steamDoc = await db.collection('steam_accounts').doc(userId).get()
  const profileDoc = await db.collection('profiles').doc(userId).get()

  const steam = steamDoc.exists ? steamDoc.data() : { steam_id: userId, steam_display_name: 'Driver' }
  const profile = profileDoc.exists ? profileDoc.data() : null

  let assignedNumber: number | null = null
  if (typeof desiredNumber === 'number' && desiredNumber >= 0) {
    const available = await isNumberAvailable({ db, leagueId, classTag, number: desiredNumber, currentUserId: userId, teamId })
    if (!available) return { ok: false as const, reason: 'number-taken' as const }
    assignedNumber = desiredNumber
  } else {
    const preferences = await getPreferredNumbers({ db, userId, classTag })
    assignedNumber = await pickAssignedNumber({ db, leagueId, classTag, preferred: preferences })
  }
  const displayName = profile?.display_name || steam.steam_display_name || steam.steam_id

  const docId = teamId ? `${leagueId}_${userId}_${classTag || 'noclass'}` : `${leagueId}_${userId}`
  await db.collection('league_registrations').doc(docId).set({
    league_id: leagueId,
    user_id: userId,
    team_id: teamId,
    display_name: displayName,
    steam_id: steam.steam_id,
    status: 'pending',
    class_tag: classTag,
    assigned_number: assignedNumber,
    created_at: new Date(),
  }, { merge: true })

  return { ok: true as const, assignedNumber }
}

export async function registerForLeague(formData: FormData) {
  const slug = String(formData.get('slug') || '')
  const league = await getLeagueBySlug(slug)
  const session = await getCurrentUser()

  if (!league) redirect('/ligas')
  if (!session) redirect(`/ligas/${slug}?register=login`)
  if (!league.registrationOpen || league.status !== 'open') redirect(`/ligas/${slug}?register=closed`)

  if (!hasFirebase) redirect(`/ligas/${slug}?register=mock`)
  const db = getFirestoreDb()
  if (!db) redirect(`/ligas/${slug}?register=mock`)

  const mode = String(formData.get('registrationMode') || 'driver').toLowerCase()
  const registrationMode = league.registrationMode || 'individual'
  const classTag = parseClassTag(league.classTags, String(formData.get('classTag') || ''))
  if (league.classTags && league.classTags.length > 0 && !classTag) redirect(`/ligas/${slug}?register=class-required`)

  if (registrationMode === 'team' && mode !== 'team') redirect(`/ligas/${slug}?register=team-only`)
  if (registrationMode === 'individual' && mode === 'team') redirect(`/ligas/${slug}?register=individual-only`)

  if (mode === 'team') {
    const teamId = String(formData.get('teamId') || '').trim()
    const carModel = String(formData.get('carModel') || '').trim()
    const parsedCarNumber = parseDesiredNumber(formData.get('carNumber'))
    const selectedDrivers = formData
      .getAll('driverUserIds')
      .map((value) => String(value).trim())
      .filter(Boolean)
    if (parsedCarNumber === -1) redirect(`/ligas/${slug}?register=number-invalid`)

    if (!teamId) redirect(`/ligas/${slug}?register=team-data-required`)

    try {
      const teamDoc = await db.collection('teams').doc(teamId).get()
      const managerDoc = await db.collection('team_members').doc(`${teamId}_${session.userId}`).get()
      const membersSnapshot = await db.collection('team_members').where('team_id', '==', teamId).get()

      const team = teamDoc.data()
      const managerRow = managerDoc.data()

      const canManage = team?.owner_user_id === session.userId || managerRow?.role === 'owner' || managerRow?.role === 'manager'
      if (!canManage) redirect(`/ligas/${slug}?register=forbidden`)

      const memberUserIds = new Set(membersSnapshot.docs.map((doc: any) => doc.data().user_id))

      // Gather matching allowed cars in league
      const allowedCarsSnapshot = await db
        .collection('league_cars')
        .where('league_id', '==', league.id)
        .where('is_active', '==', true)
        .get()
      const allowedCars = allowedCarsSnapshot.docs.map((doc: any) => doc.data())

      const leagueClassTags = Array.isArray(league.classTags) ? league.classTags : []
      const teamCars = Array.isArray(team?.cars) ? team.cars : []

      // Automatically identify categories to register
      let categoriesToRegister: {
        classTag: string
        carNumber: number
        carModel: string | null
        driverUserIds: string[]
      }[] = []

      const matchingCars = teamCars.filter((car: any) => {
        if (!car.category) return false
        const c1 = car.category.toUpperCase()
        return leagueClassTags.some((tag: any) => {
          const c2 = tag.toUpperCase()
          return c1 === c2 || (c1.startsWith('LMP') && c2.startsWith('LMP'))
        })
      })

      if (matchingCars.length > 0) {
        for (const car of matchingCars) {
          const catUpper = car.category.toUpperCase()
          const matchedLeagueClass = leagueClassTags.find(tag => {
            const t = tag.toUpperCase()
            return t === catUpper || (t.startsWith('LMP') && catUpper.startsWith('LMP'))
          }) || catUpper
          const allowedForCategory = allowedCars.find((ac: any) => {
            const classUpper = ac.class_tag?.toUpperCase()
            return classUpper === catUpper || (classUpper?.startsWith('LMP') && catUpper.startsWith('LMP'))
          })
          const matchedModel = allowedForCategory ? allowedForCategory.model : carModel || null
          const carDrivers = (Array.isArray(car.driverUserIds) ? car.driverUserIds.filter(Boolean) : [])
            .filter((id: string) => memberUserIds.has(id))

          // Enrol using the specific car drivers, or fallback to all team members so the whole team gets registered!
          const finalDrivers = carDrivers.length > 0 ? carDrivers : Array.from(memberUserIds)

          if (finalDrivers.length > 0) {
            categoriesToRegister.push({
              classTag: matchedLeagueClass,
              carNumber: Number(car.dorsal || parsedCarNumber || '12'),
              carModel: matchedModel,
              driverUserIds: finalDrivers
            })
          }
        }
      }

      // If no matching cars are found in the team profile, fallback to auto-registering ALL categories of the league using all team members
      if (categoriesToRegister.length === 0) {
        const teamDrivers = Array.from(memberUserIds).map((id: any) => String(id))
        if (teamDrivers.length > 0) {
          for (const leagueClass of leagueClassTags) {
            const catUpper = leagueClass.toUpperCase()
            const allowedForCategory = allowedCars.find((ac: any) => {
              const classUpper = ac.class_tag?.toUpperCase()
              return classUpper === catUpper || (classUpper?.startsWith('LMP') && catUpper.startsWith('LMP'))
            })
            const matchedModel = allowedForCategory ? allowedForCategory.model : null
            categoriesToRegister.push({
              classTag: leagueClass,
              carNumber: parsedCarNumber || 12,
              carModel: matchedModel,
              driverUserIds: teamDrivers
            })
          }
        }
      }

      // If we still have absolutely zero categories (e.g. no team members or empty), fallback to a basic placeholder using session user
      if (categoriesToRegister.length === 0) {
        categoriesToRegister.push({
          classTag: classTag || 'GENERAL',
          carNumber: parsedCarNumber || 12,
          carModel: carModel || null,
          driverUserIds: [session.userId]
        })
      }

      // Check if any of the drivers are already registered in the league elsewhere
      const allDriversToRegister = Array.from(new Set(categoriesToRegister.flatMap(c => c.driverUserIds)))
      if (allDriversToRegister.length > 0) {
        const existingDriversSnapshot = await db
          .collection('league_registrations')
          .where('league_id', '==', league.id)
          .where('user_id', 'in', allDriversToRegister)
          .get()

        const activeDrivers = existingDriversSnapshot.docs
          .map((doc: any) => doc.data())
          .filter((r: any) => r.status !== 'rejected' && r.team_id !== teamId)
        
        if (activeDrivers.length > 0) {
          redirect(`/ligas/${slug}?register=driver-already-assigned`)
        }
      }

      // Also automatically synchronize/update team's garage/profile with any missing categories allowed in the league
      const currentClassTags = Array.isArray(team?.class_tags) ? team.class_tags : []
      const updatedClassTags = Array.from(new Set([...currentClassTags, ...leagueClassTags].map(t => t.toUpperCase())))
      const updatedCars = [...teamCars]

      for (const category of leagueClassTags) {
        const catUpper = category.toUpperCase()
        const hasCarForCategory = updatedCars.some(car => car.category?.toUpperCase() === catUpper)
        if (!hasCarForCategory) {
          const allowedForCategory = allowedCars.find((ac: any) => ac.class_tag?.toUpperCase() === catUpper)
          updatedCars.push({
            id: `car_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            category: catUpper as any,
            dorsal: String(parsedCarNumber || '12'),
            skinUrl: '',
            driverUserIds: classTag && catUpper === classTag.toUpperCase() ? [...selectedDrivers, '', '', ''].slice(0, 4) : ['', '', '', '']
          })
        }
      }

      // Save updated team in Firestore
      await db.collection('teams').doc(teamId).update({
        class_tags: updatedClassTags,
        cars: updatedCars
      })

      // Update mock_teams cookie for local simulation and quick UI updates
      try {
        const { cookies } = await import('next/headers')
        const cookieStore = await cookies()
        const existing = cookieStore.get('mock_teams')?.value
        if (existing) {
          let current = JSON.parse(existing)
          current = current.map((t: any) => {
            if (t.id === teamId) {
              return {
                ...t,
                classTags: updatedClassTags,
                cars: updatedCars,
              }
            }
            return t
          })
          cookieStore.set('mock_teams', JSON.stringify(current), { path: '/', maxAge: 60 * 60 * 24 * 30 })
        }
      } catch {}

      revalidatePath('/equipos')
      revalidatePath(`/equipos/${teamId}`)

      // Perform the team registration for each category
      for (const catToReg of categoriesToRegister) {
        const currentClassTag = catToReg.classTag
        const currentCarNumber = catToReg.carNumber
        const currentCarModel = catToReg.carModel
        const currentDrivers = catToReg.driverUserIds

        const teamRegId = `${league.id}_${teamId}_${currentClassTag || 'noclass'}_${currentCarNumber}`
        await db.collection('league_team_registrations').doc(teamRegId).set({
          league_id: league.id,
          team_id: teamId,
          class_tag: currentClassTag,
          car_number: currentCarNumber,
          car_model: currentCarModel || null,
          status: 'pending',
          created_by_user_id: session.userId,
          created_at: new Date(),
        })

        const insertedDrivers = []
        for (const driverUserId of currentDrivers) {
          const result = await upsertLeagueRegistration({
            db,
            leagueId: league.id,
            userId: driverUserId,
            teamId,
            classTag: currentClassTag,
            desiredNumber: currentCarNumber,
          })
          if (!result.ok) {
            if (result.reason === 'number-taken') redirect(`/ligas/${slug}?register=number-taken`)
            redirect(`/ligas/${slug}?register=error`)
          }
          insertedDrivers.push({ userId: driverUserId, assignedNumber: result.assignedNumber })
        }

        // Delete existing mapped drivers for this registration
        const mappedSnapshot = await db.collection('league_team_registration_drivers').where('team_registration_id', '==', teamRegId).get()
        const deleteBatch = db.batch()
        mappedSnapshot.docs.forEach((doc: any) => deleteBatch.delete(doc.ref))
        await deleteBatch.commit()

        // Write drivers mapping
        const insertBatch = db.batch()
        insertedDrivers.forEach((item) => {
          const docRef = db.collection('league_team_registration_drivers').doc(`${teamRegId}_${item.userId}`)
          insertBatch.set(docRef, {
            team_registration_id: teamRegId,
            user_id: item.userId,
            assigned_number: item.assignedNumber,
          })
        })
        await insertBatch.commit()
      }
    } catch (e) {
      console.error(e)
      redirect(`/ligas/${slug}?register=error`)
    }

    redirect(`/ligas/${slug}?register=team-success`)
  }

  // Individual registration check
  try {
    const existingDoc = await db.collection('league_registrations').doc(`${league.id}_${session.userId}`).get()
    if (existingDoc.exists && existingDoc.data()?.status !== 'rejected') {
      redirect(`/ligas/${slug}?register=exists`)
    }

    const representedTeamId = String(formData.get('representedTeamId') || '').trim()
    const parsedDesiredNumber = parseDesiredNumber(formData.get('desiredNumber'))
    if (parsedDesiredNumber === -1) redirect(`/ligas/${slug}?register=number-invalid`)

    let finalTeamId: string | null = null
    if (representedTeamId) {
      const teamDoc = await db.collection('teams').doc(representedTeamId).get()
      const memberDoc = await db.collection('team_members').doc(`${representedTeamId}_${session.userId}`).get()

      const isMember = teamDoc.data()?.owner_user_id === session.userId || memberDoc.exists
      if (!isMember) redirect(`/ligas/${slug}?register=forbidden`)
      finalTeamId = teamDoc.id || null
    }

    const result = await upsertLeagueRegistration({
      db,
      leagueId: league.id,
      userId: session.userId,
      teamId: finalTeamId,
      classTag,
      desiredNumber: parsedDesiredNumber,
    })

    if (!result.ok) {
      if (result.reason === 'number-taken') redirect(`/ligas/${slug}?register=number-taken`)
      redirect(`/ligas/${slug}?register=error`)
    }
  } catch (e) {
    console.error(e)
    redirect(`/ligas/${slug}?register=error`)
  }

  redirect(`/ligas/${slug}?register=success`)
}

export async function unregisterFromLeague(formData: FormData) {
  const slug = String(formData.get('slug') || '')
  const registrationId = String(formData.get('registrationId') || '').trim()
  const teamCarKey = String(formData.get('teamCarKey') || '').trim()
  const parsedTeamCar = teamCarKey.split('||')
  const teamId = parsedTeamCar.length === 3 ? parsedTeamCar[0] : String(formData.get('teamId') || '').trim()
  const classTagRaw = parsedTeamCar.length === 3 ? parsedTeamCar[1] : String(formData.get('classTag') || '').trim()
  const classTag = classTagRaw === '__NULL__' ? null : classTagRaw
  const carNumberRaw = parsedTeamCar.length === 3 ? parsedTeamCar[2] : String(formData.get('carNumber') || '').trim()
  
  const league = await getLeagueBySlug(slug)
  const session = await getCurrentUser()
  if (!league) redirect('/ligas')
  if (!session) redirect(`/ligas/${slug}?register=login`)

  if (!hasFirebase) redirect(`/ligas/${slug}?register=mock`)
  const db = getFirestoreDb()
  if (!db) redirect(`/ligas/${slug}?register=mock`)

  try {
    if (teamId && carNumberRaw) {
      const carNumber = Number(carNumberRaw)
      if (!Number.isInteger(carNumber)) redirect(`/ligas/${slug}?register=error`)

      const teamDoc = await db.collection('teams').doc(teamId).get()
      const memberDoc = await db.collection('team_members').doc(`${teamId}_${session.userId}`).get()

      const canManageCar = teamDoc.data()?.owner_user_id === session.userId || memberDoc.data()?.role === 'owner' || memberDoc.data()?.role === 'manager'
      if (!canManageCar) redirect(`/ligas/${slug}?register=forbidden`)

      // Delete registrations
      let snapshot = await db
        .collection('league_registrations')
        .where('league_id', '==', league.id)
        .where('team_id', '==', teamId)
        .where('assigned_number', '==', carNumber)
        .get()

      let filteredDocs = snapshot.docs
      if (classTag) {
        filteredDocs = filteredDocs.filter((doc: any) => doc.data().class_tag === classTag)
      } else {
        filteredDocs = filteredDocs.filter((doc: any) => !doc.data().class_tag)
      }

      const batch = db.batch()
      filteredDocs.forEach((doc: any) => batch.delete(doc.ref))
      await batch.commit()

      // Delete team registrations
      let teamSnapshot = await db
        .collection('league_team_registrations')
        .where('league_id', '==', league.id)
        .where('team_id', '==', teamId)
        .where('car_number', '==', carNumber)
        .get()

      let filteredTeamDocs = teamSnapshot.docs
      if (classTag) {
        filteredTeamDocs = filteredTeamDocs.filter((doc: any) => doc.data().class_tag === classTag)
      } else {
        filteredTeamDocs = filteredTeamDocs.filter((doc: any) => !doc.data().class_tag)
      }

      const teamBatch = db.batch()
      filteredTeamDocs.forEach((doc: any) => teamBatch.delete(doc.ref))
      await teamBatch.commit()
    } else if (registrationId) {
      const doc = await db.collection('league_registrations').doc(registrationId).get()
      if (!doc.exists || doc.data()?.league_id !== league.id) {
        // Try absolute ID or fallback
        const altDoc = await db.collection('league_registrations').doc(`${league.id}_${session.userId}`).get()
        if (!altDoc.exists) redirect(`/ligas/${slug}?register=error`)
      }

      const targetRegistration = doc.exists ? doc.data() : null
      const resolvedId = doc.exists ? doc.id : `${league.id}_${session.userId}`
      const resolvedUserId = targetRegistration ? targetRegistration.user_id : session.userId
      const resolvedTeamId = targetRegistration ? targetRegistration.team_id : null
      const resolvedClassTag = targetRegistration ? targetRegistration.class_tag : null
      const resolvedAssignedNumber = targetRegistration ? targetRegistration.assigned_number : null

      let canRemove = resolvedUserId === session.userId
      if (!canRemove && resolvedTeamId) {
        const teamDoc = await db.collection('teams').doc(resolvedTeamId).get()
        const memberDoc = await db.collection('team_members').doc(`${resolvedTeamId}_${session.userId}`).get()
        canRemove = teamDoc.data()?.owner_user_id === session.userId || memberDoc.data()?.role === 'owner' || memberDoc.data()?.role === 'manager'
      }

      if (!canRemove) redirect(`/ligas/${slug}?register=forbidden`)

      await db.collection('league_registrations').doc(resolvedId).delete()

      if (resolvedTeamId) {
        const teamRegSnapshot = await db
          .collection('league_team_registrations')
          .where('league_id', '==', league.id)
          .where('team_id', '==', resolvedTeamId)
          .where('class_tag', '==', resolvedClassTag)
          .where('car_number', '==', resolvedAssignedNumber)
          .limit(1)
          .get()

        if (!teamRegSnapshot.empty) {
          const teamRegDoc = teamRegSnapshot.docs[0]
          await db.collection('league_team_registration_drivers').doc(`${teamRegDoc.id}_${resolvedUserId}`).delete()

          const remainingDrivers = await db
            .collection('league_team_registration_drivers')
            .where('team_registration_id', '==', teamRegDoc.id)
            .limit(1)
            .get()

          if (remainingDrivers.empty) {
            await teamRegDoc.ref.delete()
          }
        }
      }
    } else {
      // General withdrawal
      await db.collection('league_registrations').doc(`${league.id}_${session.userId}`).delete()

      const teamRegsSnapshot = await db
        .collection('league_team_registrations')
        .where('league_id', '==', league.id)
        .get()

      const teamRegistrationIds = teamRegsSnapshot.docs.map((doc: any) => doc.id)
      if (teamRegistrationIds.length > 0) {
        const batch = db.batch()
        for (const regId of teamRegistrationIds) {
          batch.delete(db.collection('league_team_registration_drivers').doc(`${regId}_${session.userId}`))
        }
        await batch.commit()
      }
    }
  } catch (e) {
    console.error(e)
    redirect(`/ligas/${slug}?register=error`)
  }

  redirect(`/ligas/${slug}?register=withdrawn`)
}
