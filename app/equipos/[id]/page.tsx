export const dynamic = 'force-dynamic'
export const revalidate = 0

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CenterModal } from '@/components/center-modal'
import { ClearStatusQuery } from '@/components/clear-status-query'
import { TeamCarsEditor } from '@/components/team-cars-editor'
import { CopyableSteamId } from '@/components/copyable-steam-id'
import { CopyVehicleDriverIdsButton } from '@/components/copy-vehicle-driver-ids-button'
import { getCurrentUser, getAdminAccessContext } from '@/lib/auth'
import { getLeagues } from '@/lib/platform-data'
import { getFirestoreDb, hasFirebase } from '@/lib/firebase'
import { getTeamsDashboard } from '@/lib/team-data'
import { formatDate, formatDateTime } from '@/lib/utils'
import { FormattedDate } from '@/components/formatted-date'
import { invitePilot, removeTeamMember, updateTeam, updateTeamMemberRole, deleteTeamAction, acceptDriverApplicationAction, declineDriverApplicationAction } from '../actions'
import { ImagePicker } from '@/components/image-picker'
import { Download, Youtube, MessageSquare, Sparkles, Users, UserPlus } from 'lucide-react'
import { DeleteTeamButton } from '@/components/delete-team-button'

function profileStatusMessage(params: { updated?: string; invite?: string; memberRemoved?: string; roleUpdated?: string; error?: string }) {
  if (params.updated === '1') return { kind: 'ok', text: 'Team updated.' }
  if (params.invite === '1') return { kind: 'ok', text: 'Invitation sent.' }
  if (params.memberRemoved === '1') return { kind: 'ok', text: 'Driver removed from team.' }
  if (params.roleUpdated === '1') return { kind: 'ok', text: 'Role updated.' }
  if (params.error === 'already-member') return { kind: 'warn', text: 'This driver is already a member of this team.' }
  if (params.error === 'owner-protected') return { kind: 'warn', text: 'You cannot remove the team owner.' }
  if (params.error === 'invalid-role') return { kind: 'warn', text: 'Invalid role.' }
  if (params.error === 'dorsal-duplicate') return { kind: 'error', text: 'Error: Uno de los dorsales seleccionados ya pertenece a otro equipo o está duplicado.' }
  if (params.error) return { kind: 'error', text: 'Could not complete the action.' }
  return null
}

