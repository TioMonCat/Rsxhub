'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, AlertCircle, Play, Clock } from 'lucide-react'
import { useLeagueState, League, LeagueEvent, Registration, ManagedTeam, LeagueCar, EventConfirmation } from './hooks/use-league-state'
import { LeagueBanner } from './components/league-banner'
import { LeagueRegistration } from './components/league-registration'
import { LeagueSchedule } from './components/league-schedule'
import { LeagueStandings } from './components/league-standings'
import { LeagueResults } from './components/league-results'
import { FinishRoundModal } from './components/finish-round-modal'
import { ViewResultsModal } from './components/view-results-modal'
import { LeagueEditModal } from './components/league-edit-modal'
import { updateLeagueDetailsAction, deleteLeagueAction, registerTeamAction, unregisterTeamAction, updateTeamPointsAction } from '@/app/ligas/actions'
import { saveCalendarEvent, deleteCalendarEvent } from '@/app/calendario/actions'
import { ClassBadge } from '@/components/class-badge'
import { ImagePicker } from '@/components/image-picker'
import { TimeInput24 } from '@/components/time-input-24'

type Props = {
  league: League
  initialEvents: LeagueEvent[]
  isAdmin: boolean
  canEditPoints?: boolean
  session: any
  initialRegistrations: Registration[]
  myManagedTeams: ManagedTeam[]
  leagueCars: LeagueCar[]
  teamInfo?: Record<string, { name: string; primaryColor: string | null; logoUrl: string | null }>
  initialConfirmations?: EventConfirmation[]
  initialPointsOverrides?: Record<string, number>
}

