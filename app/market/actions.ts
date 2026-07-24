'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { getFirestoreDb, hasFirebase, runWithTimeout } from '@/lib/firebase'
import { getTeamsDashboard } from '@/lib/team-data'

export async function createMarketListing(formData: FormData) {
  const session = await getCurrentUser()
  if (!session) throw new Error('Unauthorized')

  const type = String(formData.get('type') || 'team_seeking_driver') as 'team_seeking_driver' | 'driver_seeking_team'
  const title = String(formData.get('title') || '').trim()
  const description = String(formData.get('description') || '').trim()
  const mainSim = String(formData.get('mainSim') || 'ac') as 'ac' | 'lmu'
  const classTag = String(formData.get('classTag') || 'ALL').trim().toUpperCase()
  const contactInfo = String(formData.get('contactInfo') || '').trim()
  const teamId = formData.get('teamId') ? String(formData.get('teamId')) : null

  if (!title || !description || !contactInfo) {
    throw new Error('Missing fields')
  }

  // Check if they are already in a team when seeking a team
  if (type === 'driver_seeking_team') {
    const dashboard = await getTeamsDashboard(session.userId)
    const isAlreadyInTeam = dashboard.teams.some((team: any) =>
      team.ownerUserId === session.userId ||
      (Array.isArray(team.members) && team.members.some((m: any) => m.userId === session.userId))
    )
    if (isAlreadyInTeam) {
      throw new Error('No puedes anunciarte como piloto si ya perteneces a un equipo.')
    }
  }

  // Load user name and avatar
  let userName = session.steamDisplayName || 'Driver'
  let userAvatar = session.avatarUrl || null
  let teamName = ''
  let teamLogo = ''

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        const userDoc = await runWithTimeout(db.collection('profiles').doc(session.userId).get())
        if (userDoc.exists) {
          userName = userDoc.data()?.display_name || userName
          userAvatar = userDoc.data()?.avatar_url || userAvatar
        }

        if (type === 'team_seeking_driver' && teamId) {
          const teamDoc = await runWithTimeout(db.collection('teams').doc(teamId).get())
          if (teamDoc.exists) {
            teamName = teamDoc.data()?.name || ''
            teamLogo = teamDoc.data()?.logo_url || ''
          }

          // Delete any existing market listings for same team
          const oldSnap = await runWithTimeout(db.collection('market_listings')
            .where('team_id', '==', teamId)
            .get())
          if (!oldSnap.empty) {
            const deleteBatch = db.batch()
            let count = 0
            oldSnap.docs.forEach((doc: any) => {
              const d = doc.data()
              if (d.type === 'team_seeking_driver') {
                deleteBatch.delete(doc.ref)
                count++
              }
            })
            if (count > 0) {
              await runWithTimeout(deleteBatch.commit())
            }
          }
        } else if (type === 'driver_seeking_team') {
          // Delete any existing driver market listings for this user to avoid duplicates and bump to top
          const oldSnap = await runWithTimeout(db.collection('market_listings')
            .where('user_id', '==', session.userId)
            .get())
          if (!oldSnap.empty) {
            const deleteBatch = db.batch()
            let count = 0
            oldSnap.docs.forEach((doc: any) => {
              const d = doc.data()
              if (d.type === 'driver_seeking_team') {
                deleteBatch.delete(doc.ref)
                count++
              }
            })
            if (count > 0) {
              await runWithTimeout(deleteBatch.commit())
            }
          }
        }

        const docRef = db.collection('market_listings').doc()
        await runWithTimeout(docRef.set({
          id: docRef.id,
          type,
          user_id: session.userId,
          user_name: userName,
          user_avatar: userAvatar,
          team_id: teamId,
          team_name: teamName,
          team_logo: teamLogo,
          title,
          description,
          main_sim: mainSim,
          class_tag: classTag,
          contact_info: contactInfo,
          created_at: new Date(),
        }))

        revalidatePath('/market')
        return
      } catch (err) {
        console.error('Failed to create market listing in Firestore:', err)
        throw err
      }
    }
  }

  if (hasFirebase) return

  // Mock Mode Fallback (runs if !hasFirebase OR db is null OR firestore operation failed/timed out)
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const existing = cookieStore.get('mock_market_listings')?.value
    let listings = existing ? JSON.parse(existing) : []

    if (type === 'team_seeking_driver' && teamId) {
      // Fallback team name
      teamName = `Mock Team ${teamId.slice(0, 4).toUpperCase()}`
      // Remove existing listings for same team
      listings = listings.filter((l: any) => !(l.team_id === teamId && l.type === 'team_seeking_driver'))
    } else if (type === 'driver_seeking_team') {
      listings = listings.filter((l: any) => !(l.user_id === session.userId && l.type === 'driver_seeking_team'))
    }

    const newListing = {
      id: `mock_${Date.now()}`,
      type,
      user_id: session.userId,
      user_name: userName,
      user_avatar: userAvatar,
      team_id: teamId,
      team_name: teamName,
      team_logo: teamLogo,
      title,
      description,
      main_sim: mainSim,
      class_tag: classTag,
      contact_info: contactInfo,
      created_at: new Date().toISOString(),
    }

    listings.push(newListing)
    cookieStore.set('mock_market_listings', JSON.stringify(listings), {
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
  } catch (e) {
    console.error(e)
  }

  revalidatePath('/market')
}

