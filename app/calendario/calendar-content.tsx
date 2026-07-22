'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCalendarState, LeagueEvent, League } from './hooks/use-calendar-state'
import { CalendarMonthGrid } from './components/calendar-month-grid'
import { CalendarProgramme } from './components/calendar-programme'
import { CalendarEventModal } from './components/calendar-event-modal'
import { saveCalendarEvent, deleteCalendarEvent } from './actions'

type Props = {
  initialEvents: LeagueEvent[]
  leagues: League[]
  anchorDateStr: string
  viewMode: 'month' | 'programme'
  isAdmin: boolean
  monthDaysStr: string[]
  weekDaysStr: string[]
  prevMonthStr: string
  nextMonthStr: string
  prevWeekStr: string
  nextWeekStr: string
}

export default function CalendarContent({
  initialEvents,
  leagues,
  anchorDateStr,
  viewMode,
  isAdmin,
  monthDaysStr,
}: Props) {
  const router = useRouter()
  const anchorDate = new Date(anchorDateStr)
  const monthDays = monthDaysStr.map((s) => new Date(s))

  const {
    events,
    setEvents,
    selectedDate,
    setSelectedDate,
    editingEvent,
    setEditingEvent,
    isModalOpen,
    setIsModalOpen,
    programmeFilter,
    setProgrammeFilter,
    leagueById,
    getLeagueGradient,
  } = useCalendarState({ initialEvents, leagues })

  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [formLeagueId, setFormLeagueId] = useState(leagues[0]?.id || '')
  const [formTitle, setFormTitle] = useState('')
  const [formCircuit, setFormCircuit] = useState('')
  const [formStartsAtTime, setFormStartsAtTime] = useState('20:00')
  const [formEndsAtTime, setFormEndsAtTime] = useState('21:30')
  const [formImageUrl, setFormImageUrl] = useState('')
  const [formServerLink, setFormServerLink] = useState('')
  const [formEventType, setFormEventType] = useState<'race' | 'qualifying' | 'time_attack'>('race')
  const [formCountryCode, setFormCountryCode] = useState('ESP')

  function pad(val: number) {
    return String(val).padStart(2, '0')
  }

  function dateKeyUTC(d: Date) {
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
  }

  const eventsByDay = new Map<string, LeagueEvent[]>()
  for (const event of events) {
    const key = dateKeyUTC(new Date(event.startsAt))
    const arr = eventsByDay.get(key) || []
    arr.push(event)
    eventsByDay.set(key, arr)
  }

  const handleOpenAddModal = (day: Date) => {
    setSelectedDate(day)
    setEditingEvent(null)
    setFormLeagueId(leagues[0]?.id || '')
    setFormTitle('')
    setFormCircuit('Race')
    setFormStartsAtTime('20:00')
    setFormEndsAtTime('21:30')
    setFormImageUrl('')
    setFormServerLink('')
    setFormEventType('race')
    setFormCountryCode('ESP')
    setErrorMessage('')
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (event: LeagueEvent) => {
    setEditingEvent(event)
    setSelectedDate(null)
    setFormLeagueId(event.leagueId)
    setFormTitle(event.title || '')
    setFormCircuit(event.circuitName || '')
    setFormStartsAtTime(event.startsAt.split('T')[1]?.substring(0, 5) || '20:00')
    setFormEndsAtTime(event.endsAt.split('T')[1]?.substring(0, 5) || '21:30')
    setFormImageUrl(event.circuitImageUrl || '')
    setFormServerLink(event.serverLink || '')
    setFormEventType(event.eventType || 'race')
    setFormCountryCode(event.countryCode || 'ESP')
    setErrorMessage('')
    setIsModalOpen(true)
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return
    try {
      await deleteCalendarEvent(eventId)
      setEvents((prev) => prev.filter((ev) => ev.id !== eventId))
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Error deleting event.')
    }
  }

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const targetDate = editingEvent
        ? new Date(editingEvent.startsAt).toISOString().split('T')[0]
        : selectedDate
        ? selectedDate.toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]

      const startsAtFull = `${targetDate}T${formStartsAtTime}:00Z`
      const endsAtFull = `${targetDate}T${formEndsAtTime}:00Z`

      const formData = new FormData(e.currentTarget)
      formData.set('leagueId', formLeagueId)
      formData.set('circuitName', formCircuit)
      formData.set('title', formTitle)
      formData.set('startsAt', startsAtFull)
      formData.set('endsAt', endsAtFull)
      formData.set('eventType', formEventType)
      formData.set('countryCode', formCountryCode)
      formData.set('serverLink', formServerLink)

      if (editingEvent) {
        formData.set('id', editingEvent.id)
      }

      await saveCalendarEvent(formData)
      setIsModalOpen(false)
      router.refresh()
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save calendar event.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {viewMode === 'month' ? (
        <CalendarMonthGrid
          monthDays={monthDays}
          anchorDate={anchorDate}
          eventsByDay={eventsByDay}
          leagueById={leagueById}
          isAdmin={isAdmin}
          getLeagueGradient={getLeagueGradient}
          onOpenAddModal={handleOpenAddModal}
          onOpenEditModal={handleOpenEditModal}
          onDeleteEvent={handleDeleteEvent}
        />
      ) : (
        <CalendarProgramme
          events={events}
          programmeFilter={programmeFilter}
          leagueById={leagueById}
          isAdmin={isAdmin}
          getLeagueGradient={getLeagueGradient}
          onFilterChange={setProgrammeFilter}
          onOpenEditModal={handleOpenEditModal}
          onDeleteEvent={handleDeleteEvent}
        />
      )}

      <CalendarEventModal
        isOpen={isModalOpen}
        editingEvent={editingEvent}
        selectedDate={selectedDate}
        leagues={leagues}
        isSubmitting={isSubmitting}
        errorMessage={errorMessage}
        formLeagueId={formLeagueId}
        formTitle={formTitle}
        formCircuit={formCircuit}
        formStartsAtTime={formStartsAtTime}
        formEndsAtTime={formEndsAtTime}
        formImageUrl={formImageUrl}
        formServerLink={formServerLink}
        formEventType={formEventType}
        formCountryCode={formCountryCode}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
        setFormLeagueId={setFormLeagueId}
        setFormTitle={setFormTitle}
        setFormCircuit={setFormCircuit}
        setFormStartsAtTime={setFormStartsAtTime}
        setFormEndsAtTime={setFormEndsAtTime}
        setFormServerLink={setFormServerLink}
        setFormEventType={setFormEventType}
        setFormCountryCode={setFormCountryCode}
      />
    </div>
  )
}
