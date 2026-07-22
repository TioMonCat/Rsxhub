import { notFound } from 'next/navigation'
import { getCurrentUser, getAdminAccessContext } from '@/lib/auth'
import { getLeagueBySlug, getLeagueCars, getLeagueEvents, getRegistrations, getEventConfirmations } from '@/lib/platform-data'
import { getFirestoreDb, hasFirebase } from '@/lib/firebase'
import { getTeamsDashboard } from '@/lib/team-data'
import LeagueDetailPageContent from './page-content'

export default async function LigaDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const league = await getLeagueBySlug(slug)
  const session = await getCurrentUser()

  if (!league) return notFound()

  const access = await getAdminAccessContext(session?.userId)
  const isAdmin = access.canAccessPlatformAdmin

  const events = await getLeagueEvents(league.id)
  const leagueCars = await getLeagueCars(league.id)
  const registrations = await getRegistrations(league.id)
  const confirmations = await getEventConfirmations(league.id)

  const { teams, myTeamIds } = session ? await getTeamsDashboard(session.userId) : { teams: [], myTeamIds: [] as string[] }
  const managedTeams = teams.filter((team) => myTeamIds.includes(team.id))

  const teamInfoById = new Map<
    string,
    {
      name: string
      primaryColor: string | null
      logoUrl: string | null
    }
  >()

  const db = getFirestoreDb()
  const registrationTeamIds = Array.from(new Set(registrations.map((item) => item.teamId).filter(Boolean))) as string[]

  if (hasFirebase && db && registrationTeamIds.length > 0) {
    try {
      const chunks = []
      for (let i = 0; i < registrationTeamIds.length; i += 10) {
        chunks.push(registrationTeamIds.slice(i, i + 10))
      }
      const teamSnaps = await Promise.all(chunks.map((chunk: any) => db.collection('teams').where('__name__', 'in', chunk).get()))
      const teamsRows = teamSnaps.flatMap((snap: any) => snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })))

      for (const row of teamsRows) {
        teamInfoById.set(row.id, {
          name: row.name,
          primaryColor: row.primary_color || null,
          logoUrl: row.logo_url || null,
        })
      }
    } catch (e) {
      console.error(e)
    }
  } else if (!hasFirebase && registrationTeamIds.length > 0) {
    try {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const existing = cookieStore.get('mock_teams')?.value
      const allMockTeams: any[] = existing ? JSON.parse(existing) : []
      for (const t of allMockTeams) {
        if (registrationTeamIds.includes(t.id)) {
          teamInfoById.set(t.id, {
            name: t.name,
            primaryColor: t.primaryColor || null,
            logoUrl: cookieStore.get(`mock_team_logo_${t.id}`)?.value || t.logoUrl || null,
          })
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Map to serializable structures
  const serializableLeague = {
    id: league.id,
    title: league.title,
    slug: league.slug,
    simulator: league.simulator,
    format: league.format,
    classTags: league.classTags || [],
    startsAt: league.startsAt,
    endsAt: league.endsAt,
    maxDrivers: league.maxDrivers ?? null,
    classLimits: league.classLimits || null,
    registrationOpen: !!league.registrationOpen,
    fullDescription: league.fullDescription || '',
    status: league.status,
    bannerUrl: league.bannerUrl || null,
    logoUrl: (league as any).logoUrl || null,
  }

  const serializableEvents = events.map((e) => ({
    id: e.id,
    leagueId: e.leagueId,
    circuitId: e.circuitId ?? null,
    title: e.title ?? null,
    circuitName: e.circuitName,
    circuitImageUrl: e.circuitImageUrl ?? null,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    status: e.status,
  }))

  const serializableSession = session
    ? {
        userId: session.userId,
        steamDisplayName: session.steamDisplayName,
      }
    : null

  const serializableRegistrations = registrations
    .filter((r) => !r.teamId || teamInfoById.has(r.teamId))
    .map((r) => ({
      id: r.id,
      leagueId: r.leagueId,
      userId: r.userId,
      teamId: r.teamId || null,
      displayName: r.displayName || '',
      classTag: r.classTag || null,
      assignedNumber: r.assignedNumber ?? null,
      status: r.status,
    }))

  const serializableManagedTeams = managedTeams.map((t) => ({
    id: t.id,
    name: t.name,
    logoUrl: t.logoUrl || null,
    members: t.members.map((m) => ({
      userId: m.userId,
      displayName: m.displayName || m.steamDisplayName || m.steamId || m.userId,
    })),
    cars: (t as any).cars || [],
  }))

  const serializableLeagueCars = leagueCars.map((c) => ({
    id: c.id,
    label: c.label,
    model: c.model,
  }))

  const serializableTeamInfo: Record<string, { name: string; primaryColor: string | null; logoUrl: string | null }> = {}
  teamInfoById.forEach((val, key) => {
    serializableTeamInfo[key] = val
  })

  const serializableConfirmations = confirmations.map((c) => ({
    id: c.id,
    eventId: c.eventId,
    leagueId: c.leagueId,
    teamId: c.teamId,
    classTag: c.classTag,
    carNumber: c.carNumber,
    carModel: c.carModel || '',
    status: c.status,
  }))

  return (
    <LeagueDetailPageContent
      league={serializableLeague}
      initialEvents={serializableEvents}
      isAdmin={isAdmin}
      session={serializableSession}
      initialRegistrations={serializableRegistrations}
      myManagedTeams={serializableManagedTeams}
      leagueCars={serializableLeagueCars}
      teamInfo={serializableTeamInfo}
      initialConfirmations={serializableConfirmations}
    />
  )
}
