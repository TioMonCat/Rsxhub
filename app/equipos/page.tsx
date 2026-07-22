import { getCurrentUser } from '@/lib/auth'
import { getLeagues } from '@/lib/platform-data'
import { getTeamsDashboard } from '@/lib/team-data'
import { createTeam } from './actions'
import EquiposContent from './equipos-content'

function statusMessage(params: {
  created?: string
  updated?: string
  invite?: string
  memberRemoved?: string
  error?: string
  mode?: string
}) {
  if (params.mode === 'mock') return { kind: 'warn', text: 'Demo Mode: data will be saved locally in your browser.' }
  if (params.created === '1') return { kind: 'ok', text: 'Team created successfully.' }
  if (params.updated === '1') return { kind: 'ok', text: 'Team updated successfully.' }
  if (params.invite === '1') return { kind: 'ok', text: 'Invitation sent.' }
  if (params.memberRemoved === '1') return { kind: 'ok', text: 'Driver removed from team.' }
  if (params.error === 'already-member') return { kind: 'warn', text: 'This driver is already a member of this team.' }
  if (params.error === 'already-in-a-team') return { kind: 'warn', text: 'You cannot create a team if you already belong to one.' }
  if (params.error === 'owner-protected') return { kind: 'warn', text: 'You cannot remove the team owner.' }
  if (params.error) return { kind: 'error', text: 'Failed to complete action.' }
  return null
}

export default async function EquiposPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string
    updated?: string
    invite?: string
    memberRemoved?: string
    error?: string
    mode?: string
  }>
}) {
  const params = await searchParams
  const session = await getCurrentUser()
  const leagues = await getLeagues()
  const { teams, myTeamIds } = await getTeamsDashboard(session?.userId)
  const message = statusMessage(params)

  const belongsToTeam = session ? teams.some((team: any) =>
    team.ownerUserId === session.userId ||
    (Array.isArray(team.members) && team.members.some((m: any) => m.userId === session.userId))
  ) : false

  const leaguesOptions = leagues.map((league) => ({
    slug: league.slug,
    title: league.title,
  }))

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={`border px-4 py-3 text-sm rounded-none shadow-md ${
            message.kind === 'ok'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
              : message.kind === 'warn'
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
              : 'border-red-500/30 bg-red-500/10 text-red-100'
          }`}
        >
          {message.text}
        </div>
      )}

      <EquiposContent
        teams={teams as any}
        leagues={leaguesOptions}
        createTeamAction={createTeam}
        session={session}
        hasOwnedTeam={myTeamIds.length > 0}
        belongsToTeam={belongsToTeam}
      />
    </div>
  )
}