export async function deleteMarketListing(listingId: string) {
  const session = await getCurrentUser()
  if (!session) throw new Error('Unauthorized')

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        const doc = await runWithTimeout(db.collection('market_listings').doc(listingId).get())
        if (doc.exists && doc.data()?.user_id === session.userId) {
          await runWithTimeout(doc.ref.delete())
        }
        revalidatePath('/market')
        return
      } catch (err) {
        console.error('Failed to delete market listing from Firestore:', err)
        throw err
      }
    }
  }

  if (hasFirebase) return

  // Mock Mode Fallback
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const existing = cookieStore.get('mock_market_listings')?.value
    if (existing) {
      let listings = JSON.parse(existing)
      listings = listings.filter((item: any) => !(item.id === listingId && item.user_id === session.userId))
      cookieStore.set('mock_market_listings', JSON.stringify(listings), {
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      })
    }
  } catch (e) {
    console.error(e)
  }

  revalidatePath('/market')
}

export async function applyToTeamListingAction(listingId: string, message?: string) {
  const session = await getCurrentUser()
  if (!session) throw new Error('Unauthorized')

  // Check if they are already in a team
  const dashboard = await getTeamsDashboard(session.userId)
  const isAlreadyInTeam = dashboard.teams.some((team: any) =>
    team.ownerUserId === session.userId ||
    (Array.isArray(team.members) && team.members.some((m: any) => m.userId === session.userId))
  )
  if (isAlreadyInTeam) {
    throw new Error('No puedes postularte a un equipo si ya perteneces a uno.')
  }

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        // Check if already applied - single field query to avoid index requirement, filtered in memory
        const existingSnap = await runWithTimeout(db.collection('market_applications')
          .where('listing_id', '==', listingId)
          .get())
        const alreadyApplied = existingSnap.docs.some((doc: any) => doc.data()?.user_id === session.userId)
        if (alreadyApplied) return

        const listingDoc = await runWithTimeout(db.collection('market_listings').doc(listingId).get())
        if (!listingDoc.exists) throw new Error('Listing not found')

        const profileDoc = await runWithTimeout(db.collection('profiles').doc(session.userId).get())
        const profileData = profileDoc.exists ? profileDoc.data() : null
        const userName = profileData?.display_name || session.steamDisplayName || 'Driver'
        const userAvatar = profileData?.avatar_url || session.avatarUrl || null

        const docRef = db.collection('market_applications').doc()
        await runWithTimeout(docRef.set({
          id: docRef.id,
          listing_id: listingId,
          team_id: listingDoc.data()?.team_id || null,
          user_id: session.userId,
          user_name: userName,
          user_avatar: userAvatar,
          contact_info: 'Discord / Steam Profile',
          status: 'pending',
          message: message || '',
          created_at: new Date(),
        }))

        // Send notification ONLY to team leader/owner
        const teamIdVal = listingDoc.data()?.team_id
        if (teamIdVal) {
          const teamDoc = await runWithTimeout(db.collection('teams').doc(teamIdVal).get())
          const leaderId = teamDoc.exists ? teamDoc.data()?.owner_user_id : listingDoc.data()?.user_id
          if (leaderId) {
            const notifRef = db.collection('notifications').doc()
            await runWithTimeout(notifRef.set({
              id: notifRef.id,
              user_id: leaderId,
              type: 'market_application',
              title: 'Nueva postulación de piloto',
              message: `El piloto ${userName} se ha postulado para unirse a ${teamDoc.data()?.name || 'tu equipo'}.`,
              link: '/equipos',
              read: false,
              created_at: new Date(),
            }))
          }
        }
        revalidatePath('/market')
        return
      } catch (err) {
        console.error('Failed to apply to team listing in Firestore:', err)
        throw err
      }
    }
  }

  if (hasFirebase) return

  // Mock Mode Fallback
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const existingApps = cookieStore.get('mock_market_applications')?.value
    const apps = existingApps ? JSON.parse(existingApps) : []

    const already = apps.some((a: any) => a.listingId === listingId && a.userId === session.userId)
    if (already) return

    const listingsVal = cookieStore.get('mock_market_listings')?.value
    const listings = listingsVal ? JSON.parse(listingsVal) : []
    const listing = listings.find((l: any) => l.id === listingId)

    const newApp = {
      id: `mock_app_${Date.now()}`,
      listingId,
      teamId: listing?.team_id || null,
      userId: session.userId,
      userName: session.steamDisplayName || 'Driver',
      userAvatar: session.avatarUrl || null,
      contactInfo: 'Discord / Steam Profile',
      status: 'pending',
      message: message || '',
      createdAt: new Date().toISOString(),
    }
    apps.push(newApp)
    cookieStore.set('mock_market_applications', JSON.stringify(apps), {
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
  } catch (e) {
    console.error(e)
  }

  revalidatePath('/market')
}

