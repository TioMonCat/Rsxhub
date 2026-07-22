'use client'

import Link from 'next/link'
import { Calendar, Clock, MapPin, Play, Edit2, Trash2 } from 'lucide-react'
import { getCountryFlag } from '@/lib/countries'
import { LeagueEvent, League } from '../hooks/use-calendar-state'

interface CalendarProgrammeProps {
  events: LeagueEvent[]
  programmeFilter: 'all' | 'race' | 'qualifying' | 'time_attack'
  leagueById: Map<string, League>
  isAdmin: boolean
  getLeagueGradient: (title?: string, slug?: string) => string
  onFilterChange: (filter: 'all' | 'race' | 'qualifying' | 'time_attack') => void
  onOpenEditModal: (event: LeagueEvent) => void
  onDeleteEvent: (eventId: string) => void
}

export function CalendarProgramme({
  events,
  programmeFilter,
  leagueById,
  isAdmin,
  getLeagueGradient,
  onFilterChange,
  onOpenEditModal,
  onDeleteEvent,
}: CalendarProgrammeProps) {
  const filteredEvents = events.filter((ev) => {
    if (programmeFilter === 'all') return true
    return (ev.eventType || 'race') === programmeFilter
  })

  return (
    <div className="shell-panel p-4 md:p-5 rounded-none space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-shell-line pb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold uppercase tracking-tight text-white">Programme View</h2>
          <span className="text-xs font-mono text-cyan-400">({filteredEvents.length} events)</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-black/40 p-1 border border-shell-line">
          {(['all', 'race', 'qualifying', 'time_attack'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => onFilterChange(filter)}
              className={`px-3 py-1 text-xs font-bold uppercase tracking-wider transition-all rounded-none ${
                programmeFilter === filter
                  ? 'bg-cyan-500 text-black font-extrabold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {filter === 'time_attack' ? 'TIME ATTACK' : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="border border-dashed border-shell-line p-8 text-center">
            <p className="text-sm text-slate-400">No events found matching this filter.</p>
          </div>
        ) : (
          filteredEvents.map((ev) => {
            const league = leagueById.get(ev.leagueId)
            const gradient = getLeagueGradient(league?.title, league?.slug)
            const flag = getCountryFlag(ev.countryCode || 'ESP')

            return (
              <div
                key={ev.id}
                className="border border-shell-line bg-black/40 p-4 rounded-none space-y-3 relative overflow-hidden transition-all hover:border-cyan-500/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Country flag icon */}
                    <span className="text-2xl shrink-0">{flag}</span>

                    <div>
                      {league && (
                        <Link
                          href={`/ligas/${league.slug}`}
                          className="text-xs font-extrabold uppercase tracking-wider text-cyan-400 hover:underline block"
                        >
                          {league.title}
                        </Link>
                      )}
                      <h3 className="text-lg font-black uppercase italic tracking-tight text-white">
                        {ev.title || ev.circuitName}
                      </h3>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <MapPin className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                        {ev.circuitName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Format Badge */}
                    <span
                      className="px-3 py-1 text-xs font-black uppercase tracking-wider text-white shadow-sm"
                      style={{ background: gradient }}
                    >
                      {(ev.eventType || 'RACE').replace('_', ' ')}
                    </span>

                    {/* Simulator Badge */}
                    <div className="w-8 h-8 bg-white p-1 flex items-center justify-center border border-black/20 shrink-0">
                      <img
                        src={league?.simulator === 'ac' ? '/branding/ACLogo.png' : '/branding/LMULogo.png'}
                        alt="Simulator"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-shell-line/30 pt-3">
                  <div className="flex items-center gap-4 text-xs text-slate-300 font-semibold">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                      {new Date(ev.startsAt).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="h-3.5 w-3.5 text-cyan-400" />
                      {new Date(ev.startsAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {ev.serverLink && (
                      <a
                        href={ev.serverLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-emerald-500 hover:bg-emerald-400 text-black px-3 py-1.5 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                      >
                        <Play className="h-3.5 w-3.5 fill-black" />
                        JOIN SERVER
                      </a>
                    )}

                    {isAdmin && (
                      <div className="flex items-center gap-1 border-l border-shell-line/40 pl-2">
                        <button
                          onClick={() => onOpenEditModal(ev)}
                          title="Edit Event"
                          className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteEvent(ev.id)}
                          title="Delete Event"
                          className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
