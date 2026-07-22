'use client'

import Link from 'next/link'
import { Plus, Trash2, Edit2, Play } from 'lucide-react'
import { LeagueEvent, League } from '../hooks/use-calendar-state'

interface CalendarMonthGridProps {
  monthDays: Date[]
  anchorDate: Date
  eventsByDay: Map<string, LeagueEvent[]>
  leagueById: Map<string, League>
  isAdmin: boolean
  getLeagueGradient: (title?: string, slug?: string) => string
  onOpenAddModal: (day: Date) => void
  onOpenEditModal: (event: LeagueEvent) => void
  onDeleteEvent: (eventId: string) => void
}

export function CalendarMonthGrid({
  monthDays,
  anchorDate,
  eventsByDay,
  leagueById,
  isAdmin,
  getLeagueGradient,
  onOpenAddModal,
  onOpenEditModal,
  onDeleteEvent,
}: CalendarMonthGridProps) {
  function pad(val: number) {
    return String(val).padStart(2, '0')
  }

  function dateKeyUTC(d: Date) {
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
  }

  function isSameMonth(d1: Date, d2: Date) {
    return d1.getUTCFullYear() === d2.getUTCFullYear() && d1.getUTCMonth() === d2.getUTCMonth()
  }

  function isToday(d: Date) {
    const now = new Date()
    return d.getUTCFullYear() === now.getFullYear() && d.getUTCMonth() === now.getMonth() && d.getUTCDate() === now.getDate()
  }

  return (
    <div className="shell-panel p-4 rounded-none space-y-3">
      {/* Header days */}
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-shell-line pb-2">
        <div>MON</div>
        <div>TUE</div>
        <div>WED</div>
        <div>THU</div>
        <div>FRI</div>
        <div>SAT</div>
        <div>SUN</div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-2">
        {monthDays.map((day) => {
          const key = dateKeyUTC(day)
          const dayEvents = eventsByDay.get(key) || []
          const isCurrentMonth = isSameMonth(day, anchorDate)
          const isTodayDay = isToday(day)

          return (
            <div
              key={key}
              className={`min-h-[120px] p-2 border transition-all flex flex-col justify-between ${
                isCurrentMonth ? 'bg-black/30 border-shell-line' : 'bg-black/10 border-shell-line/30 opacity-40'
              } ${isTodayDay ? 'border-cyan-500/80 bg-cyan-950/10' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-mono font-bold ${
                    isTodayDay
                      ? 'bg-cyan-500 text-black px-1.5 py-0.5 font-extrabold'
                      : isCurrentMonth
                      ? 'text-slate-200'
                      : 'text-slate-600'
                  }`}
                >
                  {day.getUTCDate()}
                </span>
                {isAdmin && isCurrentMonth && (
                  <button
                    onClick={() => onOpenAddModal(day)}
                    title="Add Event on this day"
                    className="text-slate-500 hover:text-cyan-400 transition-colors p-0.5"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Day Event List */}
              <div className="space-y-1.5 mt-2 flex-1">
                {dayEvents.map((ev) => {
                  const league = leagueById.get(ev.leagueId)
                  const gradient = getLeagueGradient(league?.title, league?.slug)

                  return (
                    <div
                      key={ev.id}
                      className="p-2 text-white shadow-md relative group rounded-none border border-white/10 transition-all hover:scale-[1.02]"
                      style={{ background: gradient }}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="space-y-0.5 min-w-0">
                          {league && (
                            <Link
                              href={`/ligas/${league.slug}`}
                              className="text-[10px] font-black uppercase tracking-wider text-white hover:underline truncate block"
                            >
                              {league.title}
                            </Link>
                          )}
                          <p className="text-[11px] font-extrabold uppercase italic leading-tight truncate">
                            {ev.title || ev.circuitName}
                          </p>
                        </div>

                        {/* White Box Simulator Logo */}
                        <div className="w-5 h-5 bg-white p-0.5 shrink-0 flex items-center justify-center border border-black/20">
                          <img
                            src={league?.simulator === 'ac' ? '/branding/ACLogo.png' : '/branding/LMULogo.png'}
                            alt={league?.simulator || 'sim'}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      </div>

                      {/* Controls & Direct Join */}
                      <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-white/20">
                        {ev.serverLink ? (
                          <a
                            href={ev.serverLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-500 hover:bg-emerald-400 text-black px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                          >
                            <Play className="h-2.5 w-2.5 fill-black" />
                            JOIN SERVER
                          </a>
                        ) : (
                          <span className="text-[9px] font-mono font-bold text-white/80 uppercase">Scheduled</span>
                        )}

                        {isAdmin && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => onOpenEditModal(ev)}
                              title="Edit Event"
                              className="p-0.5 text-white/80 hover:text-white"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => onDeleteEvent(ev.id)}
                              title="Delete Event"
                              className="p-0.5 text-white/80 hover:text-rose-300"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