export async function hireDriverFromApplicationAction(applicationId: string) {
  const session = await getCurrentUser()
  if (!session) throw new Error('Unauthorized')

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        const appRef = db.collection('market_applications').doc(applicationId)
        const appDoc = await runWithTimeout(appRef.get())
        if (!appDoc.exists) throw new Error('Application not found')
        const appData = appDoc.data()
        const hiredUserId = appData?.user_id

        // Check if user is owner of the team
        const teamDoc = await runWithTimeout(db.collection('teams').doc(appData?.team_id).get())
        if (!teamDoc.exists || teamDoc.data()?.owner_user_id !== session.userId) {
          throw new Error('Not authorized to hire for this team')
        }

        // Add to team_members
        await runWithTimeout(db.collection('team_members').doc(`${appData?.team_id}_${hiredUserId}`).set({
          team_id: appData?.team_id,
          user_id: hiredUserId,
          role: 'driver',
          created_at: new Date(),
        }))

        // Update application status
        await runWithTimeout(appRef.update({ status: 'accepted' }))

        // Cleanup: Delete hired driver's listings from market
        const listingsSnap = await runWithTimeout(db.collection('market_listings').where('user_id', '==', hiredUserId).get())
        const batch = db.batch()
        listingsSnap.docs.forEach((doc: any) => batch.delete(doc.ref))

        // Cleanup: Delete pending applications of the driver
        const appsSnap = await runWithTimeout(db.collection('market_applications')
          .where('user_id', '==', hiredUserId)
          .get())
        appsSnap.docs.forEach((doc: any) => {
          if (doc.data()?.status === 'pending') {
            batch.delete(doc.ref)
          }
        })

        // Cleanup: Delete pending invites of the driver
        const invitesSnap = await runWithTimeout(db.collection('team_invites')
          .where('invited_user_id', '==', hiredUserId)
          .get())
        invitesSnap.docs.forEach((doc: any) => {
          if (doc.data()?.status === 'pending') {
            batch.delete(doc.ref)
          }
        })

        await runWithTimeout(batch.commit())
        revalidatePath('/market')
        revalidatePath('/equipos')
        return
      } catch (err) {
        console.error('Failed to hire driver in Firestore:', err)
        throw err
      }
    }
  }

  if (hasFirebase) return

  // Mock Mode Fallback
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()

    const appsVal = cookieStore.get('mock_market_applications')?.value
    let apps = appsVal ? JSON.parse(appsVal) : []
    const appIdx = apps.findIndex((a: any) => a.id === applicationId)
    if (appIdx === -1) throw new Error('Application not found')

    const appData = apps[appIdx]
    const hiredUserId = appData.userId

    // Add to mock teams
    const teamsVal = cookieStore.get('mock_teams')?.value
    const teams = teamsVal ? JSON.parse(teamsVal) : []
    const teamIdx = teams.findIndex((t: any) => t.id === appData.teamId)

    if (teamIdx !== -1) {
      const team = teams[teamIdx]
      if (!team.members) team.members = []
      // Avoid duplicate members
      if (!team.members.some((m: any) => m.userId === hiredUserId)) {
        team.members.push({
          id: `member_${team.id}_${hiredUserId}`,
          teamId: team.id,
          userId: hiredUserId,
          role: 'driver',
          createdAt: new Date().toISOString(),
          displayName: appData.userName,
          steamId: hiredUserId.replace('steam_', ''),
        })
      }
      cookieStore.set('mock_teams', JSON.stringify(teams), { path: '/', maxAge: 60 * 60 * 24 * 30 })
    }

    // Update app status to accepted
    apps[appIdx].status = 'accepted'

    // Filter out pending apps of same hired user (except this accepted one)
    apps = apps.filter((a: any) => a.id === applicationId || !(a.userId === hiredUserId && a.status === 'pending'))
    cookieStore.set('mock_market_applications', JSON.stringify(apps), { path: '/', maxAge: 60 * 60 * 24 * 7 })

    // Cleanup mock listings of hired user
    const listingsVal = cookieStore.get('mock_market_listings')?.value
    if (listingsVal) {
      let listings = JSON.parse(listingsVal)
      listings = listings.filter((l: any) => l.user_id !== hiredUserId)
      cookieStore.set('mock_market_listings', JSON.stringify(listings), { path: '/', maxAge: 60 * 60 * 24 * 7 })
    }

    // Cleanup mock invites of hired user
    const invitesVal = cookieStore.get('mock_market_invites')?.value
    if (invitesVal) {
      let invites = JSON.parse(invitesVal)
      invites = invites.filter((i: any) => !(i.invitedUserId === hiredUserId && i.status === 'pending'))
      cookieStore.set('mock_market_invites', JSON.stringify(invites), { path: '/', maxAge: 60 * 60 * 24 * 7 })
    }
  } catch (e) {
    console.error(e)
  }

  revalidatePath('/market')
  revalidatePath('/equipos')
}

