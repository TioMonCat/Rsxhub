import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { SectionTitle } from '@/components/section-title'
import {
  canAccessPlatformAdmin,
  canManageLeague,
  canStewardLeague,
  getCurrentUser,
  getLeagueRole,
  getPlatformRole,
} from '@/lib/auth'
import { getCircuits, getLeagueCars, getLeagueEvents, getLeagues, getRegistrations } from '@/lib/platform-data'
import { getFirestoreDb, hasFirebase } from '@/lib/firebase'
import { formatDateTime } from '@/lib/utils'
import { FormattedDate } from '@/components/formatted-date'
import {
  addLeagueCar,
  createEvent,
  removeLeagueCar,
  updateEvent,
  updateLeague,
  updateRegistrationStatus,
  updateTeamRegistrationStatus,
} from '../../actions'

function toDatetimeLocal(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 16)
}

function durationMinutesForEvent(startsAt?: string | null, endsAt?: string | null) {
  if (!startsAt || !endsAt) return 60
  const start = new Date(startsAt).getTime()
  const end = new Date(endsAt).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 60
  return Math.max(1, Math.round((end - start) / 60000))
}

function registrationStatusClass(status: string) {
  if (status === 'approved') return 'border-emerald-300/35 bg-emerald-500/20 text-emerald-100'
  if (status === 'rejected') return 'border-rose-300/35 bg-rose-500/20 text-rose-100'
  if (status === 'waitlist') return 'border-sky-300/35 bg-sky-500/20 text-sky-100'
  return 'border-amber-300/35 bg-amber-500/20 text-amber-100'
}

