import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAdminAccessContext, getCurrentUser } from '@/lib/auth'
import { getLeagueEvents, getLeagues, getRegistrations } from '@/lib/platform-data'
import { getTeamsDashboard } from '@/lib/team-data'
import { getFirestoreDb, hasFirebase } from '@/lib/firebase'
import { simulatorLabel, statusLabel } from '@/lib/utils'
import { SubmitButton } from '@/components/submit-button'
import { DeleteLeagueButton } from '@/components/delete-league-button'
import { AdminGallery } from '@/components/admin-gallery'
import { createLeague, adminDeleteMarketListing, quickUpdateLeagueStatusAction, quickToggleLeagueRegistrationAction, quickToggleLeagueFeaturedAction, quickUpdateLeagueMaxDriversAction, deleteLeagueAction, resetDatabaseAction } from './actions'

function statusClass(status: string) {
  if (status === 'open') return 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
  if (status === 'ongoing') return 'border-[#1274de]/50 bg-[#1274de]/20 text-[#8cc6ff]'
  if (status === 'finished') return 'border-slate-300/20 bg-slate-500/15 text-slate-200'
  return 'border-amber-300/40 bg-amber-500/15 text-amber-100'
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ 
    created?: string 
    mode?: string 
    classError?: string 
    registrationModeError?: string
    tab?: string
    deleted_listing?: string
    reset?: string
  }>
}) {
  const session = await getCurrentUser()
  const params = await searchParams
  if (!session) redirect('/perfil')

  const access = await getAdminAccessContext(session.userId)
  if (!access.canAccessPlatformAdmin) redirect('/perfil')

  // Load baseline statistics data
  const leagues = await getLeagues()
  const events = await getLeagueEvents()
  const registrations = await getRegistrations()

  // Load all platform teams
  const { teams } = await getTeamsDashboard(session.userId)

  // Load all market listings
  let listings: any[] = []
  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        const teamsSnap = await db.collection('teams').get()
        const teamsColors = new Map<string, string>()
        teamsSnap.docs.forEach((doc: any) => {
          const t = doc.data()
          teamsColors.set(doc.id, t.primary_color || null)
        })

        const snap = await db.collection('market_listings').orderBy('created_at', 'desc').get()
        listings = snap.docs.map((doc: any) => {
          const data = doc.data()
          const createdAtVal = data.created_at && typeof data.created_at.toDate === 'function'
            ? data.created_at.toDate().toISOString()
            : data.created_at || new Date().toISOString()
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
      } catch (error) {
        console.error('Failed to get market listings from Firestore:', error)
      }
    }
  } else {
    // Mock Mode Fallback
    try {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const existing = cookieStore.get('mock_market_listings')?.value
      if (existing) {
        listings = JSON.parse(existing)
      }
    } catch {}
  }

  const visibleLeagues = access.canAccessPlatformAdmin
    ? leagues
    : leagues.filter((league) => access.managedLeagueIds.includes(league.id))

  const visibleLeagueIds = visibleLeagues.map((league) => league.id)
  const visibleEvents = access.canAccessPlatformAdmin
    ? events
    : events.filter((event) => visibleLeagueIds.includes(event.leagueId))
  const visibleRegistrations = access.canAccessPlatformAdmin
    ? registrations
    : registrations.filter((item) => visibleLeagueIds.includes(item.leagueId))

  const activeTab = params.tab || 'leagues'

  return (
    <div className="space-y-6 text-white">
      {/* Overview stats */}
      <section className="shell-panel p-4 md:p-5 rounded-none">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-bold">Quick Access</p>
        <h1 className="mt-1 text-3xl font-black uppercase italic text-white tracking-tight">LEAGUES</h1>
        <p className="mt-1 text-xs text-slate-400">Operate leagues, teams and market listings from a central control room.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          <div className="rounded-none border border-shell-line bg-black/20 p-4">
            <p className="text-xxs uppercase tracking-wider text-slate-400 font-bold">Visible Leagues</p>
            <p className="mt-1.5 text-2xl font-black italic text-white">{visibleLeagues.length}</p>
          </div>
          <div className="rounded-none border border-shell-line bg-black/20 p-4">
            <p className="text-xxs uppercase tracking-wider text-slate-400 font-bold">Visible Events</p>
            <p className="mt-1.5 text-2xl font-black italic text-white">{visibleEvents.length}</p>
          </div>
          <div className="rounded-none border border-shell-line bg-black/20 p-4">
            <p className="text-xxs uppercase tracking-wider text-slate-400 font-bold">Active Teams</p>
            <p className="mt-1.5 text-2xl font-black italic text-[#1274de]">{teams.length}</p>
          </div>
          <div className="rounded-none border border-shell-line bg-black/20 p-4">
            <p className="text-xxs uppercase tracking-wider text-slate-400 font-bold">Market Listings</p>
            <p className="mt-1.5 text-2xl font-black italic text-emerald-400">{listings.length}</p>
          </div>
        </div>

        {params.mode === 'mock' && (
          <div className="mt-4 rounded-none border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            Demo mode active: connect Firestore db for persistence.
          </div>
        )}
        {params.created === '1' && (
          <div className="mt-4 rounded-none border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100 font-semibold">
            League created successfully.
          </div>
        )}
        {params.deleted_listing === '1' && (
          <div className="mt-4 rounded-none border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100 font-semibold">
            Driver Market listing deleted successfully.
          </div>
        )}
        {params.reset === 'success' && (
          <div className="mt-4 rounded-none border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100 font-bold">
            Data cleanup completed successfully! The platform has been reset from scratch.
          </div>
        )}
      </section>

      {/* Tabs navigation */}
      <div className="flex border border-shell-line bg-black/20 p-1 rounded-none w-fit">
        <Link
          href="/admin?tab=leagues"
          className={`px-6 py-2.5 text-xs font-black tracking-wide uppercase transition-colors rounded-none ${
            activeTab === 'leagues'
              ? 'bg-[#1274de] text-white'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Leagues ({visibleLeagues.length})
        </Link>
        <Link
          href="/admin?tab=teams"
          className={`px-6 py-2.5 text-xs font-black tracking-wide uppercase transition-colors rounded-none ${
            activeTab === 'teams'
              ? 'bg-[#1274de] text-white'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Teams ({teams.length})
        </Link>
        <Link
          href="/admin?tab=market"
          className={`px-6 py-2.5 text-xs font-black tracking-wide uppercase transition-colors rounded-none ${
            activeTab === 'market'
              ? 'bg-[#1274de] text-white'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Driver Market ({listings.length})
        </Link>
        <Link
          href="/admin?tab=gallery"
          className={`px-6 py-2.5 text-xs font-black tracking-wide uppercase transition-colors rounded-none ${
            activeTab === 'gallery'
              ? 'bg-[#1274de] text-white'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Photo Gallery
        </Link>
        <Link
          href="/admin?tab=system"
          className={`px-6 py-2.5 text-xs font-black tracking-wide uppercase transition-colors rounded-none ${
            activeTab === 'system'
              ? 'bg-[#1274de] text-white'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Data Cleanup
        </Link>
      </div>

      {/* TAB CONTENT: LEAGUES */}
      {activeTab === 'leagues' && (
        <div className="space-y-6">
          {/* Leagues list */}
          <section className="shell-panel p-4 md:p-5 rounded-none space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-350">Leagues Control Center</h2>
            <p className="text-xs text-slate-400">Centrally modify configuration, adjust driver limits, or delete hosted leagues without leaving this dashboard.</p>

            <div className="overflow-x-auto border border-shell-line bg-black/10">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-shell-line bg-black/30 text-xxs font-black uppercase tracking-wider text-slate-400">
                    <th className="p-3">League</th>
                    <th className="p-3">Simulator</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Featured</th>
                    <th className="p-3">Max Drivers</th>
                    <th className="p-3 text-center">Rounds</th>
                    <th className="p-3 text-center">Teams</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                  {visibleLeagues.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 italic">No leagues assigned to your account yet.</td>
                    </tr>
                  ) : (
                    visibleLeagues.map((league) => {
                      const leagueRegistrations = Array.from(
                        new Set(
                          visibleRegistrations
                            .filter((item) => item.leagueId === league.id && item.status !== 'rejected')
                            .map((item) => `${item.teamId || item.userId}_${item.classTag || 'default'}`)
                        )
                      ).length
                      const leagueEvents = visibleEvents.filter((event) => event.leagueId === league.id).length
                      return (
                        <tr key={league.id} className="hover:bg-white/[0.02] transition-colors">
                          {/* League name / banner */}
                          <td className="p-3 font-bold text-white flex items-center gap-3">
                            <div className="w-12 h-7 bg-zinc-950 overflow-hidden border border-white/10 shrink-0 flex items-center justify-center">
                              {league.bannerUrl ? (
                                <img src={league.bannerUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[10px] text-slate-600 font-extrabold uppercase">L</span>
                              )}
                            </div>
                            <span className="truncate max-w-[180px]" title={league.title}>{league.title}</span>
                          </td>
                          {/* Simulator */}
                          <td className="p-3 text-slate-400 font-semibold">{simulatorLabel(league.simulator)}</td>
                          {/* Status select form */}
                          <td className="p-3">
                            <form action={quickUpdateLeagueStatusAction} className="flex items-center gap-1.5">
                              <input type="hidden" name="leagueId" value={league.id} />
                              <select
                                name="status"
                                defaultValue={league.status}
                                className="rounded-none border border-shell-line bg-black/45 px-2 py-1 text-xxs font-bold text-slate-200 outline-none cursor-pointer focus:border-white/30 uppercase tracking-wider"
                              >
                                <option value="draft">Draft</option>
                                <option value="open">Open</option>
                                <option value="ongoing">Ongoing</option>
                                <option value="finished">Finished</option>
                              </select>
                              <button type="submit" className="border border-white/20 bg-white/5 hover:bg-[#1274de] hover:border-[#1274de] px-2 py-1 text-[9px] uppercase font-black text-white transition-colors cursor-pointer">
                                Save
                              </button>
                            </form>
                          </td>
                          {/* Featured Toggle */}
                          <td className="p-3">
                            <form action={quickToggleLeagueFeaturedAction}>
                              <input type="hidden" name="leagueId" value={league.id} />
                              <button type="submit" className={`px-2 py-1 text-[9px] font-black uppercase border rounded-none cursor-pointer transition-colors ${
                                league.featured 
                                  ? 'border-amber-500/35 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20' 
                                  : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                              }`}>
                                {league.featured ? '★ Featured' : '☆ Standard'}
                              </button>
                            </form>
                          </td>
                          {/* Max Drivers edit form */}
                          <td className="p-3">
                            <form action={quickUpdateLeagueMaxDriversAction} className="flex items-center gap-1.5">
                              <input type="hidden" name="leagueId" value={league.id} />
                              <input
                                type="number"
                                name="maxDrivers"
                                defaultValue={league.maxDrivers || ''}
                                placeholder="∞"
                                className="w-14 rounded-none border border-shell-line bg-black/45 px-2 py-1 text-center text-xs text-white outline-none focus:border-white/30"
                              />
                              <button type="submit" className="border border-white/20 bg-white/5 hover:bg-[#1274de] hover:border-[#1274de] px-1.5 py-1 text-[9px] uppercase font-black text-white transition-colors cursor-pointer">
                                Set
                              </button>
                            </form>
                          </td>
                          {/* Rounds count */}
                          <td className="p-3 text-center font-bold text-slate-200">{leagueEvents}</td>
                          {/* Registrations count */}
                          <td className="p-3 text-center font-bold text-slate-200">{leagueRegistrations}</td>
                          {/* Actions */}
                          <td className="p-3 text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <DeleteLeagueButton
                                leagueId={league.id}
                                leagueTitle={league.title}
                                deleteAction={deleteLeagueAction}
                              />
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* TAB CONTENT: TEAMS */}
      {activeTab === 'teams' && (
        <section className="shell-panel p-4 md:p-5 rounded-none space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-350">Platform Teams Management</h2>
          <p className="text-xs text-slate-400">View and administer any Sim Racing team. Admins have owner rights over editing, member setup, skins configuration, and deletion.</p>

          <div className="overflow-x-auto border border-shell-line bg-black/10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-shell-line bg-black/30 text-xxs font-black uppercase tracking-wider text-slate-400">
                  <th className="p-3">Logo</th>
                  <th className="p-3">Team Name</th>
                  <th className="p-3">Team Leader</th>
                  <th className="p-3 text-center">Drivers</th>
                  <th className="p-3">Categories</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                {teams.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 italic">No teams registered on the platform.</td>
                  </tr>
                ) : (
                  teams.map((team) => {
                    const leaderName = team.members.find((m) => m.role === 'owner')?.displayName || 'Not Set'
                    return (
                      <tr key={team.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-3">
                          {team.logoUrl ? (
                            <img src={team.logoUrl} alt={team.name} className="h-7 w-7 object-contain" />
                          ) : (
                            <div className="h-7 w-7 bg-slate-800 flex items-center justify-center text-slate-500 font-extrabold text-[10px]">
                              {team.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </td>
                        <td className="p-3 font-bold text-white">{team.name}</td>
                        <td className="p-3">{leaderName}</td>
                        <td className="p-3 text-center font-bold text-slate-200">{team.members.length}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {team.classTags && team.classTags.length > 0 ? (
                              team.classTags.map((tag: string) => (
                                <span key={tag} className="px-1.5 py-0.5 bg-white/5 border border-white/10 text-[9px] font-extrabold uppercase text-slate-300">
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-500 italic text-[10px]">None</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <Link
                            href={`/equipos/${team.id}`}
                            className="inline-block border border-shell-line bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-[#1274de] hover:border-[#1274de] transition-colors"
                          >
                            Manage Team
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB CONTENT: DRIVER MARKET */}
      {activeTab === 'market' && (
        <section className="shell-panel p-4 md:p-5 rounded-none space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-350">Driver Market Moderation</h2>
          <p className="text-xs text-slate-400">Moderate active driver recruitment listings. Admins can permanently delete listings violating platform guidelines.</p>

          <div className="overflow-x-auto border border-shell-line bg-black/10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-shell-line bg-black/30 text-xxs font-black uppercase tracking-wider text-slate-400">
                  <th className="p-3">Type</th>
                  <th className="p-3">Poster Name</th>
                  <th className="p-3">Title</th>
                  <th className="p-3">Categories</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                {listings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 italic">No listings currently active on the Driver Market.</td>
                  </tr>
                ) : (
                  listings.map((listing) => (
                    <tr key={listing.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3 font-semibold">
                        {listing.type === 'team_seeking_driver' ? (
                          <span className="text-blue-400 font-extrabold uppercase text-[10px]">Team Seeking Driver</span>
                        ) : (
                          <span className="text-emerald-400 font-extrabold uppercase text-[10px]">Driver Seeking Team</span>
                        )}
                      </td>
                      <td className="p-3 font-bold text-white">
                        {listing.type === 'team_seeking_driver' 
                          ? `${listing.user_name} (${listing.team_name || 'Team'})` 
                          : listing.user_name
                        }
                      </td>
                      <td className="p-3 truncate max-w-[200px]" title={listing.title}>{listing.title}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {listing.class_tag ? (
                            listing.class_tag.split(',').map((tag: string) => {
                              const cleaned = tag.trim().toUpperCase()
                              return cleaned ? (
                                <span key={cleaned} className="px-1.5 py-0.5 bg-white/5 border border-white/10 text-[9px] font-extrabold uppercase text-slate-300">
                                  {cleaned}
                                </span>
                              ) : null
                            })
                          ) : (
                            <span className="text-slate-500 italic text-[10px]">None</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-slate-400 text-xxs">
                        {(() => {
                          try {
                            const d = new Date(listing.created_at)
                            return isNaN(d.getTime()) ? 'Recent' : d.toLocaleDateString()
                          } catch (e) {
                            return 'Recent'
                          }
                        })()}
                      </td>
                      <td className="p-3 text-right">
                        <form action={adminDeleteMarketListing.bind(null, listing.id)}>
                          <button
                            type="submit"
                            className="border border-red-500/30 bg-red-500/5 hover:bg-red-700 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-200 hover:text-white transition-colors cursor-pointer"
                          >
                            Delete Post
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB CONTENT: SYSTEM RESET */}
      {activeTab === 'system' && (
        <section className="shell-panel p-4 md:p-5 rounded-none space-y-6">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-red-450">System Cleanup and Reset</h2>
            <p className="mt-1 text-xs text-slate-400">Resets the platform to a clean initial state, deleting all sandbox testing data.</p>
          </div>

          <div className="border border-red-500/20 bg-red-500/5 p-4 rounded-none space-y-3">
            <h3 className="text-xs font-bold text-red-300 uppercase tracking-wider">⚠️ Destructive Action Warning</h3>
            <p className="text-xs text-slate-355 leading-relaxed">
              This action will permanently and definitively delete all user-created records in the Firestore database, including:
            </p>
            <ul className="list-disc list-inside text-xs text-slate-400 space-y-1 ml-2">
              <li>All Leagues and their associated configurations</li>
              <li>All Race Events, circuit names, and assigned cars</li>
              <li>All Driver Registrations and entries (individual and team-based)</li>
              <li>All Teams, team member assignments, and invitations</li>
              <li>All uploaded race results, sheets, and statistics</li>
              <li>All active listings in the Driver Market and hiring submissions</li>
            </ul>
            <div className="pt-2 border-t border-red-500/10 text-xs text-emerald-400/90 font-medium font-semibold">
              Security note: Your current administrator account, driver profile, and linked Steam ID will be kept safe so you do not lose access to the platform.
            </div>
          </div>

          <div className="bg-black/10 border border-shell-line p-4 rounded-none space-y-4">
            <p className="text-xs text-slate-455 font-medium">
              Are you sure you want to proceed with the database cleanup? This action cannot be undone.
            </p>
            
            <form action={resetDatabaseAction}>
              <SubmitButton
                label="Confirm Complete Data Cleanup"
                pendingLabel="Cleaning database..."
                className="border border-red-500/40 bg-red-600/20 hover:bg-red-700/80 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-red-100 hover:text-white transition-colors cursor-pointer"
              />
            </form>
          </div>
        </section>
      )}

      {/* TAB CONTENT: GALLERY */}
      {activeTab === 'gallery' && (
        <section className="shell-panel p-4 md:p-5 rounded-none space-y-6">
          <AdminGallery />
        </section>
      )}
    </div>
  )
}