export async function declineApplicationAction(applicationId: string) {
  const session = await getCurrentUser()
  if (!session) throw new Error('Unauthorized')

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        const appRef = db.collection('market_applications').doc(applicationId)
        const appDoc = await runWithTimeout(appRef.get())
        if (!appDoc.exists) throw new Error('Application not found')
        const appData = appDoc.data()

        // Check if user is owner of the team
        const teamDoc = await runWithTimeout(db.collection('teams').doc(appData?.team_id).get())
        if (!teamDoc.exists || teamDoc.data()?.owner_user_id !== session.userId) {
          throw new Error('Not authorized')
        }

        await runWithTimeout(appRef.update({ status: 'declined' }))
        revalidatePath('/market')
        return
      } catch (err) {
        console.error('Failed to decline application in Firestore:', err)
        throw err
      }
    }
  }

  if (hasFirebase) return

  // Mock Mode Fallback
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()

    const appsVal = cookieStore.get('mock_market_applications')?.value
    const apps = appsVal ? JSON.parse(appsVal) : []
    const appIdx = apps.findIndex((a: any) => a.id === applicationId)
    if (appIdx !== -1) {
      apps[appIdx].status = 'declined'
      cookieStore.set('mock_market_applications', JSON.stringify(apps), {
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      })
    }
  } catch (e) {
    console.error(e)
  }

  revalidatePath('/market')
}

