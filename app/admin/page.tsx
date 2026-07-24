import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAdminAccessContext, getCurrentUser } from '@/lib/auth'
import { getLeagueEvents, getLeagues, getRegistrations } from '@/lib/platform-data'
import { getTeamsDashboard } from '@/lib/team-data'
import { getFirestoreDb, hasFirebase } from '@/lib/firebase'
import { simulatorLabel } from '@/lib/utils'
import { SubmitButton } from '@/components/submit-button'
import { DeleteLeagueButton } from '@/components/delete-league-button'
import { DeleteTeamButtonDouble } from '@/components/delete-team-button-double'
import { AdminGallery } from '@/components/admin-gallery'
import { ShieldAlert, Trophy, Shield, Store, Image as ImageIcon, Trash2 } from 'lucide-react'
import {
  adminDeleteMarketListing,
  quickUpdateLeagueStatusAction,
  quickToggleLeagueFeaturedAction,
  quickUpdateLeagueMaxDriversAction,
  deleteLeagueAction,
  resetDatabaseAction,
} from './actions'
import { deleteTeamAction } from '@/app/equipos/actions'

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
          Liga creada exitosamente.
        </div>
      )}
      {params.deleted_listing === '1' && (
        <div className="rounded-none border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100 font-semibold">
          Publicación del Driver Market eliminada exitosamente.
        </div>
      )}
      {params.reset === 'success' && (
        <div className="rounded-none border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100 font-bold">
          ¡Limpieza de datos completada exitosamente! La plataforma se ha reiniciado desde cero.
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
          Ligas ({visibleLeagues.length})
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
        <div className="space-y-6">
          <section className="shell-panel p-4 md:p-5 rounded-none space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-shell-line pb-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-white italic">Centro de Control de Ligas</h2>
                <p className="text-xs text-slate-400">Modifica rápidamente el estado, simulador, visibilidad y límite de pilotos.</p>
              </div>
            </div>

            <div className="overflow-x-auto border border-shell-line bg-black/10">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-shell-line bg-black/40 text-xxs font-black uppercase tracking-wider text-slate-400">
                    <th className="p-3">Liga</th>
                    <th className="p-3">Simulador</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3">Destacada</th>
                    <th className="p-3">Max Pilotos</th>
                    <th className="p-3 text-center">Rondas</th>
                    <th className="p-3 text-center">Inscritos</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                  {visibleLeagues.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 italic">No hay ligas registradas en la plataforma.</td>
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
                          <td className="p-3 text-slate-400 font-semibold">{simulatorLabel(league.simulator)}</td>
                          <td className="p-3">
                            <form action={quickUpdateLeagueStatusAction} className="flex items-center gap-1.5">
                              <input type="hidden" name="leagueId" value={league.id} />
                              <select
                                name="status"
                                defaultValue={league.status}
                                className="rounded-none border border-shell-line bg-black/45 px-2 py-1 text-xxs font-bold text-slate-200 outline-none cursor-pointer focus:border-white/30 uppercase tracking-wider"
                              >
                                <option value="draft">Borrador</option>
                                <option value="open">Abierta</option>
                                <option value="ongoing">En Curso</option>
                                <option value="finished">Finalizada</option>
                              </select>
                              <button type="submit" className="border border-white/20 bg-white/5 hover:bg-[#1274de] hover:border-[#1274de] px-2 py-1 text-[9px] uppercase font-black text-white transition-colors cursor-pointer">
                                Guardar
                              </button>
                            </form>
                          </td>
                          <td className="p-3">
                            <form action={quickToggleLeagueFeaturedAction}>
                              <input type="hidden" name="leagueId" value={league.id} />
                              <button type="submit" className={`px-2 py-1 text-[9px] font-black uppercase border rounded-none cursor-pointer transition-colors ${
                                league.featured 
                                  ? 'border-amber-500/35 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20' 
                                  : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                              }`}>
                                {league.featured ? '★ Destacada' : '☆ Estándar'}
                              </button>
                            </form>
                          </td>
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
                                Fijar
                              </button>
                            </form>
                          </td>
                          <td className="p-3 text-center font-bold text-slate-200">{leagueEvents}</td>
                          <td className="p-3 text-center font-bold text-slate-200">{leagueRegistrations}</td>
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
          <div className="border-b border-shell-line pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-white italic">Gestión Integral de Equipos</h2>
            <p className="text-xs text-slate-400">Visualiza, edita todos los parámetros de un equipo o elimínalo con doble confirmación de seguridad.</p>
          </div>

          <div className="overflow-x-auto border border-shell-line bg-black/10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-shell-line bg-black/40 text-xxs font-black uppercase tracking-wider text-slate-400">
                  <th className="p-3">Logo</th>
                  <th className="p-3">Nombre del Equipo</th>
                  <th className="p-3">Líder del Equipo</th>
                  <th className="p-3 text-center">Pilotos</th>
                  <th className="p-3">Categorías</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                {teams.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 italic">No hay equipos registrados en la plataforma.</td>
                  </tr>
                ) : (
                  teams.map((team) => {
                    const leaderName = team.members.find((m) => m.role === 'owner')?.displayName || 'No asignado'
                    return (
                      <tr key={team.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-3">
                          {team.logoUrl ? (
                            <img src={team.logoUrl} alt={team.name} className="h-8 w-8 object-contain" />
                          ) : (
                            <div className="h-8 w-8 bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 font-extrabold text-[10px]">
                              {team.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </td>
                        <td className="p-3 font-bold text-white">{team.name}</td>
                        <td className="p-3 text-slate-300">{leaderName}</td>
                        <td className="p-3 text-center font-bold text-cyan-400">{team.members.length}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {team.classTags && team.classTags.length > 0 ? (
                              team.classTags.map((tag: string) => (
                                <span key={tag} className="px-1.5 py-0.5 bg-white/5 border border-white/10 text-[9px] font-extrabold uppercase text-slate-300">
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-500 italic text-[10px]">Ninguna</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <Link
                              href={`/equipos/${team.id}`}
                              className="inline-block border border-shell-line bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-[#1274de] hover:border-[#1274de] transition-colors"
                            >
                              Editar Todo
                            </Link>
                            <DeleteTeamButtonDouble
                              teamId={team.id}
                              teamName={team.name}
                              deleteAction={deleteTeamAction}
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
      )}

      {/* TAB CONTENT: DRIVER MARKET */}
      {activeTab === 'market' && (
        <section className="shell-panel p-4 md:p-5 rounded-none space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-shell-line pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-white italic">Moderación de Driver Market</h2>
              <p className="text-xs text-slate-400">Revisa las publicaciones del mercado de pilotos y ofertas de equipos, edita o elimina rápidamente.</p>
            </div>

            {/* Quick Filters */}
            <div className="flex items-center gap-1 border border-shell-line bg-black/40 p-1">
              <Link
                href="/admin?tab=market&filter=all"
                className={`px-3 py-1 text-[11px] font-bold uppercase transition-colors ${
                  marketFilter === 'all' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Todos ({listings.length})
              </Link>
              <Link
                href="/admin?tab=market&filter=teams"
                className={`px-3 py-1 text-[11px] font-bold uppercase transition-colors ${
                  marketFilter === 'teams' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Ofertas Equipos
              </Link>
              <Link
                href="/admin?tab=market&filter=drivers"
                className={`px-3 py-1 text-[11px] font-bold uppercase transition-colors ${
                  marketFilter === 'drivers' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Postulaciones Pilotos
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto border border-shell-line bg-black/10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-shell-line bg-black/40 text-xxs font-black uppercase tracking-wider text-slate-400">
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Publicado Por</th>
                  <th className="p-3">Título</th>
                  <th className="p-3">Categorías</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                {filteredListings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 italic">No hay publicaciones en esta categoría.</td>
                  </tr>
                ) : (
                  filteredListings.map((listing) => (
                    <tr key={listing.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3 font-semibold">
                        {listing.type === 'team_seeking_driver' ? (
                          <span className="text-cyan-400 font-extrabold uppercase text-[10px] bg-cyan-950/40 border border-cyan-800/40 px-2 py-0.5">
                            Equipo Busca Piloto
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-extrabold uppercase text-[10px] bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5">
                            Piloto Busca Equipo
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-bold text-white">
                        {listing.type === 'team_seeking_driver'
                          ? `${listing.user_name} (${listing.team_name || 'Equipo'})`
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
                            <span className="text-slate-500 italic text-[10px]">Ninguna</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-slate-400 text-xxs font-mono">
                        {(() => {
                          try {
                            const d = new Date(listing.created_at)
                            return isNaN(d.getTime()) ? 'Reciente' : d.toLocaleDateString()
                          } catch (e) {
                            return 'Reciente'
                          }
                        })()}
                      </td>
                      <td className="p-3 text-right">
                        <form action={adminDeleteMarketListing.bind(null, listing.id)}>
                          <button
                            type="submit"
                            className="border border-rose-500/30 bg-rose-500/10 hover:bg-rose-700 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-200 hover:text-white transition-colors cursor-pointer"
                          >
                            Eliminar Publicación
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
            <h2 className="text-sm font-bold uppercase tracking-wide text-rose-400 italic">Limpieza y Mantenimiento de Datos</h2>
            <p className="mt-1 text-xs text-slate-400">Herramienta temporal para restablecer la base de datos de pruebas a su estado inicial.</p>
          </div>

          <div className="border border-rose-500/20 bg-rose-500/5 p-4 rounded-none space-y-3">
            <h3 className="text-xs font-bold text-rose-300 uppercase tracking-wider">⚠️ Advertencia de Acción Destructiva</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Esta acción eliminará de forma permanente todos los registros creados por usuarios en la base de datos Firestore de prueba:
            </p>
            <ul className="list-disc list-inside text-xs text-slate-400 space-y-1 ml-2">
              <li>Todas las Ligas y sus configuraciones</li>
              <li>Todas las Rondas del Calendario y coches asignados</li>
              <li>Todas las Inscripciones de pilotos y equipos</li>
              <li>Todos los Equipos creados y miembros asignados</li>
              <li>Todas las publicaciones del Driver Market</li>
            </ul>
            <div className="pt-2 border-t border-rose-500/10 text-xs text-emerald-400 font-semibold">
              Nota de seguridad: Tu cuenta de administrador y tu perfil vinculado no se borrarán para no perder acceso.
            </div>
          </div>

          <div className="bg-black/20 border border-shell-line p-4 rounded-none space-y-4">
            <p className="text-xs text-slate-300 font-semibold">
              ¿Estás seguro de que deseas ejecutar la limpieza de datos de prueba? Esta acción no se puede deshacer.
            </p>

            <form action={resetDatabaseAction}>
              <SubmitButton
                label="Confirmar Limpieza Total de Datos"
                pendingLabel="Limpiando base de datos..."
                className="border border-rose-500/40 bg-rose-600/20 hover:bg-rose-700 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-rose-100 hover:text-white transition-colors cursor-pointer"
              />
            </form>
          </div>
        </section>
      )}
    </div>
  )
}
