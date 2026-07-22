'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, AlertCircle, Play, Clock } from 'lucide-react'
import { useLeagueState, League, LeagueEvent, Registration, ManagedTeam, LeagueCar, EventConfirmation } from './hooks/use-league-state'
import { LeagueBanner } from './components/league-banner'
import { LeagueRegistration } from './components/league-registration'
import { LeagueSchedule } from './components/league-schedule'
import { LeagueStandings } from './components/league-standings'
import { LeagueResults } from './components/league-results'
import { FinishRoundModal } from './components/finish-round-modal'
import { updateLeagueDetailsAction, deleteLeagueAction, registerTeamAction, unregisterTeamAction } from '@/app/ligas/actions'
import { saveCalendarEvent, deleteCalendarEvent } from '@/app/calendario/actions'
import { ClassBadge } from '@/components/class-badge'
import { ImagePicker } from '@/components/image-picker'

type Props = {
  league: League
  initialEvents: LeagueEvent[]
  isAdmin: boolean
  session: any
  initialRegistrations: Registration[]
  myManagedTeams: ManagedTeam[]
  leagueCars: LeagueCar[]
  teamInfo?: Record<string, { name: string; primaryColor: string | null; logoUrl: string | null }>
  initialConfirmations?: EventConfirmation[]
}