function hexToRgba(hexColor: string | null | undefined, alpha: number) {
  const value = String(hexColor || '')
    .replace('#', '')
    .trim()
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return `rgba(18,116,222,${alpha})`
  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default async function TeamProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ updated?: string; invite?: string; memberRemoved?: string; roleUpdated?: string; error?: string }>
}) {
  const { id } = await params
  const qs = await searchParams
  const leagues = await getLeagues()
  const session = await getCurrentUser()
  const { teams, myTeamIds } = await getTeamsDashboard(session?.userId)
  const team = teams.find((item) => item.id === id)

  if (!team) return notFound()

  const takenDorsals: Array<{ teamId: string; teamName: string; category: string; dorsal: string }> = []
  for (const t of teams) {
    if (t.id !== team.id && Array.isArray(t.cars)) {
      for (const c of t.cars) {
        if (c && c.dorsal) {
          takenDorsals.push({
            teamId: t.id,
            teamName: t.name || 'Otro equipo',
            category: c.category || '',
            dorsal: String(c.dorsal).trim(),
          })
        }
      }
    }
  }

  const leaguesOptions = leagues.map((l) => ({
    id: l.id,
    slug: l.slug,
    title: l.title,
    classTags: l.classTags || [],
  }))
  const access = await getAdminAccessContext(session?.userId)
  const isPlatformAdmin = access.canAccessPlatformAdmin

  const canManage = Boolean(
    !hasFirebase ||
    (session?.userId && (
      myTeamIds.includes(team.id) ||
      team.ownerUserId === session.userId ||
      isPlatformAdmin ||
      team.members.some((m) => m.userId === session.userId && (m.role === 'owner' || m.role === 'manager'))
    ))
  )
  const canDelete = Boolean(
    !hasFirebase ||
    (session?.userId && (
      team.ownerUserId === session.userId ||
      isPlatformAdmin
    ))
  )
  const message = profileStatusMessage(qs)
  const ownerMember =
    team.members.find((member) => member.role === 'owner') ||
    team.members.find((member) => member.userId === team.ownerUserId)
  const ownerDisplayName =
    ownerMember?.displayName || ownerMember?.steamDisplayName || ownerMember?.steamId || ownerMember?.userId || 'Not available'
  const existingMemberUserIds = new Set(team.members.map((member) => member.userId))
  const memberUserIds = team.members.map((member) => member.userId)
  let pendingApplications: Array<{ id: string; userId: string; userName: string; userAvatar: string | null; contactInfo: string; message?: string; createdAt: string }> = []

  const db = getFirestoreDb()
  const inviteCandidates: Array<{ userId: string; label: string }> = []
  const teamPilots: Array<{ userId: string; name: string; role: string; avatarUrl: string | null; steamId?: string }> = []
  const recentResults: Array<{ id: string; leagueTitle: string; eventTitle: string; position: number; points: number | null; at: string }> = []
  const leagueParticipation: Array<{
    leagueId: string
    title: string
    bannerUrl: string | null
    status: string
    simulator: string
    teamDriversInLeague: number
    approvedEntries: number
    pendingEntries: number
    nextEventAt: string | null
  }> = []

  let stats = {
    leagues: 0,
    activeLeagues: 0,
    approvedEntries: 0,
    pendingEntries: 0,
    upcomingEvents: 0,
    wins: 0,
    podiums: 0,
    racesRun: 0,
    dnf: 0,
    dsq: 0,
  }

  if (hasFirebase && db) {
    try {
      const steamSnapshot = await db.collection('steam_accounts').orderBy('steam_display_name', 'asc').get()
      const steamAccounts = steamSnapshot.docs.map((doc: any) => {
        const data = doc.data()
        return {
          user_id: data.user_id || '',
          steam_id: data.steam_id || '',
          steam_display_name: data.steam_display_name || '',
          steam_avatar_url: data.steam_avatar_url || null,
        }
      })

      const steamByUserId = new Map(steamAccounts.map((row: any) => [row.user_id, row]))
      const memberSteamRows = steamAccounts.filter((row: any) => existingMemberUserIds.has(row.user_id))
      const nonMemberSteamRows = steamAccounts.filter((row: any) => !existingMemberUserIds.has(row.user_id))

      const candidateUserIds = nonMemberSteamRows.map((row: any) => row.user_id)
      let profileRows: any[] = []
      if (candidateUserIds.length > 0) {
        // Chunk candidate IDs for Firebase In Query
        const chunks = []
        for (let i = 0; i < candidateUserIds.length; i += 10) {
          chunks.push(candidateUserIds.slice(i, i + 10))
        }
        const snaps = await Promise.all(chunks.map((chunk: any) => db.collection('profiles').where('user_id', 'in', chunk).get()))
        profileRows = snaps.flatMap((snap: any) => snap.docs.map((doc: any) => doc.data()))
      }

      const profileByUserId = new Map(
        profileRows.map((row: any) => [row.user_id, row.display_name]),
      )

      for (const row of nonMemberSteamRows) {
        const displayName = profileByUserId.get(row.user_id) || row.steam_display_name || row.steam_id
        inviteCandidates.push({
          userId: row.user_id,
          label: `${displayName} (${row.steam_id})`,
        })
      }

      if (memberUserIds.length > 0) {
        const chunks = []
        for (let i = 0; i < memberUserIds.length; i += 10) {
          chunks.push(memberUserIds.slice(i, i + 10))
        }
        const snaps = await Promise.all(chunks.map((chunk: any) => db.collection('profiles').where('user_id', 'in', chunk).get()))
        const memberProfiles = snaps.flatMap((snap: any) => snap.docs.map((doc: any) => doc.data()))

        const memberProfileByUserId = new Map(
          memberProfiles.map((row: any) => [row.user_id, row]),
        )

        for (const member of team.members) {
          const profile = memberProfileByUserId.get(member.userId)
          const steam = memberSteamRows.find((item: any) => item.user_id === member.userId) || steamByUserId.get(member.userId)
          teamPilots.push({
            userId: member.userId,
            role: member.role,
            name: profile?.display_name || steam?.steam_display_name || member.displayName || member.steamDisplayName || member.steamId || member.userId,
            avatarUrl: profile?.avatar_url || steam?.steam_avatar_url || (member as any).avatarUrl || null,
            steamId: steam?.steam_id || member.steamId || '',
          })
        }
      }

      const teamRegsSnapshot = await db.collection('league_team_registrations').where('team_id', '==', team.id).get()
      const teamRegistrationRows = teamRegsSnapshot.docs.map((doc: any) => {
        const data = doc.data()
        return {
          id: doc.id,
          league_id: data.league_id || '',
          status: data.status || 'pending',
        }
      }).filter((row: any) => Boolean(row.league_id))

      const teamRegistrationIds = teamRegistrationRows.map((row: any) => row.id)
      const leagueIds = Array.from(new Set(teamRegistrationRows.map((row: any) => row.league_id)))
      const leagueByRegistrationId = new Map<string, string>(teamRegistrationRows.map((row: any) => [row.id, row.league_id]))
      const driverIdsByLeague = new Map<string, Set<string>>()

      if (teamRegistrationIds.length > 0) {
        const chunks = []
        for (let i = 0; i < teamRegistrationIds.length; i += 10) {
          chunks.push(teamRegistrationIds.slice(i, i + 10))
        }
        const snaps = await Promise.all(chunks.map((chunk: any) => db.collection('league_team_registration_drivers').where('team_registration_id', 'in', chunk).get()))
        const mappedDrivers = snaps.flatMap((snap: any) => snap.docs.map((doc: any) => doc.data()))

        for (const mapping of mappedDrivers) {
          const leagueId = leagueByRegistrationId.get(mapping.team_registration_id)
          if (!leagueId) continue
          const current = driverIdsByLeague.get(leagueId) || new Set<string>()
          current.add(mapping.user_id)
          driverIdsByLeague.set(leagueId, current)
        }
      }

      if (leagueIds.length > 0) {
        const chunks = []
        for (let i = 0; i < leagueIds.length; i += 10) {
          chunks.push(leagueIds.slice(i, i + 10))
        }
        const leaguesSnaps = await Promise.all(chunks.map((chunk: any) => db.collection('leagues').where('__name__', 'in', chunk).get()))
        const leaguesData = leaguesSnaps.flatMap((snap: any) => snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })))

        const eventsSnaps = await Promise.all(chunks.map((chunk: any) => db.collection('league_events').where('league_id', 'in', chunk).get()))
        const rawEvents = eventsSnaps.flatMap((snap: any) => snap.docs.map((doc: any) => doc.data()))

        const nowStr = new Date().toISOString()
        const futureEvents = rawEvents.filter(e => {
          const startsAt = e.starts_at && typeof e.starts_at.toDate === 'function' ? e.starts_at.toDate().toISOString() : e.starts_at
          return startsAt >= nowStr
        })
        futureEvents.sort((a, b) => {
          const aStart = a.starts_at && typeof a.starts_at.toDate === 'function' ? a.starts_at.toDate().toISOString() : a.starts_at
          const bStart = b.starts_at && typeof b.starts_at.toDate === 'function' ? b.starts_at.toDate().toISOString() : b.starts_at
          return aStart.localeCompare(bStart)
        })

        const eventsByLeague = new Map<string, string[]>()
        for (const event of futureEvents) {
          const startsAt = event.starts_at && typeof event.starts_at.toDate === 'function' ? event.starts_at.toDate().toISOString() : event.starts_at
          const current = eventsByLeague.get(event.league_id) || []
          current.push(startsAt)
          eventsByLeague.set(event.league_id, current)
        }

        const byLeague = new Map<
          string,
          {
            approved: number
            pending: number
          }
        >()

        for (const row of teamRegistrationRows) {
          const slot = byLeague.get(row.league_id) || { approved: 0, pending: 0 }
          if (row.status === 'approved') slot.approved += 1
          if (row.status === 'pending') slot.pending += 1
          byLeague.set(row.league_id, slot)
        }

        for (const league of leaguesData) {
          const rollup = byLeague.get(league.id)
          if (!rollup) continue
          const leagueEvents = eventsByLeague.get(league.id) || []
          leagueParticipation.push({
            leagueId: league.id,
            title: league.title || '',
            bannerUrl: league.banner_url || null,
            status: league.status || 'open',
            simulator: league.simulator || 'ac',
            teamDriversInLeague: (driverIdsByLeague.get(league.id) || new Set<string>()).size,
            approvedEntries: rollup.approved,
            pendingEntries: rollup.pending,
            nextEventAt: leagueEvents[0] || null,
          })
        }

        stats = {
          leagues: leagueParticipation.length,
          activeLeagues: leagueParticipation.filter((league) => league.status === 'open' || league.status === 'ongoing').length,
          approvedEntries: leagueParticipation.reduce((sum, league) => sum + league.approvedEntries, 0),
          pendingEntries: leagueParticipation.reduce((sum, league) => sum + league.pendingEntries, 0),
          upcomingEvents: leagueParticipation.filter((league) => Boolean(league.nextEventAt)).length,
          wins: 0,
          podiums: 0,
          racesRun: 0,
          dnf: 0,
          dsq: 0,
        }
      }

      if (memberUserIds.length > 0 && leagueIds.length > 0) {
        // Chunk userIds and query league results
        // Firestore In query supports up to 10 users
        const chunks = []
        for (let i = 0; i < memberUserIds.length; i += 10) {
          chunks.push(memberUserIds.slice(i, i + 10))
        }
        
        const snaps = await Promise.all(chunks.map((chunk: any) => db.collection('league_results').where('user_id', 'in', chunk).get()))
        const allResults = snaps.flatMap((snap: any) => snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })))

        const filteredResults = allResults.filter(row => leagueIds.includes(row.league_id || ''))
        
        // Sort results by created_at desc
        filteredResults.sort((a: any, b: any) => {
          const aDate = a.created_at && typeof a.created_at.toDate === 'function' ? a.created_at.toDate().toISOString() : (a.created_at || '')
          const bDate = b.created_at && typeof b.created_at.toDate === 'function' ? b.created_at.toDate().toISOString() : (b.created_at || '')
          return bDate.localeCompare(aDate)
        })

        if (filteredResults.length > 0) {
          const normalizedResults = filteredResults
            .map((row: any) => {
              const atDate = row.created_at && typeof row.created_at.toDate === 'function' ? row.created_at.toDate().toISOString() : (row.created_at || '')
              return {
                id: String(row.id),
                leagueId: String(row.league_id),
                eventId: String(row.event_id),
                userId: String(row.user_id),
                position: Number(row.position),
                points: row.points == null ? null : Number(row.points),
                at: atDate,
              }
            })
            .filter((row) => {
              if (!Number.isFinite(row.position) || row.position <= 0) return false
              const leagueDriverSet = driverIdsByLeague.get(row.leagueId)
              if (!leagueDriverSet) return false
              return leagueDriverSet.has(row.userId)
            })

          const resultLeagueIds = Array.from(new Set(normalizedResults.map((row) => row.leagueId)))
          const resultEventIds = Array.from(new Set(normalizedResults.map((row) => row.eventId)))

          let resultLeaguesRes: any[] = []
          if (resultLeagueIds.length > 0) {
            const lChunks = []
            for (let i = 0; i < resultLeagueIds.length; i += 10) {
              lChunks.push(resultLeagueIds.slice(i, i + 10))
            }
            const lSnaps = await Promise.all(lChunks.map((chunk: any) => db.collection('leagues').where('__name__', 'in', chunk).get()))
            resultLeaguesRes = lSnaps.flatMap((snap: any) => snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })))
          }

          let resultEventsRes: any[] = []
          if (resultEventIds.length > 0) {
            const eChunks = []
            for (let i = 0; i < resultEventIds.length; i += 10) {
              eChunks.push(resultEventIds.slice(i, i + 10))
            }
            const eSnaps = await Promise.all(eChunks.map((chunk: any) => db.collection('league_events').where('__name__', 'in', chunk).get()))
            resultEventsRes = eSnaps.flatMap((snap: any) => snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })))
          }

          const leagueNameById = new Map(resultLeaguesRes.map((row) => [row.id, row.title || '']))
          const eventNameById = new Map(
            resultEventsRes.map((row) => [
              row.id,
              row.title || row.circuit_name || 'Event',
            ]),
          )

          for (const row of normalizedResults.slice(0, 8)) {
            recentResults.push({
              id: row.id,
              leagueTitle: leagueNameById.get(row.leagueId) || 'League',
              eventTitle: eventNameById.get(row.eventId) || 'Event',
              position: row.position,
              points: row.points,
              at: row.at,
            })
          }

          const uniqueRaceIds = new Set(normalizedResults.map((row) => row.eventId))
          const wins = normalizedResults.filter((row) => row.position === 1).length
          const podiums = normalizedResults.filter((row) => row.position <= 3).length
          const dnf = filteredResults.filter((row: any) => row.is_dnf || row.status === 'DNF' || row.position === 990 || row.position > 100).length
          const dsq = filteredResults.filter((row: any) => row.is_dsq || row.status === 'DSQ' || row.position === 991).length
          stats.wins = wins
          stats.podiums = podiums
          stats.dnf = dnf
          stats.dsq = dsq
          stats.racesRun = uniqueRaceIds.size
        }
      }

      // Fetch pending driver applications for the team from the market
      try {
        const appsSnap = await db.collection('market_applications')
          .where('team_id', '==', team.id)
          .where('status', '==', 'pending')
          .get()
        pendingApplications = appsSnap.docs.map((doc: any) => {
          const data = doc.data()
          return {
            id: doc.id,
            userId: data.user_id || '',
            userName: data.user_name || 'Driver',
            userAvatar: data.user_avatar || null,
            contactInfo: data.contact_info || 'Discord / Steam',
            message: data.message || '',
            createdAt: data.created_at && typeof data.created_at.toDate === 'function'
              ? data.created_at.toDate().toISOString()
              : data.created_at || new Date().toISOString()
          }
        })
      } catch (err) {
        console.error('Failed to fetch applications for team:', err)
      }
    } catch (error) {
      console.error('Failed to load details from Firestore for team:', error)
    }
  }

  if (!hasFirebase) {
    try {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const appsVal = cookieStore.get('mock_market_applications')?.value
      const allApps = appsVal ? JSON.parse(appsVal) : []
      pendingApplications = allApps.filter((a: any) => a.teamId === team.id && a.status === 'pending').map((a: any) => ({
        id: a.id,
        userId: a.userId,
        userName: a.userName || 'Driver',
        userAvatar: a.userAvatar || null,
        contactInfo: a.contactInfo || 'Discord / Steam',
        message: a.message || '',
        createdAt: a.createdAt || new Date().toISOString()
      }))
    } catch {}
  }

  const accent = team.accentColor || team.primaryColor || '#1274de'
  const accentSoft = hexToRgba(accent, 0.28)
  const accentHard = hexToRgba(accent, 0.62)

  const coOwners = (teamPilots.length > 0 ? teamPilots : team.members.map((member) => ({
    name: member.displayName || member.steamDisplayName || member.steamId || member.userId,
    role: member.role,
  })))
    .filter((p) => p.role === 'manager')
    .map((p) => p.name)

  const teamMembersOptions = (teamPilots.length > 0 ? teamPilots : team.members.map((member) => ({
    userId: member.userId,
    name: member.displayName || member.steamDisplayName || member.steamId || member.userId,
    steamId: member.steamId || '',
  }))).map((p: any) => ({
    userId: p.userId,
    name: p.name,
    steamId: p.steamId || '',
  }))

  return (
    <div className="space-y-4 text-white">
      <ClearStatusQuery />
      <section className="overflow-hidden border border-shell-line bg-[#070d17] rounded-none">
        <div
          className="relative min-h-[320px] overflow-hidden p-6 md:min-h-[400px] md:p-9"
          style={{
            backgroundImage: `linear-gradient(112deg, rgba(6,10,17,0.94) 20%, ${accentSoft} 58%, rgba(6,10,17,0.86) 100%), url(${
              team.leagueTitle && leagueParticipation[0]?.bannerUrl ? leagueParticipation[0].bannerUrl : team.carSkinUrls?.[0] || team.logoUrl || ''
            })`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24" style={{ background: `linear-gradient(180deg, rgba(0,0,0,0) 0%, ${accentHard} 100%)` }} />
          {canManage && (
            <div className="absolute top-6 right-6 md:top-9 md:right-9 z-10 flex items-center gap-2">
              <CenterModal
                title="Edit General Info"
                triggerLabel="Edit General"
                triggerClassName="inline-flex items-center gap-1.5 border border-white/20 bg-white/5 hover:bg-white/10 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white rounded-none transition-colors cursor-pointer"
                widthClassName="w-[min(650px,94vw)]"
              >
                <form action={updateTeam} className="space-y-5 p-2 bg-[#090d16] text-white">
                  <input type="hidden" name="teamId" value={team.id} />
                  <input type="hidden" name="redirectTo" value={`/equipos/${team.id}`} />
                  
                  {/* Name */}
                  <div>
                    <label className="mb-1 block text-xs text-slate-350 uppercase tracking-wider font-semibold text-left">
                      Team Name *
                    </label>
                    <input
                      name="name"
                      defaultValue={team.name}
                      placeholder="Team name"
                      required
                      className="w-full border border-shell-line bg-black/40 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-white/30 rounded-none transition-colors text-left"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="mb-1 block text-xs text-slate-355 uppercase tracking-wider font-semibold text-left font-sans">
                      Short Description
                    </label>
                    <textarea
                      name="description"
                      rows={3}
                      defaultValue={team.description || ''}
                      placeholder="Team description..."
                      className="w-full border border-shell-line bg-black/40 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-white/30 rounded-none transition-colors resize-none text-left"
                    />
                  </div>

                  {/* Slogan */}
                  <div>
                    <label className="mb-1 block text-xs text-slate-355 uppercase tracking-wider font-semibold text-left font-sans">
                      Team Slogan / Motto
                    </label>
                    <input
                      type="text"
                      name="slogan"
                      defaultValue={team.slogan || ''}
                      placeholder="e.g. Speed. Precision. Victory."
                      maxLength={85}
                      className="w-full border border-shell-line bg-black/40 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-white/30 rounded-none transition-colors text-left"
                    />
                  </div>

                  {/* Accent Color Selection */}
                  <div>
                    <label className="mb-2 block text-xs text-slate-355 uppercase tracking-wider font-semibold text-left font-sans font-extrabold text-[#00f0ff] animate-pulse">
                      Team Accent Color / Brand Tone
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { name: 'Neon Blue', hex: '#00f0ff', colorText: 'text-[#00f0ff]' },
                        { name: 'Neon Pink', hex: '#ff007f', colorText: 'text-[#ff007f]' },
                        { name: 'Electric Lime', hex: '#39ff14', colorText: 'text-[#39ff14]' },
                        { name: 'Fiery Orange', hex: '#ff5500', colorText: 'text-[#ff5500]' },
                        { name: 'Golden Yellow', hex: '#ffea00', colorText: 'text-[#ffea00]' },
                        { name: 'Acid Purple', hex: '#b026ff', colorText: 'text-[#b026ff]' },
                      ].map((color) => (
                        <label
                          key={color.hex}
                          className={`flex items-center gap-2 border bg-black/30 p-2.5 text-xs text-slate-300 hover:bg-white/5 cursor-pointer rounded-none select-none text-left transition-all ${
                            team.accentColor === color.hex ? 'border-white bg-white/5' : 'border-shell-line'
                          }`}
                        >
                          <input
                            type="radio"
                            name="accentColor"
                            value={color.hex}
                            defaultChecked={team.accentColor === color.hex || (!team.accentColor && color.hex === '#00f0ff')}
                            className="h-3 w-3 border border-shell-line text-slate-200 bg-transparent focus:ring-0 cursor-pointer"
                          />
                          <span className={`font-black uppercase tracking-wide text-[10px] ${color.colorText}`}>
                            {color.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Social Community Links */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-xs text-slate-355 uppercase tracking-wider font-semibold text-left font-sans">
                        Discord Invite Link
                      </label>
                      <input
                        type="url"
                        name="discordUrl"
                        defaultValue={team.discordUrl || ''}
                        placeholder="e.g. https://discord.gg/..."
                        className="w-full border border-shell-line bg-black/40 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-white/30 rounded-none transition-colors text-left"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-355 uppercase tracking-wider font-semibold text-left font-sans">
                        YouTube Channel Link
                      </label>
                      <input
                        type="url"
                        name="youtubeUrl"
                        defaultValue={team.youtubeUrl || ''}
                        placeholder="e.g. https://youtube.com/..."
                        className="w-full border border-shell-line bg-black/40 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-white/30 rounded-none transition-colors text-left"
                      />
                    </div>
                  </div>

                  {/* Categories */}
                  <div>
                    <label className="mb-2 block text-xs text-slate-300 uppercase tracking-wider font-semibold text-left font-sans">
                      Competition Classes
                    </label>
                    <div className="flex flex-wrap gap-4">
                      {['GT3', 'LMP2', 'HYPERCAR'].map((tag) => (
                        <label key={tag} className="flex items-center gap-2 text-sm font-semibold uppercase text-slate-300 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            name="classTags"
                            value={tag}
                            defaultChecked={(team.classTags || []).includes(tag)}
                            className="h-4 w-4 rounded-none border border-shell-line bg-black/20 text-shell-accent focus:ring-0 focus:ring-offset-0"
                          />
                          <span>{tag}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Logo Picker */}
                  <div className="text-left">
                    <ImagePicker
                      name="logoUrl"
                      defaultValue={team.logoUrl || ''}
                      label="Team Logo (PNG/JPG/WebP - Will be compressed automatically)"
                      hideGallery
                    />
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end pt-4 border-t border-shell-line/50">
                    <button className="bg-shell-accent hover:bg-red-700 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white rounded-none transition-colors cursor-pointer">
                      Save Changes
                    </button>
                  </div>
                </form>
              </CenterModal>

              {/* Delete Team Button */}
              {canDelete && (
                <DeleteTeamButton
                  teamId={team.id}
                  teamName={team.name}
                  deleteAction={deleteTeamAction}
                />
              )}
            </div>
          )}

          <div className="relative z-[1] max-w-4xl">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-[0.24em] text-[#b8d8ff]">RSX Team Profile</span>
              <span className="text-[11px] text-slate-400 font-semibold font-sans">
                Creator: <span className="text-cyan-400 font-bold">{ownerDisplayName}</span>
                {coOwners.length > 0 && (
                  <>
                    <span className="mx-2 text-slate-600">|</span>
                    Co-Founder: <span className="text-cyan-400 font-bold">{coOwners.join(', ')}</span>
                  </>
                )}
              </span>
            </div>
            <h1 className="mt-2 text-4xl font-black uppercase italic leading-[0.95] text-white md:text-7xl">{team.name}</h1>
            {team.slogan && (
              <p className="mt-2 text-xs md:text-sm font-bold tracking-[0.2em] text-[#00f0ff] uppercase italic flex items-center gap-1.5 animate-pulse">
                <Sparkles className="h-3.5 w-3.5 text-[#00f0ff] shrink-0" />
                "{team.slogan}"
              </p>
            )}
            <p className="mt-3 max-w-2xl text-sm text-slate-200 md:text-base">{team.description || 'Official team profile and performance standings.'}</p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {team.logoUrl ? (
                <span className="inline-flex h-10 w-10 items-center justify-center border border-white/25 bg-black/25 p-1 rounded-none shadow-sm">
                  <img src={team.logoUrl} alt={team.name} className="h-full w-full object-contain" />
                </span>
              ) : (
                <span className="inline-flex h-10 w-10 items-center justify-center border border-white/25 bg-black/40 text-xs font-black tracking-wider text-cyan-300 rounded-none shadow-sm">
                  {team.name.slice(0, 3).toUpperCase()}
                </span>
              )}
              <span className="border border-white/20 bg-black/25 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-100 rounded-none">
                Drivers: {teamPilots.length || team.members.length}
              </span>
              <span className="border border-white/20 bg-black/25 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-100 rounded-none">
                Leagues: {stats.leagues}
              </span>
              {team.discordUrl && (
                <a
                  href={team.discordUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 border border-[#5865F2]/40 bg-[#5865F2]/10 hover:bg-[#5865F2]/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#5865F2] hover:text-white rounded-none transition-all cursor-pointer"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Discord
                </a>
              )}
              {team.youtubeUrl && (
                <a
                  href={team.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 border border-[#FF0000]/40 bg-[#FF0000]/10 hover:bg-[#FF0000]/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#FF0000] hover:text-white rounded-none transition-all cursor-pointer"
                >
                  <Youtube className="h-3.5 w-3.5" />
                  YouTube
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-[1px] bg-shell-line md:grid-cols-5">
          {[
            { label: 'Leagues', value: stats.leagues },
            { label: 'Active', value: stats.activeLeagues },
            { label: 'Approved', value: stats.approvedEntries },
            { label: 'Pending', value: stats.pendingEntries },
            { label: 'Upcoming events', value: stats.upcomingEvents },
          ].map((item) => (
            <div key={item.label} className="bg-[#0b1320] p-3 rounded-none">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
              <p className="mt-1 text-3xl font-black italic leading-none text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      {message ? (
        <div
          className={`border px-3 py-2 text-sm rounded-none ${
            message.kind === 'ok'
              ? 'border-emerald-300/30 bg-emerald-500/10 text-emerald-100'
              : message.kind === 'warn'
              ? 'border-amber-300/30 bg-amber-500/10 text-amber-100'
              : 'border-red-300/30 bg-red-500/10 text-red-100'
          }`}
        >
          {message.text}
        </div>
      ) : null}



      <section className="grid gap-[1px] overflow-hidden border border-shell-line bg-shell-line md:grid-cols-5 rounded-none">
        <div className="bg-[#0b1320] p-4 rounded-none">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Wins</p>
          <p className="mt-1 text-4xl font-black italic text-white">{stats.wins}</p>
        </div>
        <div className="bg-[#0b1320] p-4 rounded-none">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Podiums</p>
          <p className="mt-1 text-4xl font-black italic text-white">{stats.podiums}</p>
        </div>
        <div className="bg-[#0b1320] p-4 rounded-none">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">DNFs</p>
          <p className="mt-1 text-4xl font-black italic text-white">{stats.dnf}</p>
        </div>
        <div className="bg-[#0b1320] p-4 rounded-none">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">DSQs</p>
          <p className="mt-1 text-4xl font-black italic text-white">{stats.dsq}</p>
        </div>
        <div className="bg-[#0b1320] p-4 rounded-none">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Races run</p>
          <p className="mt-1 text-4xl font-black italic text-white">{stats.racesRun}</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <article className="shell-panel p-4 md:p-5 rounded-none">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-black uppercase italic text-white">Drivers</h2>
            {canManage ? (
              <div className="relative">
                <CenterModal
                  title="Gestión de Pilotos"
                  triggerLabel="Manage drivers"
                  triggerClassName="inline-flex items-center gap-1.5 border border-cyan-500 bg-cyan-950/40 hover:bg-cyan-500/20 px-4 py-2.5 text-xs font-bold uppercase italic text-cyan-300 rounded-none transition-colors cursor-pointer shrink-0"
                  widthClassName="w-[min(920px,94vw)]"
                >
                  <div className="space-y-6 text-left p-1 bg-[#090d16] text-white">
                    {/* Section 1: Team Members List */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                          <Users className="h-4 w-4 text-cyan-400" />
                          Pilotos e Integrantes del Equipo
                        </h3>
                        <span className="text-[11px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded-full">
                          {team.members.length} {team.members.length === 1 ? 'Miembro' : 'Miembros'}
                        </span>
                      </div>

                      {team.members.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No hay miembros registrados.</p>
                      ) : (
                        <div className="space-y-2.5">
                          {team.members.map((member) => {
                            const memberName = member.displayName || member.steamDisplayName || member.steamId || member.userId
                            const avatar = (member as any).avatarUrl || null

                            return (
                              <div
                                key={member.id}
                                className="bg-[#0f172a]/90 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:border-slate-700 transition-all"
                              >
                                <div className="flex items-center gap-3">
                                  {avatar ? (
                                    <img src={avatar} alt={memberName} className="w-10 h-10 object-cover rounded-lg border border-slate-700" />
                                  ) : (
                                    <div className="w-10 h-10 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center text-xs font-bold text-slate-300">
                                      {memberName.slice(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-sm font-bold text-white leading-tight">{memberName}</p>
                                    <p className="text-[10px] font-mono text-cyan-400/80 mt-0.5">
                                      Steam ID: {member.steamId || member.userId.replace('steam_', '')}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                  {member.role !== 'owner' ? (
                                    <form action={updateTeamMemberRole} className="flex items-center gap-2">
                                      <input type="hidden" name="teamId" value={team.id} />
                                      <input type="hidden" name="memberUserId" value={member.userId} />
                                      <input type="hidden" name="redirectTo" value={`/equipos/${team.id}`} />
                                      <select
                                        name="role"
                                        defaultValue={member.role}
                                        className="bg-[#141d31] border border-slate-700 focus:border-cyan-400 text-slate-200 text-xs font-semibold rounded-lg px-3 py-1.5 outline-none cursor-pointer"
                                      >
                                        <option value="driver">Piloto (Driver)</option>
                                        <option value="manager">Manager</option>
                                      </select>
                                      <button className="bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer">
                                        Guardar Rol
                                      </button>
                                    </form>
                                  ) : (
                                    <span className="bg-amber-500/10 border border-amber-500/40 text-amber-300 px-3 py-1 text-xs font-black uppercase tracking-wider rounded-lg">
                                      OWNER / LÍDER
                                    </span>
                                  )}

                                  {member.role !== 'owner' && (
                                    <form action={removeTeamMember}>
                                      <input type="hidden" name="teamId" value={team.id} />
                                      <input type="hidden" name="memberUserId" value={member.userId} />
                                      <input type="hidden" name="redirectTo" value={`/equipos/${team.id}`} />
                                      <button className="bg-rose-950/40 border border-rose-500/40 text-rose-300 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer">
                                        Expulsar
                                      </button>
                                    </form>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Section 3: Pending Applications from Driver Market */}
                    <div className="bg-[#0c1220] border border-slate-800/90 rounded-xl p-4 space-y-3 shadow-md">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-amber-400" />
                          Solicitudes Pendientes (Mercado de Fichajes)
                        </h3>
                        {pendingApplications.length > 0 && (
                          <span className="text-[10px] font-black bg-amber-500 text-black px-2.5 py-0.5 rounded-full uppercase">
                            {pendingApplications.length} Solicitud{pendingApplications.length > 1 ? 'es' : ''}
                          </span>
                        )}
                      </div>

                      {pendingApplications.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No hay solicitudes pendientes del mercado.</p>
                      ) : (
                        <div className="space-y-2.5">
                          {pendingApplications.map((app) => (
                            <div key={app.id} className="bg-[#141d31]/90 border border-slate-700/60 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                              <div className="flex items-start gap-3">
                                {app.userAvatar ? (
                                  <img src={app.userAvatar} className="w-10 h-10 object-cover border border-slate-700 rounded-lg shrink-0" alt="" />
                                ) : (
                                  <div className="w-10 h-10 bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 rounded-lg shrink-0">
                                    {app.userName.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <p className="text-sm font-bold text-white leading-tight">{app.userName}</p>
                                  <p className="text-xs text-slate-400 mt-0.5">Contacto: <span className="text-cyan-400 font-semibold">{app.contactInfo}</span></p>
                                  {app.message && (
                                    <div className="mt-1.5 p-2 bg-[#0a0f1d] border border-slate-800 text-[11px] text-slate-300 rounded-md max-w-md">
                                      <span className="text-slate-500 font-semibold text-[9px] uppercase tracking-wider block mb-0.5">Mensaje del Piloto:</span>
                                      "{app.message}"
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                <form action={acceptDriverApplicationAction}>
                                  <input type="hidden" name="teamId" value={team.id} />
                                  <input type="hidden" name="applicationId" value={app.id} />
                                  <button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg uppercase tracking-wider transition-all cursor-pointer shadow-sm">
                                    Aceptar / Fichar
                                  </button>
                                </form>
                                <form action={declineDriverApplicationAction}>
                                  <input type="hidden" name="teamId" value={team.id} />
                                  <input type="hidden" name="applicationId" value={app.id} />
                                  <button className="border border-slate-700 hover:border-slate-600 bg-slate-800/50 text-slate-300 font-semibold text-xs px-3.5 py-1.5 rounded-lg transition-all cursor-pointer">
                                    Rechazar
                                  </button>
                                </form>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CenterModal>
              {pendingApplications.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-black leading-none shadow-md">
                  {pendingApplications.length}
                </span>
              )}
              </div>
            ) : null}
          </div>

          {/* Visual Alert of Pending Applications for Leaders */}
          {canManage && pendingApplications.length > 0 && (
            <div className="mb-4 border border-amber-500/40 bg-amber-500/5 p-4 rounded-none text-left">
              <div className="flex items-center justify-between gap-3 border-b border-amber-500/20 pb-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider text-[11px]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  ¡Nueva solicitud de piloto pendiente!
                </div>
                <span className="text-[10px] font-black bg-amber-500 text-black px-2 py-0.5 uppercase tracking-wider">
                  {pendingApplications.length} Solicitud{pendingApplications.length > 1 ? 'es' : ''}
                </span>
              </div>
              
              <div className="mt-3 space-y-2.5">
                {pendingApplications.map((app) => (
                  <div key={app.id} className="bg-black/40 border border-shell-line p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-none">
                    <div className="flex items-center gap-3">
                      {app.userAvatar ? (
                        <img src={app.userAvatar} className="w-9 h-9 object-cover border border-white/10 rounded-none" alt="" />
                      ) : (
                        <div className="w-9 h-9 bg-zinc-800 flex items-center justify-center text-[11px] font-bold text-slate-400 rounded-none">D</div>
                      )}
                      <div>
                        <p className="text-sm font-black text-white leading-tight">{app.userName}</p>
                        <p className="text-xs text-slate-400 mt-1">Contacto: <span className="text-cyan-400 font-semibold">{app.contactInfo}</span></p>
                        {app.message && (
                          <div className="mt-1.5 p-1.5 bg-zinc-950/50 border border-shell-line/40 text-xxs text-slate-300 rounded-none max-w-md">
                            <span className="text-slate-500 font-semibold uppercase block tracking-wider text-[9px] mb-0.5">Mensaje del Piloto:</span>
                            "{app.message}"
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <form action={acceptDriverApplicationAction}>
                        <input type="hidden" name="teamId" value={team.id} />
                        <input type="hidden" name="applicationId" value={app.id} />
                        <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-3 py-1.5 uppercase tracking-wider rounded-none cursor-pointer transition-colors">
                          Aceptar / Contratar
                        </button>
                      </form>
                      <form action={declineDriverApplicationAction}>
                        <input type="hidden" name="teamId" value={team.id} />
                        <input type="hidden" name="applicationId" value={app.id} />
                        <button className="border border-shell-line hover:bg-white/5 text-slate-300 font-bold text-[10px] px-3 py-1.5 uppercase tracking-wider rounded-none cursor-pointer transition-colors">
                          Rechazar
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 space-y-2">
            {(teamPilots.length > 0 ? teamPilots : team.members.map((member) => ({
              userId: member.userId,
              name: member.displayName || member.steamDisplayName || member.steamId || member.userId,
              role: member.role,
              avatarUrl: (member as any).avatarUrl || null,
              steamId: member.steamId || null,
            }))).length === 0 ? (
              <p className="text-sm text-slate-300">No registered drivers.</p>
            ) : (
              (teamPilots.length > 0
                ? teamPilots
                : team.members.map((member) => ({
                    userId: member.userId,
                    name: member.displayName || member.steamDisplayName || member.steamId || member.userId,
                    role: member.role,
                    avatarUrl: (member as any).avatarUrl || null,
                    steamId: member.steamId || null,
                  }))
              ).map((pilot) => (
                <div
                  key={pilot.userId}
                  className="flex items-center gap-3 border border-shell-line px-3 py-2 rounded-none"
                  style={{ background: `linear-gradient(110deg, ${accentSoft} 0%, rgba(8,15,25,0.76) 50%, rgba(8,15,25,0.96) 100%)` }}
                >
                  {pilot.avatarUrl ? (
                    <img src={pilot.avatarUrl} alt={pilot.name} className="h-14 w-14 border border-white/25 object-cover rounded-none font-sans" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center border border-white/20 bg-white/10 text-lg font-bold text-white rounded-none font-sans">
                      {pilot.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-lg font-black uppercase italic text-white leading-tight">{pilot.name}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                        {pilot.role === 'owner'
                          ? 'OWNER / LEADER'
                          : pilot.role === 'manager'
                          ? 'MANAGER / CO-FOUNDER'
                          : 'DRIVER'}
                      </span>
                      {pilot.steamId && (
                        <>
                          <span className="text-slate-600 text-[10px]">•</span>
                          <span className="text-slate-400 font-mono text-[10px]">Steam ID: {pilot.steamId}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        {/* Vehicles per Category section instead of Skins */}
        <article className="shell-panel p-4 md:p-5 rounded-none col-span-1 md:col-span-2">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-black uppercase italic text-white">Vehicles & Categories</h2>
              <div className="mt-2 h-1 w-52 rounded-none" style={{ background: `linear-gradient(90deg, ${accentHard}, transparent)` }} />
            </div>
            {canManage && (
              <CenterModal
                title="Manage Vehicles & Categories"
                triggerLabel="Manage Vehicles"
                triggerClassName="inline-flex items-center gap-1.5 border border-cyan-500 bg-cyan-950/40 hover:bg-cyan-500/20 px-4 py-2.5 text-xs font-bold uppercase italic text-cyan-300 rounded-none transition-colors cursor-pointer shrink-0"
                widthClassName="w-[min(1100px,94vw)]"
              >
                <form action={updateTeam} className="space-y-5 p-2 bg-[#090d16] text-white">
                  <input type="hidden" name="teamId" value={team.id} />
                  <input type="hidden" name="redirectTo" value={`/equipos/${team.id}`} />
                  
                  {/* Vehicles and Categories */}
                  <div className="space-y-2 text-left">
                    <label className="block text-xs text-slate-350 uppercase tracking-wider font-semibold">
                      Vehicles & Categories Configuration
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Add and configure vehicles per category (maximum 4 drivers per vehicle). Assign numbers/dorsals and skin download URLs.
                    </p>
                    <TeamCarsEditor
                      teamMembers={teamMembersOptions}
                      initialCars={team.cars || []}
                      takenDorsals={takenDorsals}
                      leaguesOptions={leaguesOptions}
                      currentTeamId={team.id}
                    />
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end pt-4 border-t border-shell-line/50">
                    <button className="bg-shell-accent hover:bg-red-700 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white rounded-none transition-colors cursor-pointer">
                      Save Changes
                    </button>
                  </div>
                </form>
              </CenterModal>
            )}
          </div>
          
          <div className="space-y-6">
            {(() => {
              const categoryThemes: Record<string, {
                text: string
                border: string
                bg: string
                badge: string
                carBorder: string
                carDorsal: string
                driverActive: string
                line: string
                skinBtn: string
                glow: string
              }> = {
                HYPERCAR: {
                  text: 'text-rose-400 font-extrabold',
                  border: 'border-rose-500/40',
                  bg: 'bg-rose-950/20',
                  badge: 'border-rose-500/40 bg-rose-950/50 text-rose-300',
                  carBorder: 'border-rose-500/30 hover:border-rose-400/80 hover:shadow-[0_0_15px_rgba(244,63,94,0.25)]',
                  carDorsal: 'text-rose-400 font-black',
                  driverActive: 'border-rose-500/40 bg-rose-500/10 text-rose-100',
                  line: 'border-rose-500/30',
                  skinBtn: 'border-rose-500/40 bg-rose-950/30 hover:bg-rose-500 hover:text-white hover:border-rose-400 text-rose-300',
                  glow: 'border-rose-500/30 bg-[#160a0d]/40'
                },
                LMP2: {
                  text: 'text-blue-400 font-extrabold',
                  border: 'border-blue-500/40',
                  bg: 'bg-blue-950/20',
                  badge: 'border-blue-500/40 bg-blue-950/50 text-blue-300',
                  carBorder: 'border-blue-500/30 hover:border-blue-400/80 hover:shadow-[0_0_15px_rgba(59,130,246,0.25)]',
                  carDorsal: 'text-blue-400 font-black',
                  driverActive: 'border-blue-500/40 bg-blue-500/10 text-blue-100',
                  line: 'border-blue-500/30',
                  skinBtn: 'border-blue-500/40 bg-blue-950/30 hover:bg-blue-500 hover:text-white hover:border-blue-400 text-blue-300',
                  glow: 'border-blue-500/30 bg-[#0a1020]/40'
                },
                GT3: {
                  text: 'text-emerald-400 font-extrabold',
                  border: 'border-emerald-500/40',
                  bg: 'bg-emerald-950/20',
                  badge: 'border-emerald-500/40 bg-emerald-950/50 text-emerald-300',
                  carBorder: 'border-emerald-500/30 hover:border-emerald-400/80 hover:shadow-[0_0_15px_rgba(16,185,129,0.25)]',
                  carDorsal: 'text-emerald-400 font-black',
                  driverActive: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100',
                  line: 'border-emerald-500/30',
                  skinBtn: 'border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-500 hover:text-white hover:border-emerald-400 text-emerald-300',
                  glow: 'border-emerald-500/30 bg-[#08160e]/40'
                }
              }

              return ['GT3', 'LMP2', 'HYPERCAR'].map((category) => {
                const categoryCars = (team.cars || []).filter((car) => car.category === category)
                const theme = categoryThemes[category] || {
                  text: 'text-cyan-400',
                  border: 'border-cyan-500/20',
                  bg: 'bg-cyan-950/10',
                  badge: 'border-cyan-500/40 bg-cyan-950/40 text-cyan-300',
                  carBorder: 'border-cyan-500/20 hover:border-cyan-500/40',
                  carDorsal: 'text-cyan-400',
                  driverActive: 'border-cyan-500/10 bg-cyan-500/5 text-slate-200',
                  line: 'border-[#141f32]/50',
                  skinBtn: 'border-cyan-500/20 bg-cyan-950/10 hover:bg-cyan-950/20 text-cyan-300',
                  glow: 'border-[#141f32] bg-zinc-950/20'
                }

                return (
                  <div key={category} className={`border p-4 rounded-none space-y-4 transition-all duration-300 ${theme.glow}`}>
                    <h3 className={`text-sm font-black uppercase italic tracking-wider border-b pb-2 flex items-center justify-between ${theme.text} ${theme.line}`}>
                      <span>{category}</span>
                      <span className={`text-[10px] font-mono not-italic px-2.5 py-0.5 rounded-none border font-bold tracking-normal ${theme.badge}`}>
                        {categoryCars.length} {categoryCars.length === 1 ? 'VEHÍCULO' : 'VEHÍCULOS'}
                      </span>
                    </h3>
                    
                    {categoryCars.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No vehicles registered in this category.</p>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        {categoryCars.map((car) => {
                          const carDriverSteamIds = (car.driverUserIds || [])
                            .map((dId) => {
                              const driver = teamMembersOptions.find((m) => m.userId === dId)
                              return driver?.steamId || driver?.userId?.replace('steam_', '') || ''
                            })
                            .filter(Boolean)

                          return (
                            <div key={car.id} className={`border bg-black/40 p-4 rounded-none space-y-3 transition-all duration-300 ${theme.carBorder}`}>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-white uppercase italic tracking-wider">
                                  Car Number: <span className={`font-bold ${theme.carDorsal}`}>#{car.dorsal || 'N/A'}</span>
                                </span>
                                <div className="flex items-center gap-2">
                                  <CopyVehicleDriverIdsButton
                                    driverSteamIds={carDriverSteamIds}
                                    className={theme.skinBtn}
                                  />
                                  {car.skinUrl && (
                                    <a
                                      href={car.skinUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`flex items-center gap-1.5 border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-none transition-colors ${theme.skinBtn}`}
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                      Skin
                                    </a>
                                  )}
                                </div>
                              </div>
                              
                              {/* Drivers slots */}
                              <div className={`border-t pt-2 ${theme.line}`}>
                                <div className="grid grid-cols-2 gap-2">
                                  {[0, 1, 2, 3].map((idx) => {
                                    const driverId = car.driverUserIds?.[idx]
                                    const driverObj = driverId ? teamMembersOptions.find((m) => m.userId === driverId) : null
                                    const driverName = driverObj?.name || null
                                    return (
                                      <div
                                        key={idx}
                                        className={`px-2.5 py-1.5 text-[10px] rounded-none border flex items-center justify-between gap-1.5 min-w-0 ${
                                          driverName
                                            ? `${theme.driverActive} font-semibold`
                                            : 'border-dashed border-slate-800 bg-transparent text-slate-500 italic'
                                        }`}
                                      >
                                        <span className="truncate">
                                          {driverName || 'Vacant'}
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })
            })()}
          </div>
        </article>
      </section>

      <section className="shell-panel p-4 md:p-5 rounded-none">
        <h2 className="text-2xl font-black uppercase italic text-white">Team Leagues</h2>
        <div className="mt-2 h-1 w-52 rounded-none" style={{ background: `linear-gradient(90deg, ${accentHard}, transparent)` }} />
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {leagueParticipation.length === 0 ? (
            <p className="text-sm text-slate-300">This team does not have any registered participation in any leagues yet.</p>
          ) : (
            leagueParticipation.map((league) => (
              <article key={league.leagueId} className="border border-shell-line bg-[#0a101a] p-3 rounded-none">
                <h3 className="text-xl font-black uppercase italic text-white">{league.title}</h3>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">{league.simulator}</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="border border-shell-line bg-black/20 p-2 text-center rounded-none">
                    <p className="text-[10px] uppercase text-slate-400">Drivers</p>
                    <p className="text-lg font-black text-white">{league.teamDriversInLeague}</p>
                  </div>
                  <div className="border border-shell-line bg-black/20 p-2 text-center rounded-none">
                    <p className="text-[10px] uppercase text-slate-400">Approved</p>
                    <p className="text-lg font-black text-white">{league.approvedEntries}</p>
                  </div>
                  <div className="border border-shell-line bg-black/20 p-2 text-center rounded-none">
                    <p className="text-[10px] uppercase text-slate-400">Pending</p>
                    <p className="text-lg font-black text-white">{league.pendingEntries}</p>
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate-300">{league.nextEventAt ? <FormattedDate date={league.nextEventAt} /> : 'No scheduled races.'}</p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="shell-panel p-4 md:p-5 rounded-none">
        <h2 className="text-2xl font-black uppercase italic text-white">Latest Results</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {recentResults.length === 0 ? (
            <p className="text-sm text-slate-300">No results loaded yet. Once race positions are recorded, they will appear here.</p>
          ) : (
            recentResults.map((result) => (
              <div key={result.id} className="border border-shell-line bg-black/20 p-4 rounded-none flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 truncate">
                    {result.leagueTitle}
                  </p>
                  <p className="mt-0.5 text-base font-black uppercase italic text-white truncate">
                    {result.eventTitle}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="text-[9px] uppercase tracking-wider text-slate-400">Puesto</p>
                    <p className="text-lg font-black italic text-cyan-400 leading-none">P{result.position}</p>
                  </div>
                  <div className="text-right border-l border-white/10 pl-4">
                    <p className="text-[9px] uppercase tracking-wider text-slate-400">Puntos</p>
                    <p className="text-lg font-black italic text-emerald-400 leading-none">{result.points ?? '0'} pts</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="border border-shell-line bg-black/20 p-3 rounded-none">
            <p className="text-[11px] uppercase tracking-wider text-slate-400">Created</p>
            <p className="mt-1 text-white"><FormattedDate date={team.createdAt} mode="date" /></p>
          </div>
          <div className="border border-shell-line bg-black/20 p-3 rounded-none">
            <p className="text-[11px] uppercase tracking-wider text-slate-400">Team creator</p>
            <p className="mt-1 text-white">{ownerDisplayName}</p>
          </div>
        </div>
      </section>

      <div>
        <Link href="/equipos" className="border border-shell-line bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 rounded-none">
          Back to teams
        </Link>
      </div>
    </div>
  )
}