export default function LeagueDetailPageContent({
  league,
  initialEvents,
  isAdmin,
  canEditPoints = false,
  session,
  initialRegistrations,
  myManagedTeams,
  leagueCars,
  teamInfo = {},
  initialConfirmations = [],
  initialPointsOverrides = {}
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
    updateTeamPoints,
    registeredCars,
    groupedRegistrations
  } = useLeagueState({
    league,
    initialEvents,
    initialRegistrations,
    myManagedTeams,
    teamInfo,
    initialConfirmations,
    initialPointsOverrides
  })

  const handleUpdateTeamPoints = async (tag: string, teamId: string, newPoints: number) => {
    updateTeamPoints(tag, teamId, newPoints)
    try {
      const fd = new FormData()
      fd.set('leagueId', league.id)
      fd.set('classTag', tag)
      fd.set('teamId', teamId)
      fd.set('points', String(newPoints))
      fd.set('slug', league.slug)
      await updateTeamPointsAction(fd)
    } catch (err) {
      console.error('Failed to update team points:', err)
    }
  }

  // Accent color hex
  const accentHex = league.accentColor || '#1274de'

  // Modals visibility
  const [isEditLeagueOpen, setIsEditLeagueOpen] = useState(false)
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [isResultsOpen, setIsResultsOpen] = useState(false)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [finishingEvent, setFinishingEvent] = useState<LeagueEvent | null>(null)
  const [viewingResultsEvent, setViewingResultsEvent] = useState<LeagueEvent | null>(null)

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
  const [formMaxDriversPerCar, setFormMaxDriversPerCar] = useState<number>((league as any).maxDriversPerCar ?? 4)
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
  const [formHasQualy, setFormHasQualy] = useState(true)
  const [formQualyDate, setFormQualyDate] = useState('')
  const [formQualyStartsTime, setFormQualyStartsTime] = useState('19:30')
  const [formQualyEndsTime, setFormQualyEndsTime] = useState('20:00')
  const [formEventDate, setFormEventDate] = useState('')
  const [formEventStartsTime, setFormEventStartsTime] = useState('20:15')
  const [formEventEndsTime, setFormEventEndsTime] = useState('22:00')
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

  // Lock body scrolling when any modal is open to prevent double scrollbars
  useEffect(() => {
    const isAnyModalOpen = isEditLeagueOpen || isEventModalOpen || isRegisterOpen || isResultsOpen || Boolean(finishingEvent) || Boolean(viewingResultsEvent)
    if (!isAnyModalOpen) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [isEditLeagueOpen, isEventModalOpen, isRegisterOpen, isResultsOpen, finishingEvent, viewingResultsEvent])

  // Handlers
  const handleLeagueDelete = async () => {
    if (!confirm('Are you sure you want to delete this league? This action cannot be undone.')) return
    try {
      await deleteLeagueAction(league.id, league.slug)
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
      formData.set('maxDriversPerCar', String(formMaxDriversPerCar))
      formData.set('slogan', formSlogan)
      formData.set('accentColor', formAccentColor)
      formData.set('bannerUrl', String(formData.get('bannerUrl') || formBannerUrl))
      formData.set('logoUrl', String(formData.get('logoUrl') || formLogoUrl))

      await updateLeagueDetailsAction(formData)
      setIsEditLeagueOpen(false)
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Error updating league settings.')
    } finally {
      setIsLeagueSubmitting(false)
    }
  }

  const formatLocalTimeInput = (isoStr?: string | null, fallback = '20:00') => {
    if (!isoStr) return fallback
    if (isoStr.includes('T')) {
      const timePart = isoStr.split('T')[1]?.substring(0, 5)
      if (timePart && /^\d{2}:\d{2}$/.test(timePart)) return timePart
    }
    return fallback
  }

  const formatLocalDateInput = (isoStr?: string | null, fallback = '') => {
    if (!isoStr) return fallback
    if (isoStr.includes('T')) {
      const datePart = isoStr.split('T')[0]
      if (datePart && /^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart
    }
    return fallback
  }

  const createLocalISO = (dateStr: string, timeStr: string) => {
    const d = dateStr || '2026-08-08'
    const t = timeStr || '20:00'
    return `${d}T${t}:00`
  }

  const handleOpenEventModal = (event?: LeagueEvent) => {
    if (event) {
      setEditingEvent(event)
      setFormEventTitle(event.title || '')
      setFormEventCircuit(event.circuitName || '')
      setFormEventCountryCode((event as any).countryCode || 'FRA')
      setFormEventType((event as any).eventType || 'race')
      setFormHasQualy(event.hasQualy ?? true)
      setFormQualyDate(formatLocalDateInput(event.qualyStartsAt || event.startsAt))
      setFormQualyStartsTime(formatLocalTimeInput(event.qualyStartsAt, '19:30'))
      setFormQualyEndsTime(formatLocalTimeInput(event.qualyEndsAt, '20:00'))
      setFormEventDate(formatLocalDateInput(event.startsAt))
      setFormEventStartsTime(formatLocalTimeInput(event.startsAt, '20:15'))
      setFormEventEndsTime(formatLocalTimeInput(event.endsAt, '22:00'))
      setFormEventImageUrl(event.circuitImageUrl || '')
      setFormEventServerLink(event.serverLink || '')
    } else {
      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      setEditingEvent(null)
      setFormEventTitle('')
      setFormEventCircuit('Circuit de la Sarthe, Le Mans')
      setFormEventCountryCode('FRA')
      setFormEventType('race')
      setFormHasQualy(true)
      setFormQualyDate(todayStr)
      setFormQualyStartsTime('19:30')
      setFormQualyEndsTime('20:00')
      setFormEventDate(todayStr)
      setFormEventStartsTime('20:15')
      setFormEventEndsTime('22:00')
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
      const startsAtFull = createLocalISO(formEventDate, formEventStartsTime || '20:15')
      const endsAtFull = createLocalISO(formEventDate, formEventEndsTime || '22:00')
      const qualyStartsAtFull = formHasQualy ? createLocalISO(formQualyDate || formEventDate, formQualyStartsTime || '19:30') : null
      const qualyEndsAtFull = formHasQualy ? createLocalISO(formQualyDate || formEventDate, formQualyEndsTime || '20:00') : null

      const formData = new FormData(e.currentTarget)
      formData.set('leagueId', league.id)
      formData.set('circuitName', formEventCircuit || 'Circuit')
      formData.set('title', formEventTitle)
      formData.set('countryCode', formEventCountryCode)
      formData.set('eventType', formEventType)
      formData.set('date', formEventDate)
      formData.set('hasQualy', formHasQualy ? 'true' : 'false')
      formData.set('qualyDate', formQualyDate || formEventDate)
      formData.set('qualyStartsAtTime', formQualyStartsTime)
      formData.set('qualyEndsAtTime', formQualyEndsTime)
      formData.set('qualyStartsAt', qualyStartsAtFull || '')
      formData.set('qualyEndsAt', qualyEndsAtFull || '')
      formData.set('startsAt', startsAtFull)
      formData.set('endsAt', endsAtFull)

      if (editingEvent) {
        formData.set('eventId', editingEvent.id)
      }

      const res = await saveCalendarEvent(formData)
      if (res && res.error) {
        setEventErrorMessage(res.error)
        return
      }

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
      formData.set('slug', league.slug || '')
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
      formData.set('slug', league.slug || '')
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
    <div className="space-y-6">

      {/* 1. Header Banner */}
      <LeagueBanner
        league={league}
        accentHex={accentHex}
        isAdmin={isAdmin}
        onEditSettings={() => setIsEditLeagueOpen(true)}
        onDeleteLeague={handleLeagueDelete}
        registrationElement={
          <LeagueRegistration
            league={league}
            session={session}
            myManagedTeams={myManagedTeams}
            groupedRegistrations={groupedRegistrations}
            registeredCarsCount={registeredCars.length}
            initialRegistrations={initialRegistrations}
            onOpenRegisterModal={() => setIsRegisterOpen(true)}
            onWithdrawTeam={handleWithdrawTeam}
          />
        }
      />

      {/* 2. Main Content Grid */}
      <section className="grid gap-4 md:grid-cols-[1.6fr_1.4fr]">
        <LeagueSchedule
          league={league}
          events={events}
          isAdmin={isAdmin}
          classTags={classTags}
          confirmations={confirmations}
          initialRegistrations={initialRegistrations}
          myManagedTeams={myManagedTeams}
          teamInfo={teamInfo}
          standings={standings}
          onOpenEventModal={handleOpenEventModal}
          onDeleteEvent={handleEventDelete}
          onFinishRound={(ev) => setFinishingEvent(ev)}
          onViewResults={(ev) => setViewingResultsEvent(ev)}
        />

        <LeagueStandings
          isAdmin={isAdmin}
          canEditPoints={canEditPoints}
          classTags={classTags}
          standings={standings}
          standingsIndices={standingsIndices}
          customCarImages={customCarImages}
          onScrollStandings={scrollStandings}
          onCarImageUpload={handleCarImageUpload}
          onUpdateTeamPoints={handleUpdateTeamPoints}
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

      {/* View Results Modal (Read-Only for Pilots & Users) */}
      {viewingResultsEvent && (
        <ViewResultsModal
          event={viewingResultsEvent}
          leagueId={league.id}
          classTags={classTags}
          onClose={() => setViewingResultsEvent(null)}
        />
      )}

      {/* Finish Round Modal (Admin Only) */}
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
      {isAdmin && (
        <LeagueEditModal
          league={league}
          isOpen={isEditLeagueOpen}
          onClose={() => setIsEditLeagueOpen(false)}
        />
      )}

      {isAdmin && isEventModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm p-4 md:p-6 flex justify-center items-start sm:items-center animate-fade-in">
          <div className="shell-panel border border-shell-line bg-[#090d16] max-w-4xl w-full p-5 md:p-6 text-white rounded-none shadow-[0_0_60px_rgba(0,0,0,0.9)] relative grid md:grid-cols-[1.1fr_0.9fr] gap-6 my-auto">
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
                Configure the full details of the round, circuit, schedules and server link.
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
                  <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">Circuit Name</label>
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
                  <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">Country Flag</label>
                  <select
                    value={formEventCountryCode}
                    onChange={(e) => setFormEventCountryCode(e.target.value)}
                    className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400 font-mono"
                  >
                    <option value="FRA">🇫🇷 France (FRA)</option>
                    <option value="ESP">🇪🇸 Spain (ESP)</option>
                    <option value="ITA">🇮🇹 Italy (ITA)</option>
                    <option value="GER">🇩🇪 Germany (GER)</option>
                    <option value="GBR">🇬🇧 United Kingdom (GBR)</option>
                    <option value="BEL">🇧🇪 Belgium (BEL)</option>
                    <option value="USA">🇺🇸 United States (USA)</option>
                    <option value="JPN">🇯🇵 Japan (JPN)</option>
                    <option value="BRA">🇧🇷 Brazil (BRA)</option>
                    <option value="ARG">🇦🇷 Argentina (ARG)</option>
                    <option value="MEX">🇲🇽 Mexico (MEX)</option>
                  </select>
                </div>

                {/* Sessions Schedule Section */}
                <div className="border border-shell-line bg-black/60 p-3 space-y-3 rounded-none">
                  <h4 className="text-xs font-black uppercase text-cyan-400 tracking-wider flex items-center gap-1.5 border-b border-white/10 pb-2">
                    📅 Round Session Schedules
                  </h4>

                  {/* Qualifying Session Inputs */}
                  <div className="space-y-2 border-b border-white/10 pb-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formHasQualy}
                          onChange={(e) => setFormHasQualy(e.target.checked)}
                          className="accent-cyan-500 cursor-pointer"
                        />
                        ⏱️ Include Qualifying Session
                      </label>
                    </div>

                    {formHasQualy && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                        <div>
                          <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">Qualy Date</label>
                          <input
                            type="date"
                            value={formQualyDate}
                            onChange={(e) => setFormQualyDate(e.target.value)}
                            className="w-full border border-shell-line bg-black/40 px-2.5 py-1.5 text-xs text-white outline-none rounded-none focus:border-cyan-400 font-mono"
                          />
                        </div>
                        <TimeInput24
                          label="Qualy Starts"
                          value={formQualyStartsTime}
                          onChange={(val) => setFormQualyStartsTime(val)}
                        />
                        <TimeInput24
                          label="Qualy Ends"
                          value={formQualyEndsTime}
                          onChange={(val) => setFormQualyEndsTime(val)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Race Session Inputs */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-amber-400 uppercase tracking-wide">
                      🏁 Race Session
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">Race Date</label>
                        <input
                          type="date"
                          value={formEventDate}
                          onChange={(e) => setFormEventDate(e.target.value)}
                          required
                          className="w-full border border-shell-line bg-black/40 px-2.5 py-1.5 text-xs text-white outline-none rounded-none focus:border-cyan-400 font-mono"
                        />
                      </div>
                      <TimeInput24
                        label="Race Starts"
                        value={formEventStartsTime}
                        onChange={(val) => setFormEventStartsTime(val)}
                      />
                      <TimeInput24
                        label="Race Ends"
                        value={formEventEndsTime}
                        onChange={(val) => setFormEventEndsTime(val)}
                      />
                    </div>
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm p-4 md:p-6 flex justify-center items-start sm:items-center animate-fade-in">
          <div className="shell-panel border border-shell-line bg-[#090d16] max-w-md w-full p-5 text-white rounded-none relative my-auto">
            <button onClick={() => setIsRegisterOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-xl font-bold uppercase tracking-tight text-white mb-2">Añadir Equipo a la Liga</h2>
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">Seleccionar Equipo</label>
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
                  Cancelar
                </button>
                <button type="submit" disabled={isRegSubmitting} className="bg-shell-accent px-5 py-2 text-xs font-bold uppercase text-white">
                  {isRegSubmitting ? 'Registrando...' : 'Confirmar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
