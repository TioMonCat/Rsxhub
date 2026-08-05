import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAdminAccessContext, getCurrentUser } from '@/lib/auth'
import { getLeagueEvents, getLeagues, getRegistrations, getAllRegisteredDrivers } from '@/lib/platform-data'
import { getTeamsDashboard } from '@/lib/team-data'
import { fetchWithTTLCache } from '@/lib/ttl-cache'
import { getFirestoreDb, hasFirebase } from '@/lib/firebase'
import { simulatorLabel } from '@/lib/utils'
import { SubmitButton } from '@/components/submit-button'
import { DeleteLeagueButton } from '@/components/delete-league-button'
import { DeleteTeamButtonDouble } from '@/components/delete-team-button-double'
import { DeleteUserButtonDouble } from '@/components/delete-user-button-double'
import { AdminGallery } from '@/components/admin-gallery'
import { ShieldAlert, Trophy, Shield, Store, Image as ImageIcon, Trash2, Users, User } from 'lucide-react'
import {
  adminDeleteMarketListing,
  quickUpdateLeagueStatusAction,
  quickToggleLeagueFeaturedAction,
  quickUpdateLeagueMaxDriversAction,
  deleteLeagueAction,
  resetDatabaseAction,
  updateUserRoleAction,
  deleteUserAccountAction,
} from './actions'
import { deleteTeamAction } from '@/app/equipos/actions'
import { AdminLeaguesTab } from './components/admin-leagues-tab'
import { AdminTeamsTab } from './components/admin-teams-tab'

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string
    mode?: string
    classError?: string
    registrationModeError?: string
    tab?: string
    filter?: string
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

  // Load all registered drivers
  const drivers = await getAllRegisteredDrivers()

  // Load all market listings
  const listings: any[] = await fetchWithTTLCache('admin_market_listings', async () => {
    if (hasFirebase) {
      const db = getFirestoreDb()
      if (db) {
        try {
          const snap = await db.collection('market_listings').orderBy('created_at', 'desc').get()
          return snap.docs.map((doc: any) => {
            const data = doc.data()
            const createdAtVal =
              data.created_at && typeof data.created_at.toDate === 'function'
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
          return []
        }
      }
    }
    try {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const existing = cookieStore.get('mock_market_listings')?.value
      if (existing) return JSON.parse(existing)
    } catch {}
    return []
  }, 60)

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
  const marketFilter = params.filter || 'all'

  const filteredListings = listings.filter((l) => {
    if (marketFilter === 'teams') return l.type === 'team_seeking_driver'
    if (marketFilter === 'drivers') return l.type === 'driver_seeking_team'
    return true
  })

  return (
    <div className="space-y-6 text-white">
      {/* Main Page Title Header */}
      <div className="border-b border-shell-line pb-4">
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white italic flex items-center gap-3">
          <ShieldAlert className="h-7 w-7 text-cyan-400 shrink-0" />
          ADMIN CONTROL CENTER
        </h1>
        <p className="text-xs md:text-sm text-slate-400 mt-1">
          Operate leagues, teams, driver market, photo gallery and data maintenance from a central control room.
        </p>
      </div>

      {params.created === '1' && (
        <div className="rounded-none border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100 font-semibold">
          League created successfully.
        </div>
      )}
      {params.deleted_listing === '1' && (
        <div className="rounded-none border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100 font-semibold">
          Driver Market post deleted successfully.
        </div>
      )}
      {params.reset === 'success' && (
        <div className="rounded-none border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100 font-bold">
          Data cleanup completed successfully! Platform database has been reset.
        </div>
      )}

      {/* Tabs navigation */}
      <div className="flex flex-wrap border border-shell-line bg-black/40 p-1 rounded-none w-fit gap-1">
        <Link
          href="/admin?tab=leagues"
          className={`px-5 py-2 text-xs font-black tracking-wide uppercase transition-colors rounded-none flex items-center gap-2 ${
            activeTab === 'leagues'
              ? 'bg-[#1274de] text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Trophy className="h-3.5 w-3.5 text-cyan-400" />
          Leagues ({visibleLeagues.length})
        </Link>
        <Link
          href="/admin?tab=teams"
          className={`px-5 py-2 text-xs font-black tracking-wide uppercase transition-colors rounded-none flex items-center gap-2 ${
            activeTab === 'teams'
              ? 'bg-[#1274de] text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Shield className="h-3.5 w-3.5 text-cyan-400" />
          Teams ({teams.length})
        </Link>
        <Link
          href="/admin?tab=drivers"
          className={`px-5 py-2 text-xs font-black tracking-wide uppercase transition-colors rounded-none flex items-center gap-2 ${
            activeTab === 'drivers'
              ? 'bg-[#1274de] text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Users className="h-3.5 w-3.5 text-cyan-400" />
          Drivers ({drivers.length})
        </Link>
        <Link
          href="/admin?tab=market"
          className={`px-5 py-2 text-xs font-black tracking-wide uppercase transition-colors rounded-none flex items-center gap-2 ${
            activeTab === 'market'
              ? 'bg-[#1274de] text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Store className="h-3.5 w-3.5 text-cyan-400" />
          Driver Market ({listings.length})
        </Link>
        <Link
          href="/admin?tab=gallery"
          className={`px-5 py-2 text-xs font-black tracking-wide uppercase transition-colors rounded-none flex items-center gap-2 ${
            activeTab === 'gallery'
              ? 'bg-[#1274de] text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <ImageIcon className="h-3.5 w-3.5 text-cyan-400" />
          Photo Gallery
        </Link>
        <Link
          href="/admin?tab=system"
          className={`px-5 py-2 text-xs font-black tracking-wide uppercase transition-colors rounded-none flex items-center gap-2 ${
            activeTab === 'system'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-rose-300 hover:bg-white/5'
          }`}
        >
          <Trash2 className="h-3.5 w-3.5 text-rose-300" />
          Data Cleanup
        </Link>
      </div>

      {/* TAB CONTENT: LEAGUES */}
      {activeTab === 'leagues' && (
        <AdminLeaguesTab
          visibleLeagues={visibleLeagues}
          visibleRegistrations={visibleRegistrations}
          visibleEvents={visibleEvents}
        />
      )}

      {/* TAB CONTENT: TEAMS */}
      {activeTab === 'teams' && (
        <AdminTeamsTab teams={teams} />
      )}

      {/* TAB CONTENT: DRIVERS */}
      {activeTab === 'drivers' && (
        <section className="shell-panel p-4 md:p-5 rounded-none space-y-4">
          <div className="border-b border-shell-line pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-white italic">Users & Drivers Management</h2>
            <p className="text-xs text-slate-400">View registered accounts, modify platform roles, or manage accounts.</p>
          </div>

          <div className="overflow-x-auto border border-shell-line bg-black/10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-shell-line bg-black/40 text-xxs font-black uppercase tracking-wider text-slate-400">
                  <th className="p-3">Driver</th>
                  <th className="p-3">Steam ID</th>
                  <th className="p-3">Current Team</th>
                  <th className="p-3">Platform Role</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                {drivers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 italic">No registered drivers found on the platform.</td>
                  </tr>
                ) : (
                  drivers.map((driver) => (
                    <tr key={driver.userId} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3 font-bold text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                          {driver.avatarUrl ? (
                            <img src={driver.avatarUrl} alt={driver.displayName} className="w-full h-full object-cover" />
                          ) : (
                            <User className="h-4 w-4 text-cyan-400" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="truncate max-w-[200px] text-white font-bold">{driver.displayName}</span>
                        </div>
                      </td>
                      <td className="p-3 text-slate-300 font-mono text-xs">{driver.steamId || 'Unlinked'}</td>
                      <td className="p-3">
                        {driver.teamName ? (
                          <div className="flex items-center gap-2">
                            {driver.teamLogo ? (
                              <img src={driver.teamLogo} alt={driver.teamName} className="h-5 w-5 object-contain" />
                            ) : (
                              <Shield className="h-4 w-4 text-cyan-400 shrink-0" />
                            )}
                            <span className="font-bold text-slate-200">{driver.teamName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">No Team</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5">
                            {driver.role === 'platform_admin' || driver.role === 'super_admin' ? (
                              <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                                👑 Admin
                              </span>
                            ) : driver.role === 'steward' ? (
                              <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-500/40">
                                ⚖️ Steward
                              </span>
                            ) : driver.role === 'team_manager' ? (
                              <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-blue-950 text-blue-300 border border-blue-500/40">
                                🛡️ Team Manager
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-slate-900 text-slate-400 border border-slate-700">
                                🏎️ Driver
                              </span>
                            )}
                          </div>

                          <form action={updateUserRoleAction} className="flex items-center gap-1.5">
                            <input type="hidden" name="targetUserId" value={driver.userId} />
                            <select
                              name="role"
                              defaultValue={
                                driver.role === 'platform_admin' || driver.role === 'super_admin'
                                  ? 'platform_admin'
                                  : driver.role === 'steward'
                                  ? 'steward'
                                  : 'user'
                              }
                              className="rounded-none border border-shell-line bg-black/45 px-2 py-1 text-xxs font-bold text-slate-200 outline-none cursor-pointer focus:border-white/30 uppercase tracking-wider"
                            >
                              <option value="user">Driver</option>
                              <option value="steward">Steward</option>
                              <option value="platform_admin">Administrator</option>
                            </select>
                            <button
                              type="submit"
                              className="border border-white/20 bg-white/5 hover:bg-[#1274de] hover:border-[#1274de] px-2 py-1 text-[9px] uppercase font-black text-white transition-colors cursor-pointer"
                            >
                              Save
                            </button>
                          </form>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <DeleteUserButtonDouble
                          userId={driver.userId}
                          userName={driver.displayName}
                          deleteAction={deleteUserAccountAction}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB CONTENT: DRIVER MARKET */}
      {activeTab === 'market' && (
        <section className="shell-panel p-4 md:p-5 rounded-none space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-shell-line pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-white italic">Driver Market Moderation</h2>
              <p className="text-xs text-slate-400">Review market posts and team offers, edit or delete quickly.</p>
            </div>

            {/* Quick Filters */}
            <div className="flex items-center gap-1 border border-shell-line bg-black/40 p-1">
              <Link
                href="/admin?tab=market&filter=all"
                className={`px-3 py-1 text-[11px] font-bold uppercase transition-colors ${
                  marketFilter === 'all' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({listings.length})
              </Link>
              <Link
                href="/admin?tab=market&filter=teams"
                className={`px-3 py-1 text-[11px] font-bold uppercase transition-colors ${
                  marketFilter === 'teams' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Team Offers
              </Link>
              <Link
                href="/admin?tab=market&filter=drivers"
                className={`px-3 py-1 text-[11px] font-bold uppercase transition-colors ${
                  marketFilter === 'drivers' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Driver Applications
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto border border-shell-line bg-black/10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-shell-line bg-black/40 text-xxs font-black uppercase tracking-wider text-slate-400">
                  <th className="p-3">Type</th>
                  <th className="p-3">Posted By</th>
                  <th className="p-3">Title</th>
                  <th className="p-3">Categories</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                {filteredListings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 italic">No posts found in this category.</td>
                  </tr>
                ) : (
                  filteredListings.map((listing) => (
                    <tr key={listing.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3 font-semibold">
                        {listing.type === 'team_seeking_driver' ? (
                          <span className="text-cyan-400 font-extrabold uppercase text-[10px] bg-cyan-950/40 border border-cyan-800/40 px-2 py-0.5">
                            Team Seeking Driver
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-extrabold uppercase text-[10px] bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5">
                            Driver Seeking Team
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-bold text-white">
                        {listing.type === 'team_seeking_driver'
                          ? `${listing.user_name} (${listing.team_name || 'Team'})`
                          : listing.user_name}
                      </td>
                      <td className="p-3 truncate max-w-[220px]" title={listing.title}>
                        {listing.title}
                      </td>
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
                      <td className="p-3 text-slate-400 text-xxs font-mono">
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
                            className="border border-rose-500/30 bg-rose-500/10 hover:bg-rose-700 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-200 hover:text-white transition-colors cursor-pointer"
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

      {/* TAB CONTENT: GALLERY & FILES */}
      {activeTab === 'gallery' && (
        <section className="shell-panel p-4 md:p-5 rounded-none space-y-6">
          <AdminGallery />
        </section>
      )}

      {/* TAB CONTENT: DATA CLEANUP */}
      {activeTab === 'system' && (
        <section className="shell-panel p-4 md:p-5 rounded-none space-y-6">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-rose-400 italic">Data Cleanup & Maintenance</h2>
            <p className="mt-1 text-xs text-slate-400">Tool to reset database entries to initial clean state.</p>
          </div>

          <div className="border border-rose-500/20 bg-rose-500/5 p-4 rounded-none space-y-3">
            <h3 className="text-xs font-bold text-rose-300 uppercase tracking-wider">⚠️ Destructive Action Warning</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              This action will permanently delete all user-created records in the database:
            </p>
            <ul className="list-disc list-inside text-xs text-slate-400 space-y-1 ml-2">
              <li>All Leagues and configurations</li>
              <li>All Calendar Rounds and car assignments</li>
              <li>All Driver and Team registrations</li>
              <li>All created Teams and members</li>
              <li>All Driver Market listings</li>
            </ul>
            <div className="pt-2 border-t border-rose-500/10 text-xs text-emerald-400 font-semibold">
              Safety Note: Your admin account and linked profile will remain intact.
            </div>
          </div>

          <div className="bg-black/20 border border-shell-line p-4 rounded-none space-y-4">
            <p className="text-xs text-slate-300 font-semibold">
              Are you sure you want to run full data cleanup? This action cannot be undone.
            </p>

            <form action={resetDatabaseAction}>
              <SubmitButton
                label="Confirm Full Data Cleanup"
                pendingLabel="Cleaning database..."
                className="border border-rose-500/40 bg-rose-600/20 hover:bg-rose-700 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-rose-100 hover:text-white transition-colors cursor-pointer"
              />
            </form>
          </div>
        </section>
      )}
    </div>
  )
}
