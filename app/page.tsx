import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { getRegistrations, getLeagues } from '@/lib/platform-data'
import { getTeamsDashboard } from '@/lib/team-data'
import { getFirestoreDb, hasFirebase } from '@/lib/firebase'
import { simulatorLabel } from '@/lib/utils'
import { respondTeamInvite } from './perfil/actions'
import { SteamLoginButton } from '@/components/steam-login-button'
import { getCountryName, getCountryFlag } from '@/lib/countries'
import { ClassBadge } from '@/components/class-badge'

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>
}) {
  const session = await getCurrentUser()
  const qs = await searchParams

  if (!session) {
    return (
      <div className="shell-panel p-6 rounded-none text-white">
        <h1 className="text-2xl font-bold text-white">Sign in required</h1>
        <p className="mt-2 text-slate-400">Use Steam login to access your profile and registrations.</p>
        <SteamLoginButton className="mt-4 inline-flex px-4 py-2 text-sm font-bold text-white bg-shell-accent rounded-none cursor-pointer hover:opacity-90 transition-opacity">
          Sign in with Steam
        </SteamLoginButton>
      </div>
    )
  }

  let profile = {
    id: '',
    displayName: session.steamDisplayName,
    countryCode: 'ES',
    bio: '',
    mainSim: 'ac' as const,
    avatarUrl: session.avatarUrl ?? null,
    steamId: session.steamId,
    steamDisplayName: session.steamDisplayName,
    preferredCategories: [] as string[],
  }
  let pendingInvites: Array<{ id: string; teamName: string; teamLogoUrl: string | null; invitedBy: string; message: string | null }> = []

  const db = getFirestoreDb()
  if (hasFirebase && db) {
    try {
      const doc = await db.collection('profiles').doc(session.userId).get()
      if (doc.exists) {
        const data = doc.data()
        profile = {
          id: doc.id,
          displayName: data.display_name || session.steamDisplayName,
          countryCode: data.country_code || 'ES',
          bio: data.bio || '',
          mainSim: data.main_sim || 'ac',
          avatarUrl: data.avatar_url || session.avatarUrl || null,
          steamId: session.steamId,
          steamDisplayName: session.steamDisplayName,
          preferredCategories: data.preferred_categories || [],
        }
      }

      const invitesSnapshot = await db
        .collection('team_invites')
        .where('status', '==', 'pending')
        .get()

      const matchingInvites = invitesSnapshot.docs
        .map((doc: any) => ({ id: doc.id, ...doc.data() }))
        .filter((item: any) => item.invited_user_id === session.userId || String(item.invited_steam_id || '') === session.steamId)

      const teamIds = Array.from(new Set(matchingInvites.map((item: any) => item.team_id)))
      const inviterIds = Array.from(new Set(matchingInvites.map((item: any) => item.invited_by_user_id)))

      let teamDocs: any[] = []
      let profileDocs: any[] = []
      let steamDocs: any[] = []

      if (teamIds.length > 0) {
        const snaps = await Promise.all(teamIds.map((id: any) => db.collection('teams').doc(id).get()))
        teamDocs = snaps.filter((s: any) => s.exists).map((s: any) => ({ id: s.id, ...s.data() }))
      }
      if (inviterIds.length > 0) {
        const pSnaps = await Promise.all(inviterIds.map((id: any) => db.collection('profiles').doc(id).get()))
        profileDocs = pSnaps.filter((s: any) => s.exists).map((s: any) => ({ id: s.id, ...s.data() }))

        const sSnaps = await Promise.all(inviterIds.map((id: any) => db.collection('steam_accounts').doc(id).get()))
        steamDocs = sSnaps.filter((s: any) => s.exists).map((s: any) => ({ id: s.id, ...s.data() }))
      }

      const teamById = new Map(teamDocs.map((t: any) => [t.id, { name: t.name || '', logoUrl: t.logo_url || t.logoUrl || null }]))
      const inviterNameByUserId = new Map(profileDocs.map((p: any) => [p.user_id, p.display_name || '']))
      steamDocs.forEach((s: any) => {
        if (!inviterNameByUserId.get(s.user_id)) {
          inviterNameByUserId.set(s.user_id, s.steam_display_name || '')
        }
      })

      pendingInvites = matchingInvites.map((item: any) => {
        const teamInfo = teamById.get(item.team_id)
        return {
          id: item.id,
          teamName: teamInfo?.name || 'Team',
          teamLogoUrl: teamInfo?.logoUrl || null,
          invitedBy: inviterNameByUserId.get(item.invited_by_user_id) || 'User',
          message: item.message,
        }
      })
    } catch (e) {
      console.error('Failed to load profile details from Firestore:', e)
    }
  }

  // Load mock invites if pendingInvites is empty
  if (pendingInvites.length === 0) {
    try {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const mockProfile = cookieStore.get(`mock_profile_${session.userId}`)?.value || cookieStore.get('mock_profile')?.value
      if (mockProfile) {
        const parsed = JSON.parse(mockProfile)
        if (!parsed.user_id || parsed.user_id === session.userId) {
          profile.displayName = parsed.display_name || profile.displayName
          profile.countryCode = parsed.country_code || profile.countryCode
          profile.bio = parsed.bio || profile.bio
          profile.mainSim = parsed.main_sim || profile.mainSim
          profile.avatarUrl = parsed.avatar_url || profile.avatarUrl
          profile.preferredCategories = parsed.preferred_categories || profile.preferredCategories
        }
      }

      const mockInvitesVal = cookieStore.get('mock_invites')?.value
      const mockMarketInvitesVal = cookieStore.get('mock_market_invites')?.value
      const mockInvites = mockInvitesVal ? JSON.parse(mockInvitesVal) : []
      const mockMarketInvites = mockMarketInvitesVal ? JSON.parse(mockMarketInvitesVal) : []
      const dashboard = await getTeamsDashboard(session.userId)
      const teamMap = new Map(dashboard.teams.map((t) => [t.id, t]))

      const combinedMock = [...mockInvites, ...mockMarketInvites]
      combinedMock.forEach((inv: any) => {
        const targetUserId = inv.invited_user_id || inv.invitedUserId
        const targetSteamId = String(inv.invited_steam_id || inv.invitedSteamId || '')
        const isTarget = (targetUserId && targetUserId === session.userId) || (targetSteamId && targetSteamId === session.steamId)
        const isPending = inv.status === 'pending'
        if (isTarget && isPending) {
          const team = teamMap.get(inv.team_id || inv.teamId)
          const teamLogoUrl = inv.teamLogo || team?.logoUrl || cookieStore.get(`mock_team_logo_${inv.team_id || inv.teamId}`)?.value || null
          pendingInvites.push({
            id: inv.id,
            teamName: team?.name || inv.teamName || 'Team',
            teamLogoUrl,
            invitedBy: inv.invitedBy || 'Team Admin',
            message: inv.message || null,
          })
        }
      })
    } catch (e) {
      console.error('Failed to read mock_profile or invites cookie:', e)
    }
  }

  const registrations = (await getRegistrations()).filter((item) => item.userId === session.userId)
  const leagues = await getLeagues()

  return (
    <div className="space-y-4 text-white">
      <div className="shell-panel p-5 md:p-6 rounded-none">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start md:items-center gap-4">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.displayName}
                width={64}
                height={64}
                className="h-16 w-16 rounded-full object-cover ring-2 ring-white/10 flex-shrink-0"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-shell-accent/20 text-xl font-bold text-shell-accent border border-shell-accent/30 flex-shrink-0">
                {profile.displayName.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">{getCountryFlag(profile.countryCode)}</span>
                <h1 className="text-2xl font-bold tracking-tight text-white">{profile.displayName}</h1>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Steam ID: {session.steamId} · {getCountryName(profile.countryCode)} · {simulatorLabel(profile.mainSim)}
              </p>
              {profile.bio ? <p className="mt-2 text-sm text-slate-300 max-w-xl">{profile.bio}</p> : null}
            </div>
          </div>
          <Link
            href="/perfil/editar"
            className="self-start md:self-center border border-shell-line bg-black/40 hover:bg-slate-800 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-200 rounded-none transition-colors"
          >
            Edit Profile
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="shell-panel p-5 rounded-none">
          <h2 className="text-lg font-bold text-white">General Data</h2>
          <dl className="mt-3 space-y-2 text-sm text-slate-300">
            <div>
              <dt className="text-xs text-slate-400 font-mono uppercase">Steam</dt>
              <dd className="font-semibold text-white">{profile.steamDisplayName}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400 font-mono uppercase">Steam ID</dt>
              <dd className="font-mono text-slate-300">{profile.steamId}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400 font-mono uppercase">Country</dt>
              <dd>{getCountryFlag(profile.countryCode)} {getCountryName(profile.countryCode)} ({profile.countryCode})</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400 font-mono uppercase">Main Sim</dt>
              <dd>{simulatorLabel(profile.mainSim)}</dd>
            </div>
          </dl>
        </div>

        <div className="shell-panel p-5 rounded-none">
          <h2 className="text-lg font-bold text-white">My Registrations</h2>
          <div className="mt-3 space-y-2 text-sm">
            {registrations.length === 0 ? (
              <p className="text-slate-400">No league registrations yet.</p>
            ) : (
              registrations.map((registration) => {
                const league = leagues.find((item) => item.id === registration.leagueId)
                return (
                  <div key={registration.id} className="border border-shell-line bg-black/20 p-3 rounded-none">
                    <p className="font-semibold text-white">{league?.title ?? 'League'}</p>
                    <p className="text-xs text-slate-400">
                      Status: {registration.status}
                      {registration.classTag ? ` · ${registration.classTag}` : ''}
                      {registration.assignedNumber ? ` · #${registration.assignedNumber}` : ''}
                    </p>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {qs.invite === 'accepted' ? <div className="border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100 rounded-none">Invitation accepted.</div> : null}
      {qs.invite === 'rejected' ? <div className="border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100 rounded-none">Invitation rejected.</div> : null}
      {qs.invite === 'error' ? <div className="border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100 rounded-none">Could not accept the invitation.</div> : null}
      {qs.invite === 'multi-team-schema' ? <div className="border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100 rounded-none">Your database only allows one team per user. Run the migration to allow multiple teams.</div> : null}

      <div className="shell-panel p-5 rounded-none">
        <h2 className="text-lg font-bold text-white uppercase tracking-tight">Team Invitations</h2>
        <div className="mt-3 space-y-3">
          {pendingInvites.length === 0 ? (
            <p className="text-sm text-slate-400">You have no pending invitations.</p>
          ) : (
            pendingInvites.map((invite) => (
              <div key={invite.id} className="border border-shell-line bg-black/40 p-4 rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  {invite.teamLogoUrl ? (
                    <img
                      src={invite.teamLogoUrl}
                      alt={invite.teamName}
                      className="h-12 w-12 object-contain border border-white/10 bg-black/60 p-1 flex-shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-black text-base flex-shrink-0">
                      {invite.teamName.substring(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div>
                    <h4 className="font-bold text-white uppercase text-sm tracking-wide">{invite.teamName}</h4>
                    <p className="text-xs text-slate-400">Invited by: <span className="text-slate-200 font-semibold">{invite.invitedBy}</span></p>
                    {invite.message && (
                      <p className="mt-1 text-xs text-slate-300 italic bg-black/30 px-2.5 py-0.5 border-l-2 border-cyan-400">
                        "{invite.message}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <form action={respondTeamInvite}>
                    <input type="hidden" name="inviteId" value={invite.id} />
                    <input type="hidden" name="decision" value="accepted" />
                    <button type="submit" className="border border-emerald-500/50 bg-emerald-950/80 hover:bg-emerald-500/20 text-emerald-300 px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer">
                      Accept
                    </button>
                  </form>
                  <form action={respondTeamInvite}>
                    <input type="hidden" name="inviteId" value={invite.id} />
                    <input type="hidden" name="decision" value="rejected" />
                    <button type="submit" className="border border-rose-500/50 bg-rose-950/80 hover:bg-rose-500/20 text-rose-300 px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer">
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="shell-panel p-5 rounded-none">
        <h2 className="text-lg font-bold text-white">Category Preferences</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {profile.preferredCategories.length === 0 ? (
            <p className="text-sm text-slate-400">No category preferences set yet.</p>
          ) : (
            profile.preferredCategories.map((category) => (
              <ClassBadge key={category} classTag={category} className="px-3.5 py-1.5 text-xs font-black shadow-md" />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
