'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, MapPin, Plus, Trash2, Edit2, X, Play } from 'lucide-react'
import { saveCalendarEvent, deleteCalendarEvent } from './actions'
import { ImagePicker } from '@/components/image-picker'
import { getCountryFlag } from '@/lib/countries'

type LeagueEvent = {
  id: string
  leagueId: string
  circuitId: string | null
  title: string | null
  circuitName: string
  circuitImageUrl: string | null
  serverLink?: string | null
  startsAt: string
  endsAt: string
  status: string
  eventType?: 'race' | 'time_attack' | null
  countryCode?: string | null
}

type League = {
  id: string
  title: string
  slug: string
  simulator?: string
  registrationOpen?: boolean
}

type Props = {
  initialEvents: LeagueEvent[]
  leagues: League[]
  anchorDateStr: string
  viewMode: 'month' | 'programme'
  isAdmin: boolean
  monthDaysStr: string[] // ISO strings for serialization
  weekDaysStr: string[]  // ISO strings for serialization
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
  weekDaysStr,
  prevMonthStr,
  nextMonthStr,
  prevWeekStr,
  nextWeekStr,
}: Props) {
  const router = useRouter()
  const anchorDate = new Date(anchorDateStr)
  const monthDays = monthDaysStr.map(s => new Date(s))
  const weekDays = weekDaysStr.map(s => new Date(s))

  const leagueById = new Map(leagues.map((league) => [league.id, league]))

  function getLeagueGradient(leagueTitle?: string, leagueSlug?: string) {
    const title = String(leagueTitle || '').toUpperCase()
    const slug = String(leagueSlug || '').toLowerCase()
    
    if (slug.includes('erc-ng') || slug.includes('nextgen') || title.includes('NEXT GEN') || title.includes('NG')) {
      // Next Gen: Dark Navy to Vibrant Orange
      return 'linear-gradient(135deg, rgba(3, 6, 16, 0.94) 0%, rgba(255, 85, 0, 0.5) 100%)'
    }
    if (slug.includes('erc') || title.includes('ERC') || title.includes('ENDURANCE REAL')) {
      // ERC: Dark Navy to Vibrant Blue
      return 'linear-gradient(135deg, rgba(2, 6, 15, 0.94) 0%, rgba(0, 114, 240, 0.45) 100%)'
    }
    // General fallback: Dark slate to soft cyan-blue
    return 'linear-gradient(135deg, rgba(8, 12, 21, 0.94) 0%, rgba(18, 116, 222, 0.35) 100%)'
  }

  const [events, setEvents] = useState<LeagueEvent[]>(initialEvents)

  useEffect(() => {
    setEvents(initialEvents)
  }, [initialEvents])

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    // Import and set up client-side Firebase Firestore listener if available
    import('@/lib/firebase-client').then(({ getFirebaseClientDb }) => {
      const db = getFirebaseClientDb()
      if (!db) return

      import('firebase/firestore').then(({ collection, onSnapshot }) => {
        unsubscribe = onSnapshot(collection(db, 'league_events'), (snapshot) => {
          const fetchedEvents: LeagueEvent[] = []
          snapshot.forEach((doc) => {
            const data = doc.data()
            let startsAt = ''
            if (data.starts_at) {
              if (typeof data.starts_at.toDate === 'function') {
                startsAt = data.starts_at.toDate().toISOString()
              } else {
                startsAt = String(data.starts_at)
              }
            } else if (data.startsAt) {
              startsAt = String(data.startsAt)
            }

            let endsAt = ''
            if (data.ends_at) {
              if (typeof data.ends_at.toDate === 'function') {
                endsAt = data.ends_at.toDate().toISOString()
              } else {
                endsAt = String(data.ends_at)
              }
            } else if (data.endsAt) {
              endsAt = String(data.endsAt)
            }

            fetchedEvents.push({
              id: doc.id,
              leagueId: data.league_id || data.leagueId || '',
              circuitId: data.circuit_id || data.circuitId || null,
              title: data.title || null,
              circuitName: data.circuit_name || data.circuitName || '',
              circuitImageUrl: data.circuit_image_url || data.circuitImageUrl || null,
              serverLink: data.server_link || data.serverLink || null,
              startsAt,
              endsAt,
              status: data.status || 'scheduled',
            })
          })

          fetchedEvents.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
          setEvents(fetchedEvents)
        }, (error) => {
          console.error("Firestore onSnapshot error:", error)
        })
      }).catch((err) => console.error("Failed to load firebase/firestore:", err))
    }).catch((err) => console.error("Failed to load @/lib/firebase:", err))

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  const eventsByDay = new Map<string, LeagueEvent[]>()
  for (const event of events) {
    const key = dateKeyUTC(new Date(event.startsAt))
    const arr = eventsByDay.get(key) || []
    arr.push(event)
    eventsByDay.set(key, arr)
  }

  // Modal States
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [editingEvent, setEditingEvent] = useState<LeagueEvent | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Form states
  const [formLeagueId, setFormLeagueId] = useState(leagues[0]?.id || '')
  const [formTitle, setFormTitle] = useState('')
  const [formCircuit, setFormCircuit] = useState('')
  const [formStartsAtTime, setFormStartsAtTime] = useState('20:00')
  const [formEndsAtTime, setFormEndsAtTime] = useState('21:30')
  const [formImageUrl, setFormImageUrl] = useState('')
  const [formServerLink, setFormServerLink] = useState('')
  const [formEventType, setFormEventType] = useState<'race' | 'time_attack'>('race')
  const [formCountryCode, setFormCountryCode] = useState('ESP')

  // Programme filter state
  const [programmeFilter, setProgrammeFilter] = useState<'all' | 'race' | 'time_attack'>('all')

  function pad(value: number) {
    return String(value).padStart(2, '0')
  }

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  function formatTime(startsAt: string) {
    const startsTime = new Date(startsAt)
    if (!mounted) {
      return `${pad(startsTime.getUTCHours())}:${pad(startsTime.getUTCMinutes())}`
    }
    return `${pad(startsTime.getHours())}:${pad(startsTime.getMinutes())}`
  }

  function dateKeyUTC(date: Date) {
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
  }

  function getCircuitCountry(event: LeagueEvent) {
    if (event.countryCode) {
      const abbr = event.countryCode.toUpperCase()
      return { code: abbr.slice(0, 2), abbr }
    }
    const name = String(event.circuitName || '').toLowerCase()
    if (name.includes('imola') || name.includes('monza') || name.includes('misano') || name.includes('mugello')) return { code: 'IT', abbr: 'ITA' }
    if (name.includes('spa') || name.includes('francorchamps') || name.includes('zolder')) return { code: 'BE', abbr: 'BEL' }
    if (name.includes('sao paulo') || name.includes('interlagos') || name.includes('brazil')) return { code: 'BR', abbr: 'BRA' }
    if (name.includes('cota') || name.includes('austin') || name.includes('daytona') || name.includes('sebring') || name.includes('indianapolis') || name.includes('watkins')) return { code: 'US', abbr: 'USA' }
    if (name.includes('fuji') || name.includes('suzuka') || name.includes('motegi')) return { code: 'JP', abbr: 'JPN' }
    if (name.includes('qatar') || name.includes('lusail')) return { code: 'QA', abbr: 'QAT' }
    if (name.includes('barcelona') || name.includes('catalunya') || name.includes('jerez') || name.includes('aragon') || name.includes('valencia')) return { code: 'ES', abbr: 'ESP' }
    if (name.includes('nurburgring') || name.includes('hockenheim')) return { code: 'DE', abbr: 'GER' }
    if (name.includes('silverstone') || name.includes('brands') || name.includes('donington')) return { code: 'GB', abbr: 'GBR' }
    if (name.includes('le mans') || name.includes('paul ricard') || name.includes('magny')) return { code: 'FR', abbr: 'FRA' }
    if (name.includes('portimao') || name.includes('estoril')) return { code: 'PT', abbr: 'POR' }
    if (name.includes('bahrain') || name.includes('sakhir')) return { code: 'BH', abbr: 'BHR' }
    return { code: 'ES', abbr: 'ESP' }
  }

  function getEventType(event: LeagueEvent, league?: League): 'RACE' | 'TIME ATTACK' {
    if (event.eventType === 'time_attack') return 'TIME ATTACK'
    if (event.eventType === 'race') return 'RACE'

    const title = String(event.title || '').toUpperCase()
    const circuit = String(event.circuitName || '').toUpperCase()

    if (
      title.includes('TIME ATTACK') ||
      title.includes('HOTLAP') ||
      title.includes('TIME TRIAL') ||
      title.includes('TA ') ||
      title.includes('TA-') ||
      circuit.includes('TIME ATTACK') ||
      circuit.includes('HOTLAP')
    ) {
      return 'TIME ATTACK'
    }
    return 'RACE'
  }

  function buildCalendarUrl(view: 'month' | 'programme', date: Date) {
    return `/calendario?view=${view}&date=${dateKeyUTC(date)}`
  }

  function monthLabel(date: Date) {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    })
  }

  function dayLabel(date: Date) {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    })
  }

  const handleCellClick = (date: Date) => {
    if (!isAdmin) return // Only admins can click to manage
    setSelectedDate(date)
    setEditingEvent(null)
    setErrorMessage('')
    // Reset form
    setFormLeagueId(leagues[0]?.id || '')
    setFormTitle('')
    setFormCircuit('')
    setFormStartsAtTime('20:00')
    setFormEndsAtTime('21:30')
    setFormImageUrl('')
    setFormServerLink('')
    setFormEventType('race')
    setFormCountryCode('ESP')
  }

  const handleEditClick = (event: LeagueEvent) => {
    setEditingEvent(event)
    setFormLeagueId(event.leagueId)
    setFormTitle(event.title || '')
    setFormCircuit(event.circuitName)
    setFormEventType(event.eventType || 'race')
    setFormCountryCode(event.countryCode || 'ESP')
    
    // Parse time in local timezone
    const startsDate = new Date(event.startsAt)
    const endsDate = new Date(event.endsAt)
    setSelectedDate(startsDate)
    setFormStartsAtTime(`${pad(startsDate.getHours())}:${pad(startsDate.getMinutes())}`)
    setFormEndsAtTime(`${pad(endsDate.getHours())}:${pad(endsDate.getMinutes())}`)
    setFormImageUrl(event.circuitImageUrl || '')
    setFormServerLink(event.serverLink || '')
  }

  const handleCancelEdit = () => {
    setEditingEvent(null)
    setFormLeagueId(leagues[0]?.id || '')
    setFormTitle('')
    setFormCircuit('')
    setFormStartsAtTime('20:00')
    setFormEndsAtTime('21:30')
    setFormImageUrl('')
    setFormServerLink('')
    setFormEventType('race')
    setFormCountryCode('ESP')
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedDate) return
    setIsSubmitting(true)
    setErrorMessage('')

    const nativeFormData = new FormData(e.currentTarget)
    const uploadedImageUrl = String(nativeFormData.get('circuitImageUrl') || '').trim()
    const serverLinkUrl = String(nativeFormData.get('serverLink') || '').trim()

    let startsIso = ''
    let endsIso = ''
    try {
      const [year, month, day] = dateKeyUTC(selectedDate).split('-').map(Number)
      const [sHour, sMin] = formStartsAtTime.split(':').map(Number)
      const [eHour, eMin] = formEndsAtTime.split(':').map(Number)
      const localStartsDate = new Date(year, month - 1, day, sHour, sMin)
      const localEndsDate = new Date(year, month - 1, day, eHour, eMin)

      if (isNaN(localStartsDate.getTime()) || isNaN(localEndsDate.getTime())) {
        throw new Error('Invalid Date input')
      }
      startsIso = localStartsDate.toISOString()
      endsIso = localEndsDate.toISOString()
    } catch (err) {
      setErrorMessage('Invalid date or time parameters.')
      setIsSubmitting(false)
      return
    }

    const formData = new FormData()
    if (editingEvent) {
      formData.set('eventId', editingEvent.id)
    }
    formData.set('leagueId', formLeagueId)
    formData.set('title', formTitle)
    formData.set('circuitName', formCircuit)
    formData.set('date', dateKeyUTC(selectedDate))
    formData.set('startsAt', startsIso)
    formData.set('endsAt', endsIso)
    formData.set('circuitImageUrl', uploadedImageUrl)
    formData.set('serverLink', serverLinkUrl)
    formData.set('eventType', formEventType)
    formData.set('countryCode', formCountryCode)

    try {
      const res = await saveCalendarEvent(formData)
      if (res && !res.success) {
        setErrorMessage(res.error || 'Failed to save event.')
        setIsSubmitting(false)
        return
      }
      // Reset form states
      setEditingEvent(null)
      setFormTitle('')
      setFormCircuit('')
      setFormImageUrl('')
      setFormServerLink('')
      router.refresh()
      // Keep modal open so they can see / add multiple events
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save event.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (eventId: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        const res = await deleteCalendarEvent(eventId)
        if (res && !res.success) {
          alert(res.error || 'Failed to delete event.')
          return
        }
        if (editingEvent?.id === eventId) {
          setEditingEvent(null)
        }
        router.refresh()
      } catch (err: any) {
        alert(err.message || 'Failed to delete event.')
      }
    }
  }

  const activeDayKey = selectedDate ? dateKeyUTC(selectedDate) : ''
  const activeDayEvents = selectedDate ? (eventsByDay.get(activeDayKey) || []) : []

  return (
    <div className="space-y-4 text-white">
      <style>{`
        @keyframes calendar-today-breath {
          0% {
            border-color: #1274de;
            box-shadow: 0 0 6px rgba(18, 116, 222, 0.45), inset 0 0 10px rgba(18, 116, 222, 0.25);
          }
          50% {
            border-color: #3b82f6;
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.95), inset 0 0 16px rgba(59, 130, 246, 0.5);
          }
          100% {
            border-color: #1274de;
            box-shadow: 0 0 6px rgba(18, 116, 222, 0.45), inset 0 0 10px rgba(18, 116, 222, 0.25);
          }
        }
        .today-breath-active {
          animation: calendar-today-breath 2s infinite ease-in-out;
          border: 2px solid #1274de !important;
        }
      `}</style>
      {/* 1. Header controls */}
      <section className="shell-panel p-4 md:p-5 rounded-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Toggle View Mode: Month Grid vs Official Programme */}
          <div className="flex items-center gap-2">
            <Link
              href={buildCalendarUrl('month', anchorDate)}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-none transition-colors ${
                viewMode === 'month' ? 'bg-[#1274de] text-white shadow-md' : 'border border-white/15 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              MONTH GRID
            </Link>
            <Link
              href={buildCalendarUrl('programme', anchorDate)}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-none transition-colors ${
                viewMode === 'programme' ? 'bg-[#1274de] text-white shadow-md' : 'border border-white/15 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              PROGRAMME
            </Link>
          </div>

          {viewMode === 'month' && (
            <div className="flex items-center gap-2">
              <Link
                href={buildCalendarUrl('month', new Date(prevMonthStr))}
                className="border border-shell-line bg-white/5 px-3 py-2 text-xs font-semibold text-white rounded-none hover:bg-white/10"
              >
                Previous
              </Link>
              <div className="border border-shell-line bg-black/20 px-4 py-2 text-sm font-bold text-white rounded-none">
                {monthLabel(anchorDate)}
              </div>
              <Link
                href={buildCalendarUrl('month', new Date(nextMonthStr))}
                className="border border-shell-line bg-white/5 px-3 py-2 text-xs font-semibold text-white rounded-none hover:bg-white/10"
              >
                Next
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* 2. Official Programme View or Month Grid View */}
      {viewMode === 'programme' ? (
        <section className="shell-panel p-6 md:p-10 rounded-none bg-gradient-to-b from-[#0a0f1d] via-[#090d18] to-[#04060b] border border-white/10 space-y-8">
          {/* Official Programme Title Banner & Filters */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-[0.35em] text-[#1274de] italic">OFFICIAL</p>
              <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tight text-white drop-shadow-md">
                PROGRAMME
              </h2>
            </div>

            {/* Event Format Filter Tabs: ALL, RACES, TIME ATTACK */}
            <div className="flex items-center gap-1 bg-black/40 p-1 border border-white/10 self-start md:self-auto">
              <button
                type="button"
                onClick={() => setProgrammeFilter('all')}
                className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-colors rounded-none ${
                  programmeFilter === 'all' ? 'bg-[#1274de] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                ALL ({events.length})
              </button>
              <button
                type="button"
                onClick={() => setProgrammeFilter('race')}
                className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-colors rounded-none flex items-center gap-1.5 ${
                  programmeFilter === 'race' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                🏁 RACES ({events.filter(e => getEventType(e, leagueById.get(e.leagueId)) === 'RACE').length})
              </button>
              <button
                type="button"
                onClick={() => setProgrammeFilter('time_attack')}
                className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-colors rounded-none flex items-center gap-1.5 ${
                  programmeFilter === 'time_attack' ? 'bg-amber-500 text-black font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                ⏱️ TIME ATTACK ({events.filter(e => getEventType(e, leagueById.get(e.leagueId)) === 'TIME ATTACK').length})
              </button>
            </div>
          </div>

          {/* List of Race & Time Attack Events in Programme Format */}
          <div className="space-y-4 max-w-4xl mx-auto">
            {(() => {
              const filteredEvents = [...events]
                .filter((event) => {
                  const type = getEventType(event, leagueById.get(event.leagueId))
                  if (programmeFilter === 'race') return type === 'RACE'
                  if (programmeFilter === 'time_attack') return type === 'TIME ATTACK'
                  return true
                })
                .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())

              if (filteredEvents.length === 0) {
                return (
                  <div className="p-12 text-center text-slate-500 italic text-sm border border-dashed border-white/10">
                    No scheduled {programmeFilter === 'all' ? 'events' : programmeFilter === 'race' ? 'races' : 'time attack sessions'} in the programme.
                  </div>
                )
              }

              return filteredEvents.map((event) => {
                const country = getCircuitCountry(event)
                const flag = getCountryFlag(country.code)
                const league = leagueById.get(event.leagueId)
                const eventType = getEventType(event, league)
                const eventDate = new Date(event.startsAt)
                const monthName = eventDate.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' }).toUpperCase()
                const dayNumber = eventDate.getUTCDate()

                return (
                  <div
                    key={event.id}
                    className="border border-white/10 bg-gradient-to-r from-[#121929]/95 via-[#18233a]/90 to-[#121929]/95 p-4 md:p-5 rounded-none hover:border-[#1274de]/60 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg group"
                  >
                    {/* Left: Flag + Country Abbreviation */}
                    <div className="flex items-center gap-3 shrink-0">
                      {flag ? (
                        <span className="text-3xl filter drop-shadow">{flag}</span>
                      ) : null}
                      <span className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-white font-mono">
                        {country.abbr}
                      </span>
                    </div>

                    {/* Middle: Circuit, Event Type Badge, Date */}
                    <div className="flex-1 space-y-1 sm:px-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Event Format Badge: RACE vs TIME ATTACK */}
                        {eventType === 'TIME ATTACK' ? (
                          <span className="border border-amber-500/40 bg-amber-500/15 text-amber-300 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-none flex items-center gap-1 shadow-[0_0_8px_rgba(245,158,11,0.2)]">
                            ⏱️ TIME ATTACK
                          </span>
                        ) : (
                          <span className="border border-red-500/40 bg-red-500/15 text-red-300 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-none flex items-center gap-1 shadow-[0_0_8px_rgba(239,68,68,0.2)]">
                            🏁 RACE
                          </span>
                        )}
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          {event.circuitName} {league ? `· ${league.title}` : ''}
                        </p>
                      </div>

                      <h3 className="text-lg md:text-2xl font-black uppercase italic tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                        {monthName} <span className="text-slate-300 font-bold text-base md:text-xl">{dayNumber}</span>
                      </h3>
                      <p className="text-xxs text-slate-400 font-mono font-semibold flex items-center gap-1">
                        <Clock className="h-3 w-3 text-cyan-400" />
                        {formatTime(event.startsAt)} GMT-4
                      </p>
                    </div>

                    {/* Right: Action Button */}
                    <div className="shrink-0 flex items-center gap-2">
                      {event.serverLink ? (
                        <a
                          href={event.serverLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-[#09152b] border border-[#1274de] hover:bg-[#1274de] px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white transition-all shadow-[0_0_12px_rgba(18,116,222,0.3)] rounded-none inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Play className="h-3 w-3 fill-current" />
                          AVAILABLE
                        </a>
                      ) : (
                        <Link
                          href={league ? `/ligas/${league.slug}` : '/ligas'}
                          className="bg-[#080d16] border border-white/20 hover:border-white/40 hover:bg-white/10 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white transition-colors rounded-none inline-flex items-center gap-1.5"
                        >
                          {league?.registrationOpen ? 'AVAILABLE' : 'NOTIFY ME'}
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </section>
      ) : (
        <section className="shell-panel overflow-hidden rounded-none">
          <div className="overflow-x-auto">
            <div className="min-w-[980px]">
              {/* Month Days Header */}
              <div className="grid grid-cols-7 border-b border-shell-line bg-black/20 text-center text-xs font-semibold uppercase tracking-wide text-slate-300">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div key={day} className="border-r border-shell-line px-2 py-2 last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>

              {/* Month Days Grid Cells */}
              <div className="grid grid-cols-7">
                {monthDays.map((date) => {
                  const key = dateKeyUTC(date)
                  const dayEvents = eventsByDay.get(key) || []
                  const inCurrentMonth = date.getUTCMonth() === anchorDate.getUTCMonth()
                  const primaryEvent = dayEvents[0]
                  const today = new Date()
                  const isToday = key === dateKeyUTC(today)

                  return (
                    <div
                      key={key}
                      onClick={() => handleCellClick(date)}
                      className={`relative h-44 border-r border-b border-shell-line last:border-r-0 select-none group/cell transition-colors ${
                        inCurrentMonth ? 'bg-[#0f1521]' : 'bg-[#0b1019]'
                      } ${isToday ? 'today-breath-active z-20' : ''} ${
                        isAdmin ? 'cursor-pointer hover:bg-cyan-950/20' : ''
                      }`}
                    >
                      {/* Plus icon on hover for admin empty cells */}
                      {isAdmin && (
                        <div className="absolute right-2 top-2 z-30 opacity-0 group-hover/cell:opacity-100 transition-opacity">
                          <Plus className="h-4 w-4 text-cyan-400 bg-black/60 p-0.5 border border-cyan-400/30" />
                        </div>
                      )}

                      {primaryEvent ? (
                        dayEvents.length > 1 ? (
                          <div className={`absolute z-10 pointer-events-auto ${isToday ? 'inset-[2px]' : 'inset-0'}`}>
                            {dayEvents.slice(0, 2).map((event, idx) => {
                              const league = leagueById.get(event.leagueId)
                              const raceTitle = event.title?.trim() || event.circuitName
                              const simLogo = league?.simulator === 'ac'
                                ? '/branding/ACLogo.png'
                                : league?.simulator === 'lmu'
                                  ? '/branding/LMULogo.png'
                                  : null
                              return (
                                <div
                                  key={event.id}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    router.push(league ? `/ligas/${league.slug}` : '/ligas')
                                  }}
                                  className={`absolute inset-x-0 block cursor-pointer ${
                                    idx === 0 ? 'top-0 h-1/2 border-b border-shell-line' : 'bottom-0 h-1/2'
                                  }`}
                                >
                                  <div
                                    className="absolute inset-0 bg-cover bg-center"
                                    style={{
                                      backgroundImage: event.circuitImageUrl
                                        ? `${getLeagueGradient(league?.title, league?.slug)}, url(${event.circuitImageUrl})`
                                        : getLeagueGradient(league?.title, league?.slug),
                                      backgroundBlendMode: 'multiply'
                                    }}
                                  />
                                  {idx === 0 ? (
                                    <p className="absolute left-2 top-2 text-xs font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] flex items-center gap-1.5">
                                      <span>{date.getUTCDate()}</span>
                                      <span className="text-[11px] text-slate-200 font-mono font-bold bg-black/60 px-1.5 py-0.5 border border-white/10 flex items-center gap-1">
                                        <Clock className="h-3 w-3 text-cyan-400" />
                                        {formatTime(event.startsAt)}
                                      </span>
                                    </p>
                                  ) : (
                                    <p className="absolute left-2 top-2 text-[11px] text-slate-200 font-mono font-bold bg-black/60 px-1.5 py-0.5 border border-white/10 flex items-center gap-1">
                                      <Clock className="h-3 w-3 text-cyan-400" />
                                      {formatTime(event.startsAt)}
                                    </p>
                                  )}
                                  {simLogo && (
                                    <div className="absolute right-2 top-2 z-10 pointer-events-none">
                                      <img
                                        src={simLogo}
                                        alt={league?.simulator}
                                        className="h-5 w-auto object-contain"
                                      />
                                    </div>
                                  )}
                                  <div className="absolute inset-x-2 bottom-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {event.serverLink && (
                                        <a
                                          href={event.serverLink}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                          }}
                                          className="inline-flex items-center gap-1 bg-[#e10600] hover:bg-red-700 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-white italic border border-red-500/30 shadow-[0_0_8px_rgba(225,6,0,0.35)] transition-colors rounded-none"
                                        >
                                          <Play className="h-2 w-2 fill-current" />
                                          Join
                                        </a>
                                      )}
                                      <p className="line-clamp-1 text-[15px] font-black uppercase italic leading-tight text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
                                        {raceTitle}
                                      </p>
                                    </div>
                                    {league ? (
                                      <p className="mt-1 text-xs font-semibold text-slate-200 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                                        {league.title}
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                              )
                            })}
                            {dayEvents.length > 2 ? (
                              <div className="absolute right-2 top-2 z-20 border border-white/25 bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white rounded-none">
                                +{dayEvents.length - 2}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <div className={`absolute z-10 pointer-events-auto ${isToday ? 'inset-[2px]' : 'inset-0'}`}>
                            {(() => {
                              const league = leagueById.get(primaryEvent.leagueId)
                              const raceTitle = primaryEvent.title?.trim() || primaryEvent.circuitName
                              const simLogo = league?.simulator === 'ac'
                                ? '/branding/ACLogo.png'
                                : league?.simulator === 'lmu'
                                  ? '/branding/LMULogo.png'
                                  : null
                              return (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    router.push(league ? `/ligas/${league.slug}` : '/ligas')
                                  }}
                                  className="absolute inset-0 block cursor-pointer"
                                >
                                  <div
                                    className="absolute inset-0 bg-cover bg-center"
                                    style={{
                                      backgroundImage: primaryEvent.circuitImageUrl
                                        ? `${getLeagueGradient(league?.title, league?.slug)}, url(${primaryEvent.circuitImageUrl})`
                                        : getLeagueGradient(league?.title, league?.slug),
                                      backgroundBlendMode: 'multiply'
                                    }}
                                  />
                                  <p className="absolute left-2 top-2 text-xs font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] flex items-center gap-1.5">
                                    <span>{date.getUTCDate()}</span>
                                    <span className="text-[12px] text-slate-200 font-mono font-bold bg-black/60 px-1.5 py-0.5 border border-white/10 flex items-center gap-1">
                                      <Clock className="h-3 w-3 text-cyan-400" />
                                      {formatTime(primaryEvent.startsAt)}
                                    </span>
                                  </p>
                                  {simLogo && (
                                    <div className="absolute right-2 top-2 z-10 pointer-events-none">
                                      <img
                                        src={simLogo}
                                        alt={league?.simulator}
                                        className="h-8 w-auto object-contain"
                                      />
                                    </div>
                                  )}
                                  <div className="absolute inset-x-2 bottom-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {primaryEvent.serverLink && (
                                        <a
                                          href={primaryEvent.serverLink}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                          }}
                                          className="inline-flex items-center gap-1.5 bg-[#e10600] hover:bg-red-700 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white italic border border-red-500/30 shadow-[0_0_10px_rgba(225,6,0,0.45)] transition-colors rounded-none"
                                        >
                                          <Play className="h-2.5 w-2.5 fill-current" />
                                          Join Server
                                        </a>
                                      )}
                                      <p className="line-clamp-2 text-[18px] font-black uppercase italic leading-tight text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
                                        {raceTitle}
                                      </p>
                                    </div>
                                    {league ? (
                                      <p className="mt-1 text-xs font-semibold text-slate-200 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                                        {league.title}
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                              )
                            })()}
                          </div>
                        )
                      ) : (
                        <p className={`p-2 text-xs font-semibold ${inCurrentMonth ? 'text-white' : 'text-slate-500'}`}>
                          {date.getUTCDate()}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. "Manage Events" Modal (Only for Admins) */}
      {isAdmin && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fade-in">
          <div className="shell-panel border border-shell-line bg-zinc-950 max-w-4xl w-full p-5 md:p-6 text-white rounded-none shadow-[0_0_50px_rgba(0,0,0,0.8)] relative grid md:grid-cols-[1.1fr_0.9fr] gap-6">
            
            {/* Left side: Form for Add / Edit */}
            <div>
              <h2 className="text-xl font-bold uppercase tracking-tight text-white mb-1">
                {editingEvent ? 'Edit Event' : 'Add Event'}
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMessage && (
                  <div className="border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-300 rounded-none">
                    {errorMessage}
                  </div>
                )}

                {/* League Selection */}
                <div>
                  <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">Select League</label>
                  <select
                    value={formLeagueId}
                    onChange={(e) => setFormLeagueId(e.target.value)}
                    required
                    className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400"
                  >
                    {leagues.map((lg) => (
                      <option key={lg.id} value={lg.id}>
                        {lg.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Event Title */}
                <div>
                  <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">Event Title / Session</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Round 1, Incident Review, Briefing (Optional)"
                    className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400"
                  />
                </div>

                {/* Circuit Name Text Input */}
                <div>
                  <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">Circuit Name (Nombre del Circuito)</label>
                  <input
                    type="text"
                    value={formCircuit}
                    onChange={(e) => setFormCircuit(e.target.value)}
                    placeholder="e.g. Spa-Francorchamps, Monza, Imola, Nürburgring..."
                    required
                    className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400 font-semibold"
                  />
                </div>

                {/* Country Flag Selection */}
                <div>
                  <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">Country Flag (País / Bandera)</label>
                  <select
                    value={formCountryCode}
                    onChange={(e) => setFormCountryCode(e.target.value)}
                    className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400 font-mono"
                  >
                    <option value="ESP">🇪🇸 España (ESP)</option>
                    <option value="ITA">🇮🇹 Italia (ITA)</option>
                    <option value="FRA">🇫🇷 Francia (FRA)</option>
                    <option value="GER">🇩🇪 Alemania (GER)</option>
                    <option value="GBR">🇬🇧 Reino Unido (GBR)</option>
                    <option value="BEL">🇧🇪 Bélgica (BEL)</option>
                    <option value="USA">🇺🇸 Estados Unidos (USA)</option>
                    <option value="JPN">🇯🇵 Japón (JPN)</option>
                    <option value="BRA">🇧🇷 Brasil (BRA)</option>
                    <option value="QAT">🇶🇦 Qatar (QAT)</option>
                    <option value="POR">🇵🇹 Portugal (POR)</option>
                    <option value="ARG">🇦🇷 Argentina (ARG)</option>
                    <option value="MEX">🇲🇽 México (MEX)</option>
                    <option value="CHI">🇨🇱 Chile (CHI)</option>
                    <option value="COL">🇨🇴 Colombia (COL)</option>
                    <option value="AUS">🇦🇺 Australia (AUS)</option>
                    <option value="NED">🇳🇱 Países Bajos (NED)</option>
                    <option value="CAN">🇨🇦 Canadá (CAN)</option>
                    <option value="AUT">🇦🇹 Austria (AUT)</option>
                    <option value="SGP">🇸🇬 Singapur (SGP)</option>
                    <option value="ARE">🇦🇪 Emiratos Árabes (ARE)</option>
                  </select>
                </div>

                {/* Event Format: Race vs Time Attack */}
                <div>
                  <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">Event Format</label>
                  <select
                    value={formEventType}
                    onChange={(e) => setFormEventType(e.target.value as 'race' | 'time_attack')}
                    className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400"
                  >
                    <option value="race">🏁 Race (Carrera)</option>
                    <option value="time_attack">⏱️ Time Attack (Hotlap)</option>
                  </select>
                </div>

                {/* Time range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">Starts At (Local Time)</label>
                    <input
                      type="time"
                      value={formStartsAtTime}
                      onChange={(e) => setFormStartsAtTime(e.target.value)}
                      required
                      className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">Ends At (Local Time)</label>
                    <input
                      type="time"
                      value={formEndsAtTime}
                      onChange={(e) => setFormEndsAtTime(e.target.value)}
                      required
                      className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                {/* Circuit Image Upload */}
                <div>
                  <ImagePicker
                    name="circuitImageUrl"
                    defaultValue={formImageUrl}
                    label="Circuit Banner Image (PNG/JPG/WebP - compressed automatically)"
                  />
                </div>

                {/* Server Entry Link */}
                <div>
                  <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">Server Entry Link (Direct Connection)</label>
                  <input
                    type="text"
                    name="serverLink"
                    value={formServerLink}
                    onChange={(e) => setFormServerLink(e.target.value)}
                    placeholder="e.g. steam://connect/12.34.56.78:27015 or direct web link"
                    className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-white/30"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex gap-2 pt-2">
                  {editingEvent && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="border border-shell-line bg-transparent hover:bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-none"
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-shell-accent hover:bg-red-700 disabled:opacity-50 py-2 text-xs font-bold uppercase tracking-wider rounded-none transition-colors"
                  >
                    {isSubmitting ? 'Saving...' : editingEvent ? 'Update Event' : 'Add Event'}
                  </button>
                </div>
              </form>
            </div>

            {/* Right side: List of Current Events on selected date */}
            <div className="flex flex-col border-l border-shell-line/50 pl-6 h-full justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-300 mb-3 pb-1.5 border-b border-shell-line/40">
                  Scheduled Events ({activeDayEvents.length})
                </h3>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {activeDayEvents.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No events scheduled for this day.</p>
                  ) : (
                    activeDayEvents.map((ev) => {
                      const lg = leagueById.get(ev.leagueId)
                      const startsTime = new Date(ev.startsAt)
                      return (
                        <div key={ev.id} className="border border-shell-line bg-black/30 p-2.5 rounded-none flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-xxs uppercase tracking-wider text-cyan-400 font-extrabold leading-tight">
                              {lg?.title || 'League Event'}
                            </p>
                            <p className="text-xs font-bold text-white truncate mt-0.5">{ev.title || ev.circuitName}</p>
                            <p className="text-[10px] text-slate-400 mt-1 font-mono flex items-center gap-1">
                              <Clock className="h-3 w-3 text-cyan-400" />
                              {formatTime(ev.startsAt)} (Local)
                            </p>
                          </div>

                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleEditClick(ev)}
                              title="Edit Event"
                              className="border border-slate-600 hover:border-cyan-400 p-1 text-slate-400 hover:text-cyan-400 transition-colors rounded-none"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(ev.id)}
                              title="Delete Event"
                              className="border border-slate-600 hover:border-rose-500 p-1 text-slate-400 hover:text-rose-500 transition-colors rounded-none"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Close Modal button */}
              <button
                onClick={() => setSelectedDate(null)}
                className="mt-6 border border-slate-600 hover:bg-white/5 py-2 text-xs font-bold uppercase tracking-wider rounded-none text-center w-full"
              >
                Close Manager
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
