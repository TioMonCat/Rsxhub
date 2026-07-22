'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, AlertCircle } from 'lucide-react'
import { useLeagueState, League, LeagueEvent, Registration, ManagedTeam, LeagueCar, EventConfirmation } from './hooks/use-league-state'
import { LeagueBanner } from './components/league-banner'
import { LeagueRegistration } from './components/league-registration'
import { LeagueSchedule } from './components/league-schedule'
import { LeagueStandings } from './components/league-standings'
import { LeagueResults } from './components/league-results'
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

  // Edit League Form States
  const [formStartsAt, setFormStartsAt] = useState(league.startsAt.split('T')[0])
  const [formEndsAt, setFormEndsAt] = useState(league.endsAt.split('T')[0])
  const [formClassLimits, setFormClassLimits] = useState<Record<string, number>>((league as any).classLimits || {})
  const [formRegistrationOpen, setFormRegistrationOpen] = useState(league.registrationOpen)
  const [formSlogan, setFormSlogan] = useState(league.slogan || '')
  const [formAccentColor, setFormAccentColor] = useState(accentHex)
  const [isLeagueSubmitting, setIsLeagueSubmitting] = useState(false)

  // Event Form States
  const [editingEvent, setEditingEvent] = useState<LeagueEvent | null>(null)
  const [formEventTitle, setFormEventTitle] = useState('')
  const [formEventCircuit, setFormEventCircuit] = useState('')
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
      formData.set('startsAt', formStartsAt)
      formData.set('endsAt', formEndsAt)
      formData.set('classLimitsJson', JSON.stringify(formClassLimits))
      formData.set('registrationOpen', formRegistrationOpen ? 'true' : 'false')
      formData.set('slogan', formSlogan)
      formData.set('accentColor', formAccentColor)

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
      setFormEventDate(event.startsAt.split('T')[0])
      setFormEventStartsTime(event.startsAt.split('T')[1]?.substring(0, 5) || '20:00')
      setFormEventEndsTime(event.endsAt.split('T')[1]?.substring(0, 5) || '21:30')
      setFormEventImageUrl(event.circuitImageUrl || '')
      setFormEventServerLink(event.serverLink || '')
    } else {
      setEditingEvent(null)
      setFormEventTitle('')
      setFormEventCircuit('Race')
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
      formData.set('circuitName', formEventCircuit || 'Race')
      formData.set('title', formEventTitle)
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

      {/* MODALS */}
      {isAdmin && isEditLeagueOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fade-in">
          <div className="shell-panel border border-shell-line bg-zinc-950 max-w-4xl w-full p-5 md:p-6 text-white rounded-none shadow-[0_0_50px_rgba(0,0,0,0.8)] relative">
            <button onClick={() => setIsEditLeagueOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-xl font-bold uppercase tracking-tight text-white mb-2">Edit League Details</h2>
            <form onSubmit={handleLeagueUpdate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">Start Date</label>
                    <input
                      type="date"
                      value={formStartsAt}
                      onChange={(e) => setFormStartsAt(e.target.value)}
                      required
                      className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">End Date</label>
                    <input
                      type="date"
                      value={formEndsAt}
                      onChange={(e) => setFormEndsAt(e.target.value)}
                      required
                      className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <ImagePicker name="bannerUrl" defaultValue={league.bannerUrl || ''} label="League Banner Image" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-shell-line/50">
                <button type="button" onClick={() => setIsEditLeagueOpen(false)} className="border border-shell-line px-4 py-2 text-xs font-bold uppercase">
                  Cancel
                </button>
                <button type="submit" disabled={isLeagueSubmitting} className="bg-shell-accent px-5 py-2 text-xs font-bold uppercase text-white">
                  {isLeagueSubmitting ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAdmin && isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fade-in">
          <div className="shell-panel border border-shell-line bg-zinc-950 max-w-xl w-full p-5 md:p-6 text-white rounded-none shadow-[0_0_50px_rgba(0,0,0,0.8)] relative">
            <button onClick={() => setIsEventModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-xl font-bold uppercase text-white mb-2">{editingEvent ? 'Edit Event' : 'Add Event'}</h2>
            <form onSubmit={handleEventSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">Event Title / Session</label>
                <input
                  type="text"
                  value={formEventTitle}
                  onChange={(e) => setFormEventTitle(e.target.value)}
                  placeholder="e.g. Round 1"
                  className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">Date</label>
                <input
                  type="date"
                  value={formEventDate}
                  onChange={(e) => setFormEventDate(e.target.value)}
                  required
                  className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-shell-line/50">
                <button type="button" onClick={() => setIsEventModalOpen(false)} className="border border-shell-line px-4 py-2 text-xs font-bold uppercase">
                  Cancel
                </button>
                <button type="submit" disabled={isEventSubmitting} className="bg-shell-accent px-5 py-2 text-xs font-bold uppercase text-white">
                  {isEventSubmitting ? 'Saving...' : 'Save Round'}
                </button>
              </div>
            </form>
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