export async function inviteDriverFromListingAction(driverListingId: string, teamId: string, customMessage?: string) {
  const session = await getCurrentUser()
  if (!session) throw new Error('Unauthorized')

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        const listingDoc = await runWithTimeout(db.collection('market_listings').doc(driverListingId).get())
        if (!listingDoc.exists) throw new Error('Listing not found')
        const listingData = listingDoc.data()

        // Verify that user is owner of the team
        const teamDoc = await runWithTimeout(db.collection('teams').doc(teamId).get())
        if (!teamDoc.exists || teamDoc.data()?.owner_user_id !== session.userId) {
          throw new Error('Not authorized')
        }

        // Check if already invited in team_invites (single field query filtered in memory)
        const existingSnap = await runWithTimeout(db.collection('team_invites')
          .where('team_id', '==', teamId)
          .get())
        const alreadyInvited = existingSnap.docs.some((doc: any) => {
          const d = doc.data()
          return d?.invited_user_id === listingData?.user_id && d?.status === 'pending'
        })
        if (alreadyInvited) return

        const docRef = db.collection('team_invites').doc()
        await runWithTimeout(docRef.set({
          id: docRef.id,
          team_id: teamId,
          invited_by_user_id: session.userId,
          invited_user_id: listingData?.user_id,
          invited_steam_id: '',
          message: customMessage || 'Oferta de incorporación desde Driver Market',
          status: 'pending',
          created_at: new Date(),
          listing_id: driverListingId,
        }))

        // Send notification to invited driver
        if (listingData?.user_id) {
          const notifRef = db.collection('notifications').doc()
          await runWithTimeout(notifRef.set({
            id: notifRef.id,
            user_id: listingData.user_id,
            type: 'team_invite',
            title: 'Invitación de equipo',
            message: `El equipo ${teamDoc.data()?.name || 'un equipo'} te ha enviado una invitación: "${customMessage || 'Únete a nuestro equipo para los próximos campeonatos.'}"`,
            link: '/perfil',
            read: false,
            created_at: new Date(),
          }))
        }
        revalidatePath('/market')
        return
      } catch (err) {
        console.error('Failed to invite driver in Firestore:', err)
        throw err
      }
    }
  }

  if (hasFirebase) return

  // Mock Mode Fallback
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()

    const listingVal = cookieStore.get('mock_market_listings')?.value
    const listings = listingVal ? JSON.parse(listingVal) : []
    const listing = listings.find((l: any) => l.id === driverListingId)
    if (!listing) throw new Error('Listing not found')

    const invitesVal = cookieStore.get('mock_market_invites')?.value
    const invites = invitesVal ? JSON.parse(invitesVal) : []

    const already = invites.some((i: any) => i.listingId === driverListingId && i.teamId === teamId)
    if (already) return

    const teamsVal = cookieStore.get('mock_teams')?.value
    const teams = teamsVal ? JSON.parse(teamsVal) : []
    const team = teams.find((t: any) => t.id === teamId)

    const newInvite = {
      id: `mock_inv_${Date.now()}`,
      listingId: driverListingId,
      teamId,
      teamName: team?.name || 'Team',
      teamLogo: cookieStore.get(`mock_team_logo_${teamId}`)?.value || team?.logoUrl || null,
      invitedUserId: listing.user_id,
      invitedByUserId: session.userId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }

    invites.push(newInvite)
    cookieStore.set('mock_market_invites', JSON.stringify(invites), {
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
  } catch (e) {
    console.error(e)
  }

  revalidatePath('/market')
}