export default function LeagueDetailPageContent({
  league,
  initialEvents,
  isAdmin,
  session,
  initialRegistrations,
  myManagedTeams,
  leagueCars,
  teamInfo = {},
  initialConfirmations = []
}: Props) {
  const router = useRouter()

  const {
    events,
    setEvents,
    confirmations,
    classTags,
    standings,
    standingsIndices,
    customCarImages,
    handleCarImageUpload,
    scrollStandings,
    registeredCars,
    groupedRegistrations
  } = useLeagueState({
    league,
    initialEvents,
    initialRegistrations,
    myManagedTeams,
    teamInfo,
    initialConfirmations
  })

  // Accent color hex
  const accentHex = league.accentColor || '#1274de'

  // Modals visibility
  const [isEditLeagueOpen, setIsEditLeagueOpen] = useState(false)
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [isResultsOpen, setIsResultsOpen] = useState(false)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [finishingEvent, setFinishingEvent] = useState<LeagueEvent | null>(null)

  // Edit League Form States
  const [formTitle, setFormTitle] = useState(league.title)
  const [formSlug, setFormSlug] = useState(league.slug)
  const [formSimulator, setFormSimulator] = useState(league.simulator || 'ac')
  const [formFormat, setFormFormat] = useState(league.format || 'sprint')
  const [formStatus, setFormStatus] = useState(league.status || 'open')
  const [formRegistrationMode, setFormRegistrationMode] = useState((league as any).registrationMode || 'team')
  const [formClassTags, setFormClassTags] = useState((league.classTags || []).join(', '))
  const [formStartsAt, setFormStartsAt] = useState(league.startsAt.split('T')[0])
  const [formEndsAt, setFormEndsAt] = useState(league.endsAt.split('T')[0])
  const [formClassLimits, setFormClassLimits] = useState<Record<string, number>>((league as any).classLimits || {})
  const [formRegistrationOpen, setFormRegistrationOpen] = useState(league.registrationOpen)
  const [formSlogan, setFormSlogan] = useState(league.slogan || '')
  const [formAccentColor, setFormAccentColor] = useState(accentHex)
  const [formBannerUrl, setFormBannerUrl] = useState(league.bannerUrl || '')
  const [formLogoUrl, setFormLogoUrl] = useState((league as any).logoUrl || '')
  const [isLeagueSubmitting, setIsLeagueSubmitting] = useState(false)

  // Event Form States
  const [editingEvent, setEditingEvent] = useState<LeagueEvent | null>(null)
  const [formEventTitle, setFormEventTitle] = useState('')
  const [formEventCircuit, setFormEventCircuit] = useState('')
  const [formEventCountryCode, setFormEventCountryCode] = useState('ESP')
  const [formEventType, setFormEventType] = useState<'race' | 'qualifying' | 'time_attack'>('race')
  const [formEventDate, setFormEventDate] = useState('')
  const [formEventStartsTime, setFormEventStartsTime] = useState('20:00')
  const [formEventEndsTime, setFormEventEndsTime] = useState('21:30')
  const [formEventImageUrl, setFormEventImageUrl] = useState('')
  const [formEventServerLink, setFormEventServerLink] = useState('')
  const [isEventSubmitting, setIsEventSubmitting] = useState(false)
  const [eventErrorMessage, setEventErrorMessage] = useState('')

  // Team Register Modal States
  const [selectedTeamId, setSelectedTeamId] = useState<string>(myManagedTeams[0]?.id || '')
  const [isRegSubmitting, setIsRegSubmitting] = useState(false)
  const [regErrorMessage, setRegErrorMessage] = useState('')

  // Recent results mock state
  const [recentResults] = useState<{
    round: string
    GT3: Array<{ pos: number; team: string; dorsal?: number | null; time: string; gap: string; points: number }>
    HYPERCAR: Array<{ pos: number; team: string; dorsal?: number | null; time: string; gap: string; points: number }>
  }>({
    round: 'No rounds completed yet',
    GT3: [],
    HYPERCAR: []
  })

  // Handlers
  const handleLeagueDelete = async () => {
    if (!confirm('Are you sure you want to delete this league? This action cannot be undone.')) return
    try {
      await deleteLeagueAction(league.id)
      router.push('/ligas')
    } catch (e: any) {
      alert(e.message || 'Error deleting league.')
    }
  }

  const handleLeagueUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLeagueSubmitting(true)
    try {
      const formData = new FormData(e.currentTarget)
      formData.set('leagueId', league.id)
      formData.set('title', formTitle)
      formData.set('slug', formSlug)
      formData.set('simulator', formSimulator)
      formData.set('format', formFormat)
      formData.set('status', formStatus)
      formData.set('registrationMode', formRegistrationMode)
      formData.set('classTags', formClassTags)
      formData.set('startsAt', formStartsAt)
      formData.set('endsAt', formEndsAt)
      formData.set('classLimitsJson', JSON.stringify(formClassLimits))
      formData.set('registrationOpen', formRegistrationOpen ? 'true' : 'false')
      formData.set('slogan', formSlogan)
      formData.set('accentColor', formAccentColor)
      formData.set('bannerUrl', formBannerUrl)
      formData.set('logoUrl', formLogoUrl)

      await updateLeagueDetailsAction(formData)
      setIsEditLeagueOpen(false)
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Error updating league settings.')
    } finally {
      setIsLeagueSubmitting(false)
    }
  }

  const handleOpenEventModal = (event?: LeagueEvent) => {
    if (event) {
      setEditingEvent(event)
      setFormEventTitle(event.title || '')
      setFormEventCircuit(event.circuitName || '')
      setFormEventCountryCode((event as any).countryCode || 'FRA')
      setFormEventType((event as any).eventType || 'race')
      setFormEventDate(event.startsAt.split('T')[0])
      setFormEventStartsTime(event.startsAt.split('T')[1]?.substring(0, 5) || '20:00')
      setFormEventEndsTime(event.endsAt.split('T')[1]?.substring(0, 5) || '21:30')
      setFormEventImageUrl(event.circuitImageUrl || '')
      setFormEventServerLink(event.serverLink || '')
    } else {
      setEditingEvent(null)
      setFormEventTitle('')
      setFormEventCircuit('Circuit de la Sarthe, Le Mans')
      setFormEventCountryCode('FRA')
      setFormEventType('race')
      setFormEventDate(new Date().toISOString().split('T')[0])
      setFormEventStartsTime('20:00')
      setFormEventEndsTime('21:30')
      setFormEventImageUrl('')
      setFormEventServerLink('')
    }
    setEventErrorMessage('')
    setIsEventModalOpen(true)
  }

  const handleEventSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsEventSubmitting(true)
    setEventErrorMessage('')

    try {
      const startsAtFull = `${formEventDate}T${formEventStartsTime}:00Z`
      const endsAtFull = `${formEventDate}T${formEventEndsTime}:00Z`

      const formData = new FormData(e.currentTarget)
      formData.set('leagueId', league.id)
      formData.set('circuitName', formEventCircuit || 'Circuit')
      formData.set('title', formEventTitle)
      formData.set('countryCode', formEventCountryCode)
      formData.set('eventType', formEventType)
      formData.set('startsAt', startsAtFull)
      formData.set('endsAt', endsAtFull)

      if (editingEvent) {
        formData.set('id', editingEvent.id)
      }

      await saveCalendarEvent(formData)
      setIsEventModalOpen(false)
      router.refresh()
    } catch (err: any) {
      setEventErrorMessage(err.message || 'Failed to save event.')
    } finally {
      setIsEventSubmitting(false)
    }
  }

  const handleEventDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this round?')) return
    try {
      await deleteCalendarEvent(eventId)
      setEvents((prev) => prev.filter((ev) => ev.id !== eventId))
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Error deleting round.')
    }
  }

  const handleWithdrawTeam = async (teamId: string, classTag: string) => {
    if (!confirm(`Are you sure you want to withdraw ${classTag} registration?`)) return
    try {
      const formData = new FormData()
      formData.set('leagueId', league.id)
      formData.set('teamId', teamId)
      formData.set('classTag', classTag)
      await unregisterTeamAction(formData)
      router.refresh()
    } catch (e: any) {
      alert(e.message || 'Failed to withdraw.')
    }
  }

  const handleRegisterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedTeamId) return

    setIsRegSubmitting(true)
    setRegErrorMessage('')

    try {
      const formData = new FormData()
      formData.set('leagueId', league.id)
      formData.set('teamId', selectedTeamId)
      formData.set('classTag', classTags[0] || 'GT3')

      await registerTeamAction(formData)
      setIsRegisterOpen(false)
      router.refresh()
    } catch (err: any) {
      setRegErrorMessage(err.message || 'Failed to register team.')
    } finally {
      setIsRegSubmitting(false)
    }
  }

  return (
    <div className="league-custom-theme space-y-6">
      <style dangerouslySetInnerHTML={{ __html: `
        .league-custom-theme .bg-shell-accent {
          background-color: ${accentHex} !important;
        }
        .league-custom-theme .text-shell-accent {
          color: ${accentHex} !important;
        }
      ` }} />

      {/* 1. Main Banner */}
      <LeagueBanner
        league={league}
        accentHex={accentHex}
        isAdmin={isAdmin}
        onEditSettings={() => setIsEditLeagueOpen(true)}
        onDeleteLeague={handleLeagueDelete}
      />

      {/* 2. Team Registration Card */}
      <LeagueRegistration
        league={league}
        session={session}
        myManagedTeams={myManagedTeams}
        groupedRegistrations={groupedRegistrations}
        registeredCarsCount={registeredCars.length}
        onOpenRegisterModal={() => setIsRegisterOpen(true)}
        onWithdrawTeam={handleWithdrawTeam}
      />

      {/* 3. Main Content Grid */}
      <section className="grid gap-4 md:grid-cols-[1.6fr_1.4fr]">
        <LeagueSchedule
          league={league}
          events={events}
          isAdmin={isAdmin}
          classTags={classTags}
          confirmations={confirmations}
          initialRegistrations={initialRegistrations}
          myManagedTeams={myManagedTeams}
          onOpenEventModal={handleOpenEventModal}
          onDeleteEvent={handleEventDelete}
          onFinishRound={(ev) => setFinishingEvent(ev)}
        />

        <LeagueStandings
          classTags={classTags}
          standings={standings}
          standingsIndices={standingsIndices}
          customCarImages={customCarImages}
          onScrollStandings={scrollStandings}
          onCarImageUpload={handleCarImageUpload}
        />
      </section>

      {/* 4. Recent Race Results */}
      <LeagueResults
        isAdmin={isAdmin}
        recentResults={recentResults}
        classTags={classTags}
        events={events}
        onOpenResultsModal={() => setIsResultsOpen(true)}
      />

      {/* Finish Round Modal */}
      {finishingEvent && (
        <FinishRoundModal
          event={finishingEvent}
          leagueId={league.id}
          classTags={classTags}
          onClose={() => setFinishingEvent(null)}
          onSuccess={() => {
            setFinishingEvent(null)
            router.refresh()
          }}
        />
      )}

      {/* MODALS */}
      {isAdmin && isEditLeagueOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 animate-fade-in">
          <div className="shell-panel border border-shell-line bg-zinc-950 max-w-4xl w-full p-5 md:p-6 text-white rounded-none shadow-[0_0_60px_rgba(0,0,0,0.9)] relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsEditLeagueOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4 pb-3 border-b border-shell-line/40">
              <h2 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                ⚙️ Edit League Settings & Details
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Modifica cualquier parámetro de la liga: título, fechas, simulador, formato, categorías, inscripciones y branding.
              </p>
            </div>

            <form onSubmit={handleLeagueUpdate} className="space-y-6">
              {/* SECTION 1: General Info */}
              <div className="space-y-4 bg-black/30 p-4 border border-shell-line/40">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-cyan-400 border-b border-cyan-500/20 pb-1.5">
                  1. Información Principal & Títulos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">Nombre de la Liga (Title)</label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      required
                      className="w-full border border-shell-line bg-black/60 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400 font-bold"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">URL Identificativa (Slug)</label>
                    <input
                      type="text"
                      value={formSlug}
                      onChange={(e) => setFormSlug(e.target.value)}
                      required
                      className="w-full border border-shell-line bg-black/60 px-3 py-2 text-xs text-cyan-300 outline-none rounded-none focus:border-cyan-400 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">Eslogan de Cabecera (Slogan)</label>
                  <input
                    type="text"
                    value={formSlogan}
                    onChange={(e) => setFormSlogan(e.target.value)}
                    placeholder="e.g. Campeonato de Resistencia Multiclase 2026"
                    className="w-full border border-shell-line bg-black/60 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* SECTION 2: Rules, Simulator & Format */}
              <div className="space-y-4 bg-black/30 p-4 border border-shell-line/40">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-cyan-400 border-b border-cyan-500/20 pb-1.5">
                  2. Simulador, Formato & Estado de Inscripción
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">Simulador</label>
                    <select
                      value={formSimulator}
                      onChange={(e) => setFormSimulator(e.target.value)}
                      className="w-full border border-shell-line bg-black/60 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400"
                    >
                      <option value="ac">🏎️ Assetto Corsa</option>
                      <option value="lmu">🏁 Le Mans Ultimate</option>
                      <option value="iracing">🏎️ iRacing</option>
                      <option value="acc">🏆 Assetto Corsa Competizione</option>
                      <option value="ams2">🎮 Automobilista 2</option>
                      <option value="rf2">🏁 rFactor 2</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">Formato</label>
                    <select
                      value={formFormat}
                      onChange={(e) => setFormFormat(e.target.value)}
                      className="w-full border border-shell-line bg-black/60 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400"
                    >
                      <option value="endurance">⏳ Endurance (Resistencia)</option>
                      <option value="sprint">⚡ Sprint</option>
                      <option value="championship">🏆 Championship (Campeonato)</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">Estado de la Liga</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      className="w-full border border-shell-line bg-black/60 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400"
                    >
                      <option value="open">🟢 Inscripciones Abiertas (Open)</option>
                      <option value="ongoing">🟡 Campeonato En Curso (Ongoing)</option>
                      <option value="draft">⚪ Borrador / Próximamente (Draft)</option>
                      <option value="completed">🔴 Finalizada (Completed)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">Modo de Inscripción</label>
                    <select
                      value={formRegistrationMode}
                      onChange={(e) => setFormRegistrationMode(e.target.value)}
                      className="w-full border border-shell-line bg-black/60 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400"
                    >
                      <option value="team">👥 Por Escudería / Equipo (Team Registration)</option>
                      <option value="individual">👤 Por Piloto Individual (Individual Entry)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between border border-shell-line bg-black/40 px-4 py-2 mt-auto">
                    <div>
                      <span className="block text-xs font-bold text-white uppercase">Inscripciones Abiertas</span>
                      <span className="text-[10px] text-slate-400">Permite que nuevos equipos se registren</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={formRegistrationOpen}
                      onChange={(e) => setFormRegistrationOpen(e.target.checked)}
                      className="h-4 w-4 accent-cyan-400 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: Categories & Dates */}
              <div className="space-y-4 bg-black/30 p-4 border border-shell-line/40">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-cyan-400 border-b border-cyan-500/20 pb-1.5">
                  3. Categorías, Fechas & Color Visual
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">Categorías de la Liga (Separadas por Comas)</label>
                    <input
                      type="text"
                      value={formClassTags}
                      onChange={(e) => setFormClassTags(e.target.value)}
                      placeholder="e.g. GT3, LMP2, HYPERCAR"
                      className="w-full border border-shell-line bg-black/60 px-3 py-2 text-xs text-cyan-300 font-mono outline-none rounded-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">Color Visual de la Liga (HEX)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formAccentColor}
                        onChange={(e) => setFormAccentColor(e.target.value)}
                        className="h-8 w-10 bg-transparent border border-shell-line cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formAccentColor}
                        onChange={(e) => setFormAccentColor(e.target.value)}
                        className="w-full border border-shell-line bg-black/60 px-3 py-1.5 text-xs text-white font-mono outline-none rounded-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">Fecha de Inicio</label>
                    <input
                      type="date"
                      value={formStartsAt}
                      onChange={(e) => setFormStartsAt(e.target.value)}
                      required
                      className="w-full border border-shell-line bg-black/60 px-3 py-2 text-xs text-white font-mono outline-none rounded-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">Fecha de Finalización</label>
                    <input
                      type="date"
                      value={formEndsAt}
                      onChange={(e) => setFormEndsAt(e.target.value)}
                      required
                      className="w-full border border-shell-line bg-black/60 px-3 py-2 text-xs text-white font-mono outline-none rounded-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: Media & Banner */}
              <div className="space-y-4 bg-black/30 p-4 border border-shell-line/40">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-cyan-400 border-b border-cyan-500/20 pb-1.5">
                  4. Branding & Imágenes de Portada
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <ImagePicker
                      name="bannerUrl"
                      defaultValue={formBannerUrl}
                      label="Imagen de Banner de la Liga (Cabecera)"
                    />
                  </div>
                  <div>
                    <ImagePicker
                      name="logoUrl"
                      defaultValue={formLogoUrl}
                      label="Logo de la Liga (Badge / Escudo)"
                    />
                  </div>
                </div>
              </div>

              {/* DANGER ZONE & ACTIONS */}
              <div className="flex items-center justify-between pt-4 border-t border-shell-line/50">
                <button
                  type="button"
                  onClick={handleLeagueDelete}
                  className="border border-rose-800/60 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
                >
                  ⚠️ Eliminar Liga
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditLeagueOpen(false)}
                    className="border border-shell-line px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 hover:bg-white/5 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLeagueSubmitting}
                    className="bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold px-6 py-2 text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
                  >
                    {isLeagueSubmitting ? 'Guardando Ajustes...' : 'Guardar Cambios de la Liga'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAdmin && isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 animate-fade-in">
          <div className="shell-panel border border-shell-line bg-zinc-950 max-w-4xl w-full p-5 md:p-6 text-white rounded-none shadow-[0_0_60px_rgba(0,0,0,0.9)] relative grid md:grid-cols-[1.1fr_0.9fr] gap-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsEventModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Left side: Form for Add / Edit */}
            <div>
              <h2 className="text-xl font-bold uppercase tracking-tight text-white mb-1">
                {editingEvent ? 'Edit Event' : 'Add Event'}
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Configura los detalles completos de la ronda, circuito, horarios y enlace al servidor.
              </p>

              <form onSubmit={handleEventSubmit} className="space-y-4">
                {eventErrorMessage && (
                  <div className="border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-300 rounded-none">
                    {eventErrorMessage}
                  </div>
                )}

                {/* Event Title */}
                <div>
                  <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">Event Title / Session</label>
                  <input
                    type="text"
                    value={formEventTitle}
                    onChange={(e) => setFormEventTitle(e.target.value)}
                    placeholder="e.g. Round 1: 6 Hours of Le Mans (Optional)"
                    className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400"
                  />
                </div>

                {/* Circuit Name Text Input */}
                <div>
                  <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">Circuit Name (Nombre del Circuito)</label>
                  <input
                    type="text"
                    value={formEventCircuit}
                    onChange={(e) => setFormEventCircuit(e.target.value)}
                    placeholder="e.g. Circuit de la Sarthe, Le Mans"
                    required
                    className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400 font-semibold"
                  />
                </div>

                {/* Country Flag Selection */}
                <div>
                  <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">Country Flag (País / Bandera)</label>
                  <select
                    value={formEventCountryCode}
                    onChange={(e) => setFormEventCountryCode(e.target.value)}
                    className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400 font-mono"
                  >
                    <option value="FRA">🇫🇷 Francia (FRA)</option>
                    <option value="ESP">🇪🇸 España (ESP)</option>
                    <option value="ITA">🇮🇹 Italia (ITA)</option>
                    <option value="GER">🇩🇪 Alemania (GER)</option>
                    <option value="GBR">🇬🇧 Reino Unido (GBR)</option>
                    <option value="BEL">🇧🇪 Bélgica (BEL)</option>
                    <option value="USA">🇺🇸 Estados Unidos (USA)</option>
                    <option value="JPN">🇯🇵 Japón (JPN)</option>
                    <option value="BRA">🇧🇷 Brasil (BRA)</option>
                    <option value="ARG">🇦🇷 Argentina (ARG)</option>
                    <option value="MEX">🇲🇽 México (MEX)</option>
                  </select>
                </div>

                {/* Event Format */}
                <div>
                  <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">Event Format</label>
                  <select
                    value={formEventType}
                    onChange={(e) => setFormEventType(e.target.value as 'race' | 'qualifying' | 'time_attack')}
                    className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400"
                  >
                    <option value="race">🏁 Race (Carrera)</option>
                    <option value="qualifying">⚡ Qualifying (Clasificación)</option>
                    <option value="time_attack">⏱️ Time Attack (Hotlap)</option>
                  </select>
                </div>

                {/* Date & Time range */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">Date (Fecha)</label>
                    <input
                      type="date"
                      value={formEventDate}
                      onChange={(e) => setFormEventDate(e.target.value)}
                      required
                      className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">Starts At</label>
                    <input
                      type="time"
                      value={formEventStartsTime}
                      onChange={(e) => setFormEventStartsTime(e.target.value)}
                      required
                      className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">Ends At</label>
                    <input
                      type="time"
                      value={formEventEndsTime}
                      onChange={(e) => setFormEventEndsTime(e.target.value)}
                      required
                      className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400 font-mono"
                    />
                  </div>
                </div>

                {/* Circuit Image Upload */}
                <div>
                  <ImagePicker
                    name="circuitImageUrl"
                    defaultValue={formEventImageUrl}
                    label="Circuit Banner Image (PNG/JPG/WebP)"
                  />
                </div>

                {/* Server Entry Link */}
                <div>
                  <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">Server Entry Link (Direct Connection)</label>
                  <input
                    type="text"
                    name="serverLink"
                    value={formEventServerLink}
                    onChange={(e) => setFormEventServerLink(e.target.value)}
                    placeholder="e.g. steam://connect/12.34.56.78:27015 or direct web link"
                    className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400 font-mono"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex gap-2 pt-2 border-t border-shell-line/50">
                  <button
                    type="button"
                    onClick={() => setIsEventModalOpen(false)}
                    className="border border-shell-line bg-black/40 hover:bg-slate-800 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 rounded-none transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isEventSubmitting}
                    className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold disabled:opacity-50 py-2 text-xs font-bold uppercase tracking-wider rounded-none transition-colors"
                  >
                    {isEventSubmitting ? 'Saving...' : editingEvent ? 'Save Event Updates' : 'Add Event Round'}
                  </button>
                </div>
              </form>
            </div>

            {/* Right side: Event Card Live Preview */}
            <div className="flex flex-col border-l border-shell-line/50 pl-6 h-full justify-between hidden md:flex">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-cyan-400 mb-3 pb-1.5 border-b border-shell-line/40">
                  LIVE CARD PREVIEW
                </h3>

                <div className="border border-shell-line bg-black/50 overflow-hidden relative group">
                  <div className="h-44 w-full relative bg-slate-900 overflow-hidden">
                    {formEventImageUrl ? (
                      <img src={formEventImageUrl} alt={formEventCircuit} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/80 text-slate-500 text-xs font-bold">
                        <span>No circuit banner selected</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                    
                    <div className="absolute bottom-3 left-3 right-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-cyan-950 text-cyan-400 border border-cyan-800/50 px-2 py-0.5 text-[10px] font-mono font-bold uppercase">
                          {formEventType.toUpperCase()}
                        </span>
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                          {formEventCircuit || 'Circuit Name'}
                        </span>
                      </div>

                      <h4 className="text-base font-extrabold text-white uppercase italic tracking-tight drop-shadow-md">
                        {formEventTitle || formEventCircuit || 'Round Session Title'}
                      </h4>

                      <div className="flex items-center gap-2 text-xs text-slate-300 font-mono pt-1">
                        <Clock className="h-3.5 w-3.5 text-cyan-400" />
                        <span>{formEventDate} @ {formEventStartsTime}</span>
                      </div>
                    </div>
                  </div>

                  {formEventServerLink && (
                    <div className="p-3 bg-black/80 border-t border-shell-line/40 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold flex items-center gap-1">
                        <Play className="h-3 w-3 fill-current" /> Direct Server Link Ready
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 truncate max-w-[150px]">
                        {formEventServerLink}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isRegisterOpen && myManagedTeams.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fade-in">
          <div className="shell-panel border border-shell-line bg-zinc-950 max-w-md w-full p-5 text-white rounded-none relative">
            <button onClick={() => setIsRegisterOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-xl font-bold uppercase tracking-tight text-white mb-2">Register Team Entry</h2>
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">Select Team</label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  required
                  className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none"
                >
                  {myManagedTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-shell-line/50">
                <button type="button" onClick={() => setIsRegisterOpen(false)} className="border border-shell-line px-4 py-2 text-xs font-bold uppercase">
                  Cancel
                </button>
                <button type="submit" disabled={isRegSubmitting} className="bg-shell-accent px-5 py-2 text-xs font-bold uppercase text-white">
                  {isRegSubmitting ? 'Registering...' : 'Confirm Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
