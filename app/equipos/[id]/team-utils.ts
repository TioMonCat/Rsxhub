// ─── Local types used only inside the team profile page ───────────────────────

export type TeamStats = {
  leagues: number
  activeLeagues: number
  approvedEntries: number
  pendingEntries: number
  upcomingEvents: number
  wins: number
  podiums: number
  racesRun: number
  dnf: number
  dsq: number
}

export type TeamPilot = {
  userId: string
  name: string
  role: string
  avatarUrl: string | null
  steamId?: string
}

export type CategoryStat = {
  classTag: string
  points: number
  carsCount: number
  driversCount: number
}

export type LeagueParticipation = {
  leagueId: string
  title: string
  bannerUrl: string | null
  status: string
  simulator: string
  teamDriversInLeague: number
  approvedEntries: number
  pendingEntries: number
  nextEventAt: string | null
  categories?: CategoryStat[]
}

export type RecentResult = {
  id: string
  leagueTitle: string
  eventTitle: string
  position: number
  points: number | null
  at: string
}

export type PendingApplication = {
  id: string
  userId: string
  userName: string
  userAvatar: string | null
  contactInfo: string
  message?: string
  createdAt: string
}

// ─── Helper functions ─────────────────────────────────────────────────────────

export function profileStatusMessage(params: {
  updated?: string
  invite?: string
  memberRemoved?: string
  roleUpdated?: string
  error?: string
}) {
  if (params.updated === '1') return { kind: 'ok', text: 'Team updated.' }
  if (params.invite === '1') return { kind: 'ok', text: 'Invitation sent.' }
  if (params.memberRemoved === '1') return { kind: 'ok', text: 'Driver removed from team.' }
  if (params.roleUpdated === '1') return { kind: 'ok', text: 'Role updated.' }
  if (params.error === 'already-member') return { kind: 'warn', text: 'This driver is already a member of this team.' }
  if (params.error === 'owner-protected') return { kind: 'warn', text: 'You cannot remove the team owner.' }
  if (params.error === 'invalid-role') return { kind: 'warn', text: 'Invalid role.' }
  if (params.error === 'dorsal-duplicate') return { kind: 'error', text: 'Error: One of the selected dorsals already belongs to another team or is duplicated.' }
  if (params.error) return { kind: 'error', text: 'Could not complete the action.' }
  return null
}

export function hexToRgba(hexColor: string | null | undefined, alpha: number) {
  const value = String(hexColor || '')
    .replace('#', '')
    .trim()
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return `rgba(18,116,222,${alpha})`
  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