export async function acceptInviteFromMarketAction(inviteId: string) {
  const session = await getCurrentUser()
  if (!session) throw new Error('Unauthorized')

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        const inviteRef = db.collection('team_invites').doc(inviteId)
        const inviteDoc = await runWithTimeout(inviteRef.get())
        if (!inviteDoc.exists) throw new Error('Invite not found')
        const inviteData = inviteDoc.data()

        if (inviteData?.invited_user_id !== session.userId) {
          throw new Error('Not authorized')
        }

        // Add to team_members
        await runWithTimeout(db.collection('team_members').doc(`${inviteData?.team_id}_${session.userId}`).set({
          team_id: inviteData?.team_id,
          user_id: session.userId,
          role: 'driver',
          created_at: new Date(),
        }))

        await runWithTimeout(inviteRef.update({ status: 'accepted' }))

        // Cleanup: Delete driver's market listings
        const listingsSnap = await runWithTimeout(db.collection('market_listings').where('user_id', '==', session.userId).get())
        const batch = db.batch()
        listingsSnap.docs.forEach((doc: any) => batch.delete(doc.ref))

        // Cleanup: Delete pending applications of the driver
        const appsSnap = await runWithTimeout(db.collection('market_applications')
          .where('user_id', '==', session.userId)
          .get())
        appsSnap.docs.forEach((doc: any) => {
          if (doc.data()?.status === 'pending') {
            batch.delete(doc.ref)
          }
        })

        // Cleanup: Delete pending invites of the driver (excluding the current accepted one)
        const invitesSnap = await runWithTimeout(db.collection('team_invites')
          .where('invited_user_id', '==', session.userId)
          .get())
        invitesSnap.docs.forEach((doc: any) => {
          if (doc.data()?.status === 'pending' && doc.id !== inviteId) {
            batch.delete(doc.ref)
          }
        })

        await runWithTimeout(batch.commit())
        revalidatePath('/market')
        revalidatePath('/equipos')
        return
      } catch (err) {
        console.error('Failed to accept invite in Firestore:', err)
        throw err
      }
    }
  }

  if (hasFirebase) return

  // Mock Mode Fallback
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()

    let invitesVal = cookieStore.get('mock_market_invites')?.value
    let invites = invitesVal ? JSON.parse(invitesVal) : []
    const inviteIdx = invites.findIndex((i: any) => i.id === inviteId)
    if (inviteIdx === -1) throw new Error('Invite not found')

    const inviteData = invites[inviteIdx]
    if (inviteData.invitedUserId !== session.userId) throw new Error('Unauthorized')

    // Add to team_members
    const teamsVal = cookieStore.get('mock_teams')?.value
    const teams = teamsVal ? JSON.parse(teamsVal) : []
    const teamIdx = teams.findIndex((t: any) => t.id === inviteData.teamId)

    if (teamIdx !== -1) {
      const team = teams[teamIdx]
      if (!team.members) team.members = []
      if (!team.members.some((m: any) => m.userId === session.userId)) {
        team.members.push({
          id: `member_${team.id}_${session.userId}`,
          teamId: team.id,
          userId: session.userId,
          role: 'driver',
          createdAt: new Date().toISOString(),
          displayName: session.steamDisplayName || 'Driver',
          steamId: session.userId.replace('steam_', ''),
        })
      }
      cookieStore.set('mock_teams', JSON.stringify(teams), { path: '/', maxAge: 60 * 60 * 24 * 30 })
    }

    // Update accepted invite status
    invites[inviteIdx].status = 'accepted'

    // Filter out pending mock invites of this driver (excluding this accepted one)
    invites = invites.filter((i: any) => i.id === inviteId || !(i.invitedUserId === session.userId && i.status === 'pending'))
    cookieStore.set('mock_market_invites', JSON.stringify(invites), { path: '/', maxAge: 60 * 60 * 24 * 7 })

    // Cleanup driver's mock applications
    const appsVal = cookieStore.get('mock_market_applications')?.value
    if (appsVal) {
      let apps = JSON.parse(appsVal)
      apps = apps.filter((a: any) => !(a.userId === session.userId && a.status === 'pending'))
      cookieStore.set('mock_market_applications', JSON.stringify(apps), { path: '/', maxAge: 60 * 60 * 24 * 7 })
    }

    // Cleanup driver's mock listings
    const listingsVal = cookieStore.get('mock_market_listings')?.value
    if (listingsVal) {
      let listings = JSON.parse(listingsVal)
      listings = listings.filter((l: any) => l.user_id !== session.userId)
      cookieStore.set('mock_market_listings', JSON.stringify(listings), { path: '/', maxAge: 60 * 60 * 24 * 7 })
    }
  } catch (e) {
    console.error(e)
  }

  revalidatePath('/market')
  revalidatePath('/equipos')
}

