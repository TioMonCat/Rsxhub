export const dynamic = 'force-dynamic'
export const revalidate = 0

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ClearStatusQuery } from '@/components/clear-status-query'
import { getCurrentUser, getAdminAccessContext } from '@/lib/auth'
import { getLeagues, getRegistrations, getLeagueEvents } from '@/lib/platform-data'
import { getFirestoreDb, hasFirebase, runWithTimeout } from '@/lib/firebase'
import { formatFirestoreValue } from '@/lib/firestore-utils'
import { getTeamsDashboard } from '@/lib/team-data'
import { profileStatusMessage, hexToRgba } from './team-utils'
import type { TeamStats, TeamPilot, LeagueParticipation, RecentResult, PendingApplication } from './team-utils'
import type { LeagueOption } from '@/components/team-cars-editor'
import { TeamBannerStats } from './components/team-banner-stats'
import { TeamDriversSection } from './components/team-drivers-section'
import { TeamVehiclesSection } from './components/team-vehicles-section'
import { TeamLeaguesSection } from './components/team-leagues-section'

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

  // ── Taken dorsals (other teams) ────────────────────────────────────────────
  const takenDorsals: Array<{ teamId: string; teamName: string; category: string; dorsal: string; leagueId?: string | null }> = []
  for (const t of teams) {
    if (t.id !== team.id && Array.isArray(t.cars)) {
      for (const c of t.cars) {
        if (c && c.dorsal) {
          takenDorsals.push({
            teamId: t.id,
            teamName: t.name || 'Other team',
            category: c.category || '',
            dorsal: String(c.dorsal).trim(),
            leagueId: c.leagueId || null,
          })
        }
      }
    }
  }

  const leaguesOptions: LeagueOption[] = leagues.map((l) => ({
    id: l.id,
    slug: l.slug,
    title: l.title,
    classTags: l.classTags || [],
    maxDriversPerCar: l.maxDriversPerCar ?? 4,
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

  // ── Firestore data ─────────────────────────────────────────────────────────
  let pendingApplications: PendingApplication[] = []
  const db = getFirestoreDb()
  const inviteCandidates: Array<{ userId: string; label: string }> = []
  const teamPilots: TeamPilot[] = []
  const recentResults: RecentResult[] = []
  const leagueParticipation: LeagueParticipation[] = []

  let stats: TeamStats = {
    leagues: 0, activeLeagues: 0, approvedEntries: 0, pendingEntries: 0,
    upcomingEvents: 0, wins: 0, podiums: 0, racesRun: 0, dnf: 0, dsq: 0,
  }

  if (hasFirebase && db) {
    try {
      // Only fetch steam accounts for actual team members (not all users)
      let memberSteamRows: any[] = []
      const steamByUserId = new Map<string, any>()

      if (memberUserIds.length > 0) {
        try {
          const steamChunks: string[][] = []
          for (let i = 0; i < memberUserIds.length; i += 10) steamChunks.push(memberUserIds.slice(i, i + 10))
          const steamSnaps = await Promise.all(
            steamChunks.map((chunk) => runWithTimeout(db.collection('steam_accounts').where('user_id', 'in', chunk).get(), 3000))
          )
          memberSteamRows = steamSnaps.flatMap((snap: any) => snap.docs.map((doc: any) => {
            const data = doc.data()
            return {
              user_id: data.user_id || '',
              steam_id: data.steam_id || '',
              steam_display_name: data.steam_display_name || '',
              steam_avatar_url: data.steam_avatar_url || null,
            }
          }))
          memberSteamRows.forEach((row: any) => steamByUserId.set(row.user_id, row))
        } catch (err) {
          console.error('Failed to fetch member steam accounts:', err)
        }
      }

      // Build inviteCandidates from profiles only (skip steam_accounts full scan)
      try {
        const allProfilesSnap = await runWithTimeout(db.collection('steam_accounts').limit(200).get(), 3000)
        const existingMemberSet = new Set(memberUserIds)
        allProfilesSnap.docs.forEach((doc: any) => {
          const data = doc.data()
          if (!existingMemberSet.has(data.user_id)) {
            const displayName = data.steam_display_name || data.user_id || 'Driver'
            inviteCandidates.push({ userId: data.user_id, label: `${displayName} (${data.steam_id || data.user_id})` })
          }
        })
      } catch {
        // inviteCandidates stays empty - non-critical
      }

      if (memberUserIds.length > 0) {
        try {
          const chunks = []
          for (let i = 0; i < memberUserIds.length; i += 10) chunks.push(memberUserIds.slice(i, i + 10))
          const snaps = await Promise.all(chunks.map((chunk: any) => runWithTimeout(db.collection('profiles').where('user_id', 'in', chunk).get(), 3000)))
          const memberProfiles = snaps.flatMap((snap: any) => snap.docs.map((doc: any) => doc.data()))
          const memberProfileByUserId = new Map(memberProfiles.map((row: any) => [row.user_id, row]))

          for (const member of team.members) {
            const profile = memberProfileByUserId.get(member.userId)
            const steam = steamByUserId.get(member.userId)
            teamPilots.push({
              userId: member.userId,
              role: member.role,
              name: profile?.display_name || steam?.steam_display_name || member.displayName || member.steamDisplayName || member.steamId || member.userId || 'Driver',
              avatarUrl: profile?.avatar_url || steam?.steam_avatar_url || (member as any).avatarUrl || null,
              steamId: steam?.steam_id || member.steamId || '',
            })
          }
        } catch (err) {
          console.error('Failed to fetch member profiles:', err)
        }
      }

      let teamRegRows: Array<{ leagueId: string; userId: string; status: string; classTag: string; assignedNumber: number }> = []

      try {
        const teamRegsSnapshot = await runWithTimeout(
          db.collection('league_registrations').where('team_id', '==', team.id).get(),
          3000
        )
        if (!teamRegsSnapshot.empty) {
          teamRegRows = teamRegsSnapshot.docs.map((doc: any) => {
            const data = doc.data()
            return {
              leagueId: data.league_id || '',
              userId: data.user_id || '',
              status: data.status || 'approved',
              classTag: data.class_tag || '',
              assignedNumber: Number(data.assigned_number || 0),
            }
          }).filter((row: any) => Boolean(row.leagueId))
        }
      } catch (err) {
        console.error('Error querying team registrations:', err)
      }

      if (teamRegRows.length === 0) {
        const allRegs = await getRegistrations()
        teamRegRows = allRegs
          .filter((r) => r.teamId === team.id)
          .map((r) => ({
            leagueId: r.leagueId, userId: r.userId, status: r.status,
            classTag: r.classTag || '', assignedNumber: r.assignedNumber || 0,
          }))
      }

      const carLeagueIds = (team.cars || [])
        .map((c: any) => c.leagueId || c.league_id)
        .filter(Boolean)

      const leagueIds = Array.from(new Set([...teamRegRows.map((row) => row.leagueId), ...carLeagueIds]))

      if (leagueIds.length > 0) {
        const allLeagues = await getLeagues()
        const relevantLeagues = allLeagues.filter((l) => leagueIds.includes(l.id) || leagueIds.includes(l.slug))

        for (const lg of relevantLeagues) {
          const lgRows = teamRegRows.filter((r) => r.leagueId === lg.id || r.leagueId === lg.slug)
          const approvedCount = lgRows.filter((r) => r.status === 'approved').length
          const pendingCount = lgRows.filter((r) => r.status === 'pending').length

          const carDriverUserIds = (team.cars || [])
            .filter((c: any) => {
              const cLeagueId = c.leagueId || c.league_id
              if (cLeagueId && cLeagueId !== lg.id && cLeagueId !== lg.slug) return false
              return true
            })
            .flatMap((c: any) => {
              const byLeague = c.driverUserIdsByLeague || c.driver_user_ids_by_league || {}
              const list = byLeague[lg.id] || byLeague[lg.slug] || c.driverUserIds || c.driver_user_ids || []
              return Array.isArray(list) ? list : []
            })
            .filter(Boolean)

          const regDriverUserIds = lgRows
            .map((r) => r.userId)
            .filter((u) => u && u !== team.ownerUserId && !u.startsWith('unassigned'))

          const driverUserIds = Array.from(new Set([...regDriverUserIds, ...carDriverUserIds]))
          const events = await getLeagueEvents(lg.id)
          const nowStr = new Date().toISOString()
          const upcomingEvents = events.filter((e) => e.startsAt >= nowStr).sort((a, b) => a.startsAt.localeCompare(b.startsAt))

          leagueParticipation.push({
            leagueId: lg.id, title: lg.title || '', bannerUrl: lg.bannerUrl || null,
            status: lg.status || 'open', simulator: lg.simulator || 'ac',
            teamDriversInLeague: driverUserIds.length,
            approvedEntries: Math.max(approvedCount > 0 ? approvedCount : lgRows.length, 1),
            pendingEntries: pendingCount, nextEventAt: upcomingEvents[0]?.startsAt || null,
          })
        }

        stats = {
          leagues: leagueParticipation.length,
          activeLeagues: leagueParticipation.filter((l) => l.status === 'open' || l.status === 'ongoing').length,
          approvedEntries: leagueParticipation.reduce((sum, l) => sum + l.approvedEntries, 0),
          pendingEntries: leagueParticipation.reduce((sum, l) => sum + l.pendingEntries, 0),
          upcomingEvents: leagueParticipation.filter((l) => Boolean(l.nextEventAt)).length,
          wins: 0, podiums: 0, racesRun: 0, dnf: 0, dsq: 0,
        }
      }

      if (memberUserIds.length > 0 && leagueIds.length > 0) {
        try {
        const chunks = []
        for (let i = 0; i < memberUserIds.length; i += 10) chunks.push(memberUserIds.slice(i, i + 10))
        const snaps = await Promise.all(
          chunks.map((chunk: any) =>
            runWithTimeout(db.collection('league_results').where('user_id', 'in', chunk).get(), 3000).catch(() => ({ docs: [] }))
          )
        )
        const allResults = snaps.flatMap((snap: any) => snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })))
        const filteredResults = allResults.filter((row: any) => leagueIds.includes(row.league_id || ''))

        filteredResults.sort((a: any, b: any) => {
          const aDate = formatFirestoreValue(a.created_at)
          const bDate = formatFirestoreValue(b.created_at)
          return bDate.localeCompare(aDate)
        })

        if (filteredResults.length > 0) {
          const normalizedResults = filteredResults
            .map((row: any) => {
              const atDate = formatFirestoreValue(row.created_at)
              return {
                id: String(row.id), leagueId: String(row.league_id), eventId: String(row.event_id),
                userId: String(row.user_id), position: Number(row.position),
                points: row.points == null ? null : Number(row.points), at: atDate,
              }
            })
            .filter((row: any) => {
              if (!Number.isFinite(row.position) || row.position <= 0) return false
              return teamRegRows.some((r) => r.leagueId === row.leagueId && r.userId === row.userId)
            })

          const resultLeagueIds = Array.from(new Set(normalizedResults.map((r: any) => r.leagueId)))
          const resultEventIds = Array.from(new Set(normalizedResults.map((r: any) => r.eventId)))

          let resultLeaguesRes: any[] = []
          if (resultLeagueIds.length > 0) {
            const lChunks = []
            for (let i = 0; i < resultLeagueIds.length; i += 10) lChunks.push(resultLeagueIds.slice(i, i + 10))
            const lSnaps = await Promise.all(lChunks.map((chunk: any) => db.collection('leagues').where('__name__', 'in', chunk).get()))
            resultLeaguesRes = lSnaps.flatMap((snap: any) => snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })))
          }

          let resultEventsRes: any[] = []
          if (resultEventIds.length > 0) {
            const eChunks = []
            for (let i = 0; i < resultEventIds.length; i += 10) eChunks.push(resultEventIds.slice(i, i + 10))
            const eSnaps = await Promise.all(eChunks.map((chunk: any) => db.collection('league_events').where('__name__', 'in', chunk).get()))
            resultEventsRes = eSnaps.flatMap((snap: any) => snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })))
          }

          const leagueNameById = new Map(resultLeaguesRes.map((r: any) => [r.id, r.title || '']))
          const eventNameById = new Map(resultEventsRes.map((r: any) => [r.id, r.title || r.circuit_name || 'Event']))

          for (const row of normalizedResults.slice(0, 8)) {
            recentResults.push({
              id: row.id,
              leagueTitle: leagueNameById.get(row.leagueId) || 'League',
              eventTitle: eventNameById.get(row.eventId) || 'Event',
              position: row.position, points: row.points, at: row.at,
            })
          }

          const uniqueRaceIds = new Set(normalizedResults.map((r: any) => r.eventId))
          stats.wins = normalizedResults.filter((r: any) => r.position === 1).length
          stats.podiums = normalizedResults.filter((r: any) => r.position <= 3).length
          stats.dnf = filteredResults.filter((r: any) => r.is_dnf || r.status === 'DNF' || r.position === 990 || r.position > 100).length
          stats.dsq = filteredResults.filter((r: any) => r.is_dsq || r.status === 'DSQ' || r.position === 991).length
          stats.racesRun = uniqueRaceIds.size
        }
        } catch (err) {
          console.error('Failed to fetch league results for team:', err)
        }
      }

      // Fetch pending driver applications safely
      try {
        let docs: any[] = []
        try {
          const snap = await runWithTimeout(db.collection('market_applications').where('team_id', '==', team.id).get(), 2500)
          docs = snap.docs
        } catch {
          const snapAll = await runWithTimeout(db.collection('market_applications').get(), 2500)
          docs = snapAll.docs
        }

        pendingApplications = docs
          .filter((doc: any) => {
            const data = doc.data()
            const matchesTeam = data?.team_id === team.id || data?.teamId === team.id
            const isPending = data?.status === 'pending'
            return matchesTeam && isPending
          })
          .map((doc: any) => {
            const data = doc.data()
            return {
              id: String(doc.id),
              userId: String(data?.user_id || data?.userId || ''),
              userName: String(data?.user_name || data?.userName || 'Driver'),
              userAvatar: data?.user_avatar || data?.userAvatar ? String(data.user_avatar || data.userAvatar) : null,
              contactInfo: String(data?.contact_info || data?.contactInfo || 'Discord / Steam'),
              message: String(data?.message || ''),
              createdAt: formatFirestoreValue(data?.created_at || data?.createdAt) || new Date().toISOString(),
            }
          })
      } catch (err) {
        console.error('Failed to fetch applications for team:', err)
      }
    } catch (error) {
      console.error('Failed to load details from Firestore for team:', error)
    }
  }

  // ── Mock mode pending applications ─────────────────────────────────────────
  if (!hasFirebase) {
    try {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const appsVal = cookieStore.get('mock_market_applications')?.value
      const allApps = appsVal ? JSON.parse(appsVal) : []
      pendingApplications = allApps.filter((a: any) => a.teamId === team.id && a.status === 'pending').map((a: any) => ({
        id: a.id, userId: a.userId, userName: a.userName || 'Driver', userAvatar: a.userAvatar || null,
        contactInfo: a.contactInfo || 'Discord / Steam', message: a.message || '', createdAt: a.createdAt || new Date().toISOString()
      }))
    } catch { }
  }

  // ── Derived values ─────────────────────────────────────────────────────────
  const accent = team.accentColor || team.primaryColor || '#1274de'
  const accentSoft = hexToRgba(accent, 0.28)
  const accentHard = hexToRgba(accent, 0.62)

  const coOwners = (teamPilots.length > 0 ? teamPilots : team.members.map((member: any) => ({
    name: member.displayName || member.steamDisplayName || member.steamId || member.userId,
    role: member.role,
  })))
    .filter((p: any) => p.role === 'manager')
    .map((p: any) => p.name)

  const teamMembersOptions = (teamPilots.length > 0 ? teamPilots : team.members.map((member: any) => ({
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

      {/* Banner + top stats */}
      <TeamBannerStats
        team={team}
        canManage={canManage}
        canDelete={canDelete}
        ownerDisplayName={ownerDisplayName}
        coOwners={coOwners}
        teamPilots={teamPilots}
        stats={stats}
        accentSoft={accentSoft}
        accentHard={accentHard}
        leagueParticipation={leagueParticipation}
      />

      {/* Status message */}
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

      {/* Performance stats row */}
      <section className="grid gap-[1px] overflow-hidden border border-shell-line bg-shell-line md:grid-cols-5 rounded-none">
        {[
          { label: 'Wins', value: stats.wins },
          { label: 'Podiums', value: stats.podiums },
          { label: 'DNFs', value: stats.dnf },
          { label: 'DSQs', value: stats.dsq },
          { label: 'Races run', value: stats.racesRun },
        ].map((item) => (
          <div key={item.label} className="bg-[#0b1320] p-4 rounded-none">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
            <p className="mt-1 text-4xl font-black italic text-white">{item.value}</p>
          </div>
        ))}
      </section>

      {/* Drivers + Vehicles */}
      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <TeamDriversSection
          team={team}
          canManage={canManage}
          teamPilots={teamPilots}
          pendingApplications={pendingApplications}
          accentSoft={accentSoft}
        />
        <TeamVehiclesSection
          team={team}
          canManage={canManage}
          accentHard={accentHard}
          takenDorsals={takenDorsals}
          leaguesOptions={leaguesOptions}
          teamMembersOptions={teamMembersOptions}
          leagues={leagues}
        />
      </section>

      {/* Leagues + Results */}
      <TeamLeaguesSection
        leagueParticipation={leagueParticipation}
        recentResults={recentResults}
        accentHard={accentHard}
      />

      <div>
        <Link href="/equipos" className="border border-shell-line bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 rounded-none">
          Back to teams
        </Link>
      </div>
    </div>
  )
}
