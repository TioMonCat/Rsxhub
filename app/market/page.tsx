import { cookies } from 'next/headers'
import { getCurrentUser } from '@/lib/auth'
import { getTeamsDashboard } from '@/lib/team-data'
import { getFirestoreDb, hasFirebase, runWithTimeout } from '@/lib/firebase'
import MarketPageContent from './market-content'

function serializeDate(val: any): string {
  if (!val) return new Date().toISOString()
  if (typeof val.toDate === 'function') {
    try {
      return val.toDate().toISOString()
    } catch (e) {
      return new Date().toISOString()
    }
  }
  if (typeof val === 'string') {
    // Check if it is a valid date
    const d = new Date(val)
    if (!isNaN(d.getTime())) {
      return d.toISOString()
    }
    return new Date().toISOString()
  }
  if (typeof val === 'object') {
    if (typeof val._seconds === 'number') {
      return new Date(val._seconds * 1000).toISOString()
    }
    if (typeof val.seconds === 'number') {
      return new Date(val.seconds * 1000).toISOString()
    }
  }
  return new Date().toISOString()
}

export default async function MarketPage() {
  const session = await getCurrentUser()
  let listings: any[] = []
  let myTeams: any[] = []
  let firebaseSuccess = false

  // 1. Fetch Listings
  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        const teamsSnap = await runWithTimeout(db.collection('teams').get(), 3000)
        const teamsColors = new Map<string, string>()
        teamsSnap.docs.forEach((doc: any) => {
          const t = doc.data()
          teamsColors.set(doc.id, t.primary_color || null)
        })

        const snap = await runWithTimeout(db.collection('market_listings').orderBy('created_at', 'desc').get(), 3000)
        listings = snap.docs.map((doc: any) => {
          const data = doc.data()
          const createdAtVal = serializeDate(data.created_at)
          return {
            id: doc.id,
            type: data.type || 'team_seeking_driver',
            user_id: data.user_id || '',
            user_name: data.user_name || 'Driver',
            user_avatar: data.user_avatar || null,
            team_id: data.team_id || null,
            team_name: data.team_name || null,
            team_logo: data.team_logo || null,
            team_color: data.team_id ? teamsColors.get(data.team_id) || null : null,
            title: data.title || '',
            description: data.description || '',
            main_sim: data.main_sim || 'ac',
            class_tag: data.class_tag || 'ALL',
            contact_info: data.contact_info || '',
            created_at: createdAtVal,
          }
        })
        firebaseSuccess = true
      } catch (error) {
        console.error('Failed to get market listings from Firestore (falling back to mock mode):', error)
      }
    }
  }

  // Fallback to mock listings if firebase not used
  if (!hasFirebase) {
    // Mock Mode Fallback
    try {
      const cookieStore = await cookies()
      const mockListingsVal = cookieStore.get('mock_market_listings')?.value
      const mockTeamsVal = cookieStore.get('mock_teams')?.value
      const teamsColors = new Map<string, string>()

      if (mockTeamsVal) {
        const mockTeams = JSON.parse(mockTeamsVal)
        if (Array.isArray(mockTeams)) {
          mockTeams.forEach((t: any) => {
            teamsColors.set(t.id, t.primaryColor || null)
          })
        }
      }

      // Default fallback color for seed team t1 (Apex Racing Team) in mock mode is light blue (#1274de)
      if (!teamsColors.has('t1')) {
        teamsColors.set('t1', '#1274de')
      }

      if (mockListingsVal) {
        listings = JSON.parse(mockListingsVal).map((item: any) => ({
          ...item,
          team_color: item.team_id ? teamsColors.get(item.team_id) || null : null,
        }))
        // Sort descending by date
        listings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      } else {
        // Default seed listings so it's not empty at first sight in mock mode
        listings = [
          {
            id: 'mock_seed_1',
            type: 'team_seeking_driver',
            user_id: '76561198000000001',
            user_name: 'David Croft',
            user_avatar: null,
            team_id: 't1',
            team_name: 'Apex Racing Team',
            team_logo: null,
            team_color: teamsColors.get('t1') || null,
            title: 'Endurance Driver Wanted - LMU WEC Season',
            description: 'Looking for a reliable LMP2 driver to join our team for the upcoming 6-hour endurance league. Ideal candidate has solid pace and is available on weekends.',
            main_sim: 'lmu',
            class_tag: 'LMP2',
            contact_info: 'Discord: @apex_david',
            created_at: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago
          },
          {
            id: 'mock_seed_2',
            type: 'driver_seeking_team',
            user_id: '76561198000000002',
            user_name: 'Lewis Hamilton',
            user_avatar: null,
            team_id: null,
            team_name: null,
            team_logo: null,
            team_color: null,
            title: 'Pro GT3 driver looking for active team',
            description: 'Looking for a competitive team running in Assetto Corsa GT3 Sprint leagues. Available weekday evenings. Sub-1:47s pace at Monza.',
            main_sim: 'ac',
            class_tag: 'GT3',
            contact_info: 'Discord: @lewis_h',
            created_at: new Date(Date.now() - 3600000 * 6).toISOString(), // 6 hours ago
          }
        ]
      }
    } catch (e) {
      console.error(e)
    }
  }

  // 2. Fetch User's Managed Teams and check if user belongs to any team
  let belongsToTeam = false
  if (session) {
    try {
      const dashboard = await getTeamsDashboard(session.userId)
      if (dashboard && Array.isArray(dashboard.teams)) {
        myTeams = dashboard.teams
          .filter((team: any) => dashboard.myTeamIds.includes(team.id))
          .map((team: any) => ({
            id: team.id,
            name: team.name,
            logoUrl: team.logo_url || null,
          }))

        // A user belongs to a team if they are owner or member in any team
        belongsToTeam = dashboard.teams.some((team: any) =>
          team.ownerUserId === session.userId ||
          (Array.isArray(team.members) && team.members.some((m: any) => m.userId === session.userId))
        )
      }
    } catch (error) {
      console.error('Failed to load user teams for marketplace:', error)
    }
  }

  // 3. Fetch Market Applications and Invites
  let applications: any[] = []
  let invites: any[] = []
  let appsSuccess = false

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        const appsSnap = await runWithTimeout(db.collection('market_applications').get(), 3000)
        applications = appsSnap.docs.map((doc: any) => {
          const d = doc.data()
          return {
            id: doc.id,
            listingId: d.listing_id || '',
            teamId: d.team_id || '',
            userId: d.user_id || '',
            userName: d.user_name || 'Driver',
            userAvatar: d.user_avatar || null,
            contactInfo: d.contact_info || '',
            status: d.status || 'pending',
            message: d.message || '',
            createdAt: serializeDate(d.created_at),
          }
        })

        const invitesSnap = await runWithTimeout(db.collection('team_invites').where('status', '==', 'pending').get(), 3000)
        const teamIds = Array.from(new Set(invitesSnap.docs.map((doc: any) => doc.data().team_id).filter(Boolean)))
        
        const teamDocsMap = new Map<string, { name: string; logoUrl: string | null }>()
        if (teamIds.length > 0) {
          const teamSnaps = await Promise.all(teamIds.map((tid: any) => runWithTimeout(db.collection('teams').doc(tid).get(), 3000)))
          teamSnaps.forEach((s: any) => {
            if (s.exists) {
              const data = s.data()
              teamDocsMap.set(s.id, {
                name: data.name || 'Team',
                logoUrl: data.logo_url || null
              })
            }
          })
        }

        invites = invitesSnap.docs.map((doc: any) => {
          const d = doc.data()
          const teamInfo = d.team_id ? teamDocsMap.get(d.team_id) : null
          return {
            id: doc.id,
            listingId: d.listing_id || '',
            teamId: d.team_id || '',
            teamName: teamInfo?.name || 'Team',
            teamLogo: teamInfo?.logoUrl || null,
            invitedUserId: d.invited_user_id || '',
            invitedByUserId: d.invited_by_user_id || '',
            status: d.status || 'pending',
            createdAt: serializeDate(d.created_at),
          }
        })
        appsSuccess = true
      } catch (err) {
        console.error('Failed to fetch market apps/invites from Firestore:', err)
      }
    }
  }

  if (!hasFirebase) {
    // Mock Mode
    try {
      const cookieStore = await cookies()
      const appsVal = cookieStore.get('mock_market_applications')?.value
      applications = appsVal ? JSON.parse(appsVal) : []

      const invitesVal = cookieStore.get('mock_market_invites')?.value
      invites = invitesVal ? JSON.parse(invitesVal) : []
    } catch (err) {
      console.error('Failed to parse mock market apps/invites:', err)
    }
  }

  const currentUser = session
    ? {
        userId: session.userId,
        steamDisplayName: session.steamDisplayName,
        avatarUrl: session.avatarUrl ?? null,
      }
    : null

  return (
    <div className="space-y-4">
      <MarketPageContent
        listings={listings}
        currentUser={currentUser}
        myTeams={myTeams}
        applications={applications}
        invites={invites}
        belongsToTeam={belongsToTeam}
      />
    </div>
  )
}