export default async function AdminLeaguePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    event?: string
    eventUpdated?: string
    updated?: string
    leagueUpdated?: string
    eventError?: string
    car?: string
    carDeleted?: string
    carError?: string
    classError?: string
    registrationModeError?: string
    leagueError?: string
    resultsImported?: string
    resultsUnresolved?: string
    resultsNotRegistered?: string
    resultsError?: string
  }>
}) {
  const session = await getCurrentUser()
  const { id } = await params
  const qs = await searchParams

  if (!session) redirect('/perfil')

  const platformRole = await getPlatformRole(session.userId)
  const leagueRole = await getLeagueRole(id, session.userId)

  const isPlatformAdmin = canAccessPlatformAdmin(platformRole)
  const canManage = isPlatformAdmin || canManageLeague(leagueRole)
  const canReview = isPlatformAdmin || canStewardLeague(leagueRole)

  if (!canManage && !canReview) redirect('/admin')

  const leagues = await getLeagues()
  const league = leagues.find((item) => item.id === id)
  if (!league) notFound()

  const events = await getLeagueEvents(league.id)
  const leagueCars = await getLeagueCars(league.id)
  const registrations = await getRegistrations(league.id)
  const circuits = await getCircuits()
  const db = getFirestoreDb()

  const teamInfoById = new Map<string, { name: string; primaryColor: string | null }>()
  const registrationTeamIds = Array.from(new Set(registrations.map((item) => item.teamId).filter(Boolean))) as string[]

  if (hasFirebase && db && registrationTeamIds.length > 0) {
    try {
      const chunks = []
      for (let i = 0; i < registrationTeamIds.length; i += 10) {
        chunks.push(registrationTeamIds.slice(i, i + 10))
      }
      const snaps = await Promise.all(chunks.map(chunk => db.collection('teams').where('__name__', 'in', chunk).get()))
      const teamsRes = snaps.flatMap((snap: any) => snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })))

      for (const row of teamsRes) {
        teamInfoById.set(row.id, { name: row.name || '', primaryColor: row.primary_color || null })
      }
    } catch (e) {
      console.error(e)
    }
  }

  const eventErrorText: Record<string, string> = {
    'custom-circuit-required': 'If you choose custom circuit, name and image are required.',
    'circuit-required': 'You must provide a circuit (select one or write a manual name).',
    'circuit-not-found': 'Selected circuit was not found.',
    'missing-fields': 'Title, start date and duration are required.',
    'create-failed': 'Event could not be created.',
    'update-missing-fields': 'All fields are required to update the round (including duration).',
    'update-failed': 'Round could not be updated.',
  }

  return (
    <div className="space-y-4 text-white">
      <section className="shell-panel p-4 md:p-5 rounded-none">
        <div className="flex items-center justify-between gap-3">
          <SectionTitle title={`Manage ${league.title}`} subtitle="League setup, schedule and registration operations." />
          <div className="flex gap-2">
            {canManage ? (
              <a
                href={`/admin/ligas/${league.id}/export`}
                className="border border-shell-line bg-white/5 px-3 py-2 text-xs font-semibold text-white rounded-none"
              >
                Export INI
              </a>
            ) : null}
            <Link href={`/admin/ligas/${league.id}/miembros`} className="border border-shell-line bg-white/5 px-3 py-2 text-xs font-semibold text-white rounded-none">Members</Link>
            <Link href="/admin" className="border border-shell-line bg-white/5 px-3 py-2 text-xs font-semibold text-white rounded-none">Back</Link>
          </div>
        </div>

        {qs.event === '1' ? <div className="border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100 rounded-none">Event created.</div> : null}
        {qs.eventUpdated === '1' ? <div className="mt-2 border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100 rounded-none">Round updated.</div> : null}
        {qs.car === '1' ? <div className="mt-2 border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100 rounded-none">Car added.</div> : null}
        {qs.carDeleted === '1' ? <div className="mt-2 border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100 rounded-none">Car deleted.</div> : null}
        {qs.eventError ? <div className="mt-2 border border-red-300/30 bg-red-500/10 px-3 py-2 text-sm text-red-100 rounded-none">{eventErrorText[qs.eventError] || 'Error while creating event.'}</div> : null}
        {qs.carError === 'create-failed' ? <div className="mt-2 border border-red-300/30 bg-red-500/10 px-3 py-2 text-sm text-red-100 rounded-none">Could not save league car.</div> : null}
        {qs.updated === '1' ? <div className="mt-2 border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100 rounded-none">Registration updated.</div> : null}
        {qs.leagueUpdated === '1' ? <div className="mt-2 border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100 rounded-none">League updated.</div> : null}
        {qs.leagueError === 'update-failed' ? (
          <div className="mt-2 border border-red-300/30 bg-red-500/10 px-3 py-2 text-sm text-red-100 rounded-none">Could not update league.</div>
        ) : null}
        {qs.resultsImported ? (
          <div className="mt-2 border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100 rounded-none">
            Results imported: {qs.resultsImported}
            {qs.resultsUnresolved ? ` (unresolved user: ${qs.resultsUnresolved})` : ''}
            {qs.resultsNotRegistered ? ` (ignored not registered: ${qs.resultsNotRegistered})` : ''}
          </div>
        ) : null}
        {qs.resultsError === 'file-required' ? (
          <div className="mt-2 border border-red-300/30 bg-red-500/10 px-3 py-2 text-sm text-red-100 rounded-none">You must upload a JSON file.</div>
        ) : null}
        {qs.resultsError === 'invalid-json' ? (
          <div className="mt-2 border border-red-300/30 bg-red-500/10 px-3 py-2 text-sm text-red-100 rounded-none">File does not contain valid JSON.</div>
        ) : null}
        {qs.resultsError === 'event-required' ? (
          <div className="mt-2 border border-red-300/30 bg-red-500/10 px-3 py-2 text-sm text-red-100 rounded-none">You must select an event or include eventId in the JSON.</div>
        ) : null}
        {qs.resultsError === 'event-not-found' ? (
          <div className="mt-2 border border-red-300/30 bg-red-500/10 px-3 py-2 text-sm text-red-100 rounded-none">The event does not exist in this league.</div>
        ) : null}
        {qs.resultsError === 'no-valid-rows' ? (
          <div className="mt-2 border border-red-300/30 bg-red-500/10 px-3 py-2 text-sm text-red-100 rounded-none">No valid rows in the JSON file.</div>
        ) : null}
        {qs.resultsError === 'no-resolved-users' ? (
          <div className="mt-2 border border-red-300/30 bg-red-500/10 px-3 py-2 text-sm text-red-100 rounded-none">Could not resolve any users (userId/steamId).</div>
        ) : null}
        {qs.resultsError === 'no-registered-users' ? (
          <div className="mt-2 border border-red-300/30 bg-red-500/10 px-3 py-2 text-sm text-red-100 rounded-none">No users in the JSON are registered in this league.</div>
        ) : null}
        {qs.resultsError === 'insert-failed' ? (
          <div className="mt-2 border border-red-300/30 bg-red-500/10 px-3 py-2 text-sm text-red-100 rounded-none">Could not insert results.</div>
        ) : null}
      </section>

      <section className="shell-panel p-4 md:p-5 rounded-none">
        <SectionTitle title="League Configuration" subtitle="Update all league details even after start date." />
        {!canManage ? (
          <p className="text-sm text-slate-400">Your role can review data but cannot edit configuration.</p>
        ) : (
          <form action={updateLeague} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 rounded-none">
            <input type="hidden" name="leagueId" value={league.id} />
            <input name="title" defaultValue={league.title} placeholder="Name" className="border border-shell-line bg-black/20 px-3 py-2 text-sm text-white outline-none rounded-none" />
            <input name="slug" defaultValue={league.slug} placeholder="slug" className="border border-shell-line bg-black/20 px-3 py-2 text-sm text-white outline-none rounded-none" />
            <select name="simulator" defaultValue={league.simulator} className="border border-shell-line bg-black/20 px-3 py-2 text-sm text-white outline-none rounded-none">
              <option value="ac">Assetto Corsa</option>
              <option value="lmu">Le Mans Ultimate</option>
            </select>
            <select name="format" defaultValue={league.format} className="border border-shell-line bg-black/20 px-3 py-2 text-sm text-white outline-none rounded-none">
              <option value="sprint">Sprint</option>
              <option value="endurance">Endurance</option>
              <option value="gt3">GT3</option>
              <option value="prototype">Prototype</option>
              <option value="formula">Formula</option>
              <option value="multiclass">Multiclass</option>
            </select>
            <input name="shortDescription" defaultValue={league.shortDescription} placeholder="Short description" className="border border-shell-line bg-black/20 px-3 py-2 text-sm text-white outline-none md:col-span-2 rounded-none" />
            <input name="bannerUrl" defaultValue={league.bannerUrl || ''} placeholder="Banner URL" className="border border-shell-line bg-black/20 px-3 py-2 text-sm text-white outline-none md:col-span-2 rounded-none" />
            <textarea name="fullDescription" defaultValue={league.fullDescription} rows={2} placeholder="Full description" className="border border-shell-line bg-black/20 px-3 py-2 text-sm text-white outline-none md:col-span-2 rounded-none" />
            <div className="border border-shell-line bg-black/20 px-3 py-2 text-sm text-white md:col-span-2 rounded-none">
              <p className="mb-2 text-xs text-slate-300">Classes (select one or multiple)</p>
              <div className="flex flex-wrap gap-2">
                {['GT3', 'HYPERCAR', 'LMP2', 'GTE', 'F1', 'GT4'].map((tag) => (
                  <label key={tag} className="inline-flex cursor-pointer items-center gap-1 border border-white/20 bg-white/5 px-2 py-1 text-xs rounded-none">
                    <input
                      type="checkbox"
                      name="classTags"
                      value={tag}
                      defaultChecked={Boolean(league.classTags?.includes(tag))}
                      className="accent-blue-500"
                    />
                    {tag}
                  </label>
                ))}
              </div>
              <p className="mt-3 mb-1 text-xs text-slate-300">Add new classes (comma separated)</p>
              <input
                name="customClassTags"
                defaultValue={(league.classTags || []).filter((tag) => !['GT3', 'HYPERCAR', 'LMP2', 'GTE', 'F1', 'GT4'].includes(tag)).join(', ')}
                placeholder="E.g., TCR, CUPRA, LMP3"
                className="w-full border border-shell-line bg-black/20 px-3 py-2 text-sm text-white outline-none rounded-none"
              />
            </div>
            <input name="maxDrivers" type="number" defaultValue={league.maxDrivers ?? ''} placeholder="Max total drivers in league" className="border border-shell-line bg-black/20 px-3 py-2 text-sm text-white outline-none rounded-none" />
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Máx. Pilotos por Coche / Dorsal</label>
              <input name="maxDriversPerCar" type="number" min={1} max={6} defaultValue={league.maxDriversPerCar ?? 4} placeholder="Máx. pilotos por coche (ej. 4)" className="border border-shell-line bg-black/20 px-3 py-2 text-sm text-white outline-none rounded-none" />
            </div>
            <select name="status" defaultValue={league.status} className="border border-shell-line bg-black/20 px-3 py-2 text-sm text-white outline-none rounded-none">
              <option value="draft">Draft</option>
              <option value="open">Open</option>
              <option value="ongoing">Ongoing</option>
              <option value="finished">Finished</option>
            </select>
            <label className="flex items-center gap-2 border border-shell-line bg-black/20 px-3 py-2 text-xs text-slate-200 rounded-none"><input type="checkbox" name="featured" defaultChecked={Boolean(league.featured)} /> Featured</label>
            <label className="flex items-center gap-2 border border-shell-line bg-black/20 px-3 py-2 text-xs text-slate-200 rounded-none"><input type="checkbox" name="registrationOpen" defaultChecked={Boolean(league.registrationOpen)} /> Open Registration</label>
            <select name="registrationMode" defaultValue={league.registrationMode || 'individual'} className="border border-shell-line bg-black/20 px-3 py-2 text-sm text-white outline-none rounded-none">
              <option value="individual">Individual registration</option>
              <option value="team">Team registration</option>
            </select>
            <button className="bg-shell-accent px-4 py-2 text-sm font-bold text-white rounded-none">Save League</button>
          </form>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="shell-panel p-4 md:p-5 rounded-none">
          <SectionTitle title="Cars Allowed" subtitle="Cars available when teams register in this league." />
          <div className="space-y-2">
            {leagueCars.length === 0 ? <p className="text-sm text-slate-400">No cars configured yet.</p> : null}
            {leagueCars.map((car) => (
              <div key={car.id} className="flex items-center justify-between gap-2 border border-shell-line bg-black/20 px-3 py-2 rounded-none">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{car.label}</p>
                  <p className="truncate text-xs text-slate-300">{car.model}</p>
                </div>
                {canManage ? (
                  <form action={removeLeagueCar}>
                    <input type="hidden" name="leagueId" value={league.id} />
                    <input type="hidden" name="carId" value={car.id} />
                    <button className="border border-rose-300/40 bg-rose-500/20 px-2 py-1 text-xs font-semibold text-rose-100 rounded-none">Remove</button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
          {canManage ? (
            <form action={addLeagueCar} className="mt-3 grid gap-2 md:grid-cols-3 rounded-none">
              <input type="hidden" name="leagueId" value={league.id} />
              <input name="label" placeholder="Label (e.g. Porsche 992 GT3R)" className="border border-shell-line bg-black/20 px-3 py-2 text-sm text-white outline-none rounded-none" />
              <input name="model" placeholder="Exact MODEL name" className="border border-shell-line bg-black/20 px-3 py-2 text-sm text-white outline-none rounded-none" />
              <div className="flex gap-2">
                <input name="sortOrder" type="number" defaultValue={0} className="w-full border border-shell-line bg-black/20 px-3 py-2 text-sm text-white outline-none rounded-none" />
                <button className="bg-shell-accent px-3 py-2 text-xs font-bold text-white rounded-none">Add</button>
              </div>
            </form>
          ) : null}
        </div>

        <div className="shell-panel p-4 md:p-5 rounded-none">
          <SectionTitle title="Create Event" subtitle="Add new rounds to the league calendar." />
          {!canManage ? (
            <p className="text-sm text-slate-400">Your role can review data but cannot create events.</p>
          ) : (
            <form action={createEvent} className="space-y-3 rounded-none">
              <input type="hidden" name="leagueId" value={league.id} />
              <input name="title" placeholder="Round 1" className="w-full border border-shell-line bg-black/20 px-3 py-2 text-sm text-white outline-none rounded-none" />
              <select name="circuitId" defaultValue="" className="w-full border border-shell-line bg-black/20 px-3 py-2 text-sm text-white outline-none rounded-none">
                <option value="">Use manual circuit name</option>
                {circuits.map((circuit) => (
                  <option key={circuit.id} value={circuit.id}>
                    {circuit.name}
                  </option>
                ))}
                <option value="custom">+ Add custom circuit with image</option>
              </select>
              <input name="circuitName" placeholder="Manual circuit name (optional if selected above)" className="w-full border border-shell-line bg-black/20 px-3 py-2 text-sm text-white outline-none rounded-none" />
              <input name="customCircuitName" placeholder="Custom circuit name (used when selecting custom)" className="w-full border border-shell-line bg-black/20 px-3 py-2 text-sm text-white outline-none rounded-none" />
              <input
                name="customCircuitImageUrl"
                placeholder="Custom circuit image URL or /circuits/your-file.jpg"
                className="w-full border border-shell-line bg-black/20 px-3 py-2 text-sm text-white outline-none rounded-none"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <input name="startsAt" type="datetime-local" className="w-full border border-shell-line bg-black/20 px-3 py-2 text-sm text-white outline-none rounded-none" />
                <input name="durationMinutes" type="number" min={1} defaultValue={60} placeholder="Duration (minutes)" className="w-full border border-shell-line bg-black/20 px-3 py-2 text-sm text-white outline-none rounded-none" />
              </div>
              <select name="status" className="w-full border border-shell-line bg-black/20 px-3 py-2 text-sm text-white outline-none rounded-none">
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <button className="bg-shell-accent px-4 py-2 text-sm font-bold text-white rounded-none">Create Event</button>
            </form>
          )}
        </div>

        <div className="shell-panel p-4 md:p-5 rounded-none col-span-1 md:col-span-2">
          <SectionTitle title="Current Events" subtitle="Quick view of the loaded calendar." />
          {canReview ? (
            <div className="mb-3 border border-shell-line bg-black/20 p-3 text-xs text-slate-300 rounded-none">
              <p className="mb-2 font-semibold text-white">Import JSON format (supported):</p>
              <pre className="overflow-x-auto text-[11px] leading-relaxed text-slate-300">{`{
  "Result": [
    { "DriverGuid": "7656119...", "position": 1, "points": 25 }
  ]
}`}</pre>
              <p className="mt-2 text-[11px] text-slate-400">
                Notes: if `position` is missing, order in `Result` is used. Importing marks the event as completed.
              </p>
            </div>
          ) : null}
          <div className="space-y-2">
            {events.filter((event) => event.status !== 'cancelled').length === 0 ? (
              <p className="text-sm text-slate-400">No events loaded for this league.</p>
            ) : (
              events
                .filter((event) => event.status !== 'cancelled')
                .map((event) => {
                  const raceTitle = event.title?.trim() || event.circuitName
                  const hasCustomRaceTitle = Boolean(event.title?.trim())
                  return (
                    <div key={event.id} className="border border-shell-line bg-black/20 p-3 rounded-none">
                      <div className="flex gap-3">
                        <div className="h-16 w-24 overflow-hidden border border-shell-line bg-black/30 rounded-none">
                          {event.circuitImageUrl ? (
                            <img src={event.circuitImageUrl} alt={event.circuitName} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[10px] text-slate-500">No image</div>
                          )}
                        </div>
                        <div>
                          {hasCustomRaceTitle ? <p className="text-xs uppercase tracking-widest text-slate-400">{event.circuitName}</p> : null}
                          <p className="font-semibold text-white">{raceTitle}</p>
                          <p className="mt-1 text-xs text-slate-400"><FormattedDate date={event.startsAt} /></p>
                        </div>
                      </div>
                      {canManage ? (
                        <form action={updateEvent} className="mt-3 grid gap-2 md:grid-cols-5 rounded-none">
                          <input type="hidden" name="leagueId" value={league.id} />
                          <input type="hidden" name="eventId" value={event.id} />
                          <input
                            name="title"
                            defaultValue={event.title}
                            placeholder="Round title"
                            className="border border-shell-line bg-black/20 px-2 py-1.5 text-xs text-white outline-none rounded-none"
                          />
                          <input
                            name="circuitName"
                            defaultValue={event.circuitName}
                            placeholder="Circuit"
                            className="border border-shell-line bg-black/20 px-2 py-1.5 text-xs text-white outline-none rounded-none"
                          />
                          <input
                            name="startsAt"
                            type="datetime-local"
                            defaultValue={toDatetimeLocal(event.startsAt)}
                            className="border border-shell-line bg-black/20 px-2 py-1.5 text-xs text-white outline-none rounded-none"
                          />
                          <input
                            name="durationMinutes"
                            type="number"
                            min={1}
                            defaultValue={durationMinutesForEvent(event.startsAt, event.endsAt)}
                            placeholder="Duration (min)"
                            className="border border-shell-line bg-black/20 px-2 py-1.5 text-xs text-white outline-none rounded-none"
                          />
                          <div className="flex gap-2">
                            <select
                              name="status"
                              defaultValue={event.status}
                              className="w-full border border-shell-line bg-black/20 px-2 py-1.5 text-xs text-white outline-none rounded-none"
                            >
                              <option value="scheduled">Scheduled</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                            <button className="bg-shell-accent px-3 py-1.5 text-xs font-bold text-white rounded-none">Save</button>
                          </div>
                        </form>
                      ) : null}
                      {canReview ? (
                        <form action="/api/admin/import-results" encType="multipart/form-data" method="post" className="mt-2 grid gap-2 md:grid-cols-[1fr_auto_auto] rounded-none">
                          <input type="hidden" name="leagueId" value={league.id} />
                          <input type="hidden" name="eventId" value={event.id} />
                          <input
                            name="resultsFile"
                            type="file"
                            accept="application/json,.json"
                            required
                            className="w-full border border-shell-line bg-black/20 px-2 py-1.5 text-xs text-white outline-none file:mr-2 file:border-0 file:bg-shell-accent file:px-2 file:py-1 file:text-[11px] file:font-semibold file:text-white file:rounded-none rounded-none"
                          />
                          <label className="flex items-center gap-1 border border-shell-line bg-black/20 px-2 py-1.5 text-[11px] text-slate-300 rounded-none">
                            <input type="checkbox" name="replaceExisting" defaultChecked />
                            Replace
                          </label>
                          <button className="bg-shell-accent px-3 py-1.5 text-xs font-bold text-white rounded-none">Upload results JSON</button>
                        </form>
                      ) : null}
                    </div>
                  )
                })
            )}
          </div>
        </div>
      </section>

      <section className="shell-panel p-4 md:p-5 rounded-none">
        <SectionTitle title="Registrations" subtitle="Approve, waitlist or reject each driver application." />
        <div className="space-y-2">
          {registrations.length === 0 ? (
            <p className="text-sm text-slate-400">No registration requests yet.</p>
          ) : league.registrationMode === 'team' ? (
            Array.from(
              registrations.reduce((acc, registration) => {
                const key = registration.teamId
                  ? `${registration.teamId}::${registration.classTag || 'noclass'}::${typeof registration.assignedNumber === 'number' ? registration.assignedNumber : 'no-number'}`
                  : `solo-${registration.userId}`
                const current = acc.get(key) || []
                current.push(registration)
                acc.set(key, current)
                return acc
              }, new Map<string, typeof registrations>()),
            ).map(([key, members]) => {
              const first = members[0]
              const team = first?.teamId ? teamInfoById.get(first.teamId) : null
              const number = typeof first?.assignedNumber === 'number' ? String(first.assignedNumber) : '-'
              const bg = team?.primaryColor
                ? `linear-gradient(135deg, ${team.primaryColor}2A 0%, rgba(8,11,18,0.92) 55%)`
                : 'linear-gradient(135deg, rgba(18,116,222,0.18) 0%, rgba(8,11,18,0.92) 55%)'
              const primaryStatus = members.some((item) => item.status === 'approved')
                ? 'approved'
                : members.some((item) => item.status === 'waitlist')
                ? 'waitlist'
                : members.some((item) => item.status === 'rejected')
                ? 'rejected'
                : 'pending'

              return (
                <details key={key} className="overflow-hidden border border-shell-line rounded-none" style={{ background: bg }}>
                  <summary className="flex cursor-pointer list-none items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{team?.name || 'Unnamed team'}</p>
                      <p className="text-xs text-slate-300">
                        Car {number}
                        {first?.classTag ? ` - Class ${first.classTag}` : ''}
                        {` - Drivers ${members.length}`}
                      </p>
                    </div>
                    <span className={`border px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] rounded-none ${registrationStatusClass(primaryStatus)}`}>
                      {primaryStatus}
                    </span>
                    {canReview && first?.teamId ? (
                      <div className="ml-1 flex gap-1">
                        {['approved', 'waitlist', 'rejected'].map((status) => (
                          <form key={`${key}-${status}`} action={updateTeamRegistrationStatus}>
                            <input type="hidden" name="leagueId" value={league.id} />
                            <input type="hidden" name="teamId" value={first.teamId || ''} />
                            <input type="hidden" name="classTag" value={first.classTag || '__NULL__'} />
                            <input type="hidden" name="carNumber" value={typeof first.assignedNumber === 'number' ? String(first.assignedNumber) : '0'} />
                            <input type="hidden" name="status" value={status} />
                            <button
                              className="border border-shell-line bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase text-white hover:bg-white/10 rounded-none"
                            >
                              {status}
                            </button>
                          </form>
                        ))}
                      </div>
                    ) : null}
                  </summary>

                  <div className="space-y-2 border-t border-shell-line bg-black/20 p-3 rounded-none">
                    {members.map((registration) => (
                      <div key={registration.id} className="border border-shell-line bg-black/30 p-3 rounded-none">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="font-semibold text-white">{registration.displayName}</p>
                            <p className="text-xs text-slate-300">Steam ID: {registration.steamId}</p>
                            <p className="text-xs text-slate-300">User ID: {registration.userId}</p>
                            <p className="text-xs text-slate-300">Requested: <FormattedDate date={registration.createdAt} /></p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`border px-2 py-1 text-xs font-semibold uppercase rounded-none ${registrationStatusClass(registration.status)}`}>
                              {registration.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )
            })
          ) : (
            registrations.map((registration) => (
              <div key={registration.id} className="border border-shell-line bg-black/20 p-3 rounded-none">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-semibold text-white">{registration.displayName}</p>
                    <p className="text-xs text-slate-400">Steam ID: {registration.steamId}</p>
                    <p className="text-xs text-slate-400">Requested: <FormattedDate date={registration.createdAt} /></p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="border border-shell-line bg-white/5 px-2 py-1 text-xs text-slate-200 rounded-none">{registration.status}</span>
                    {canReview
                      ? ['approved', 'waitlist', 'rejected'].map((status) => (
                          <form key={status} action={updateRegistrationStatus}>
                            <input type="hidden" name="registrationId" value={registration.id} />
                            <input type="hidden" name="leagueId" value={league.id} />
                            <input type="hidden" name="status" value={status} />
                            <button className="border border-shell-line bg-white/5 px-2 py-1 text-xs font-semibold uppercase text-white hover:bg-white/10 rounded-none">{status}</button>
                          </form>
                        ))
                      : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