export async function declineInviteFromMarketAction(inviteId: string) {
  const session = await getCurrentUser()
  if (!session) throw new Error('Unauthorized')

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        const inviteRef = db.collection('team_invites').doc(inviteId)
        const inviteDoc = await runWithTimeout(inviteRef.get())
        if (!inviteDoc.exists) throw new Error('Invite not found')
        const inviteData = inviteDoc.data()

        if (inviteData?.invited_user_id !== session.userId) {
          throw new Error('Not authorized')
        }

        await runWithTimeout(inviteRef.update({ status: 'rejected' }))
        revalidatePath('/market')
        return
      } catch (err) {
        console.error('Failed to decline invite in Firestore:', err)
        throw err
      }
    }
  }

  if (hasFirebase) return

  // Mock Mode Fallback
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()

    const invitesVal = cookieStore.get('mock_market_invites')?.value
    const invites = invitesVal ? JSON.parse(invitesVal) : []
    const inviteIdx = invites.findIndex((i: any) => i.id === inviteId)
    if (inviteIdx !== -1) {
      invites[inviteIdx].status = 'rejected'
      cookieStore.set('mock_market_invites', JSON.stringify(invites), {
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      })
    }
  } catch (e) {
    console.error(e)
  }

  revalidatePath('/market')
}

export async function withdrawApplicationAction(listingId: string) {
  const session = await getCurrentUser()
  if (!session) throw new Error('Unauthorized')

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        const snap = await runWithTimeout(db.collection('market_applications')
          .where('listing_id', '==', listingId)
          .where('user_id', '==', session.userId)
          .get())
        
        for (const doc of snap.docs) {
          await runWithTimeout(doc.ref.delete())
        }
        revalidatePath('/market')
        return
      } catch (err) {
        console.error('Failed to withdraw application in Firestore:', err)
        throw err
      }
    }
  }

  if (hasFirebase) return

  // Mock Mode Fallback
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const existingApps = cookieStore.get('mock_market_applications')?.value
    let apps = existingApps ? JSON.parse(existingApps) : []

    apps = apps.filter((a: any) => !(a.listingId === listingId && a.userId === session.userId))

    cookieStore.set('mock_market_applications', JSON.stringify(apps), {
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
  } catch (err) {
    console.error('Failed to withdraw application in mock mode:', err)
  }

  revalidatePath('/market')
}
