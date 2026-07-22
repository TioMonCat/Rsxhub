'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, Plus, Edit2, Trash2, Users, CheckCircle2 } from 'lucide-react'
import { ClassBadge } from '@/components/class-badge'
import { FormattedDate } from '@/components/formatted-date'
import { formatDateTime } from '@/lib/utils'
import { League, LeagueEvent, Registration, ManagedTeam, EventConfirmation } from '../hooks/use-league-state'
import { confirmAttendanceAction, cancelAttendanceAction } from '@/app/ligas/actions'
import { useRouter } from 'next/navigation'

interface LeagueScheduleProps {
  league: League
  events: LeagueEvent[]
  isAdmin: boolean
  classTags: string[]
  confirmations: EventConfirmation[]
  initialRegistrations: Registration[]
  myManagedTeams: ManagedTeam[]
  onOpenEventModal: (event?: LeagueEvent) => void
  onDeleteEvent: (eventId: string) => void
  onFinishRound?: (event: LeagueEvent) => void
}

export function LeagueSchedule({
  league,
  events,
  isAdmin,
  classTags,
  confirmations,
  initialRegistrations,
  myManagedTeams,
  onOpenEventModal,
  onDeleteEvent,
  onFinishRound,
}: LeagueScheduleProps) {
  const router = useRouter()
  const [localConfirmations, setLocalConfirmations] = useState<EventConfirmation[]>(confirmations)

  useEffect(() => {
    setLocalConfirmations(confirmations)
  }, [confirmations])

  return (
    <div className="shell-panel p-4 md:p-5 rounded-none space-y-4">
      <div className="flex items-center justify-between border-b border-shell-line pb-3">
        <div>
          <h2 className="text-xl font-bold uppercase tracking-tight text-white">League Schedule</h2>
          <p className="text-xs text-slate-400 mt-0.5">Timeline of rounds and race sessions.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => onOpenEventModal()}
            className="border border-cyan-500/40 hover:bg-cyan-500/10 px-3 py-1.5 text-xs font-bold uppercase text-cyan-400 rounded-none transition-colors flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Add Round
          </button>
        )}
      </div>

      <div className="space-y-4">
        {events.length === 0 ? (
          <div className="border border-dashed border-shell-line p-8 text-center">
            <p className="text-sm text-slate-400">No rounds scheduled for this league yet.</p>
          </div>
        ) : (
          events.map((ev, index) => {
            const isCompleted = ev.status === 'completed'

            return (
              <div
                key={ev.id}
                className={`border p-4 rounded-none space-y-3 relative overflow-hidden transition-colors ${
                  isCompleted
                    ? 'border-slate-800 bg-slate-900/40 opacity-75'
                    : 'border-shell-line bg-black/40 hover:border-cyan-500/30'
                }`}
              >
                {/* Round Header */}
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-shell-line/40 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-cyan-950 text-cyan-400 border border-cyan-800/50 px-2 py-0.5 text-[10px] font-mono font-bold uppercase">
                        R{index + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {ev.circuitName}
                      </span>
                      {isCompleted && (
                        <span className="bg-emerald-950 text-emerald-400 border border-emerald-800/50 px-2 py-0.5 text-[10px] font-mono font-bold uppercase">
                          COMPLETED
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-white uppercase italic tracking-tight">
                      {ev.title || `Round ${index + 1}: ${ev.circuitName}`}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                        <span>{formatDateTime(ev.startsAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        {onFinishRound && !isCompleted && (
                          <button
                            type="button"
                            onClick={() => onFinishRound(ev)}
                            className="border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-500/20 text-cyan-300 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-none transition-colors flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
                            Finalizar Ronda
                          </button>
                        )}
                        <div className="flex items-center gap-1 border-l border-shell-line/40 pl-2">
                          <button
                            type="button"
                            onClick={() => onOpenEventModal(ev)}
                            title="Edit Round"
                            className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-white/5 transition-colors rounded-none"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteEvent(ev.id)}
                            title="Delete Round"
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-white/5 transition-colors rounded-none"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Grid Occupancy Meter */}
                <div className="flex flex-wrap gap-4 pt-2 z-10 w-full">
                  {classTags.map((tag) => {
                    const limit = (league as any).classLimits?.[tag] ?? 30
                    const confirmedCount = localConfirmations.filter(
                      (c) => c.eventId === ev.id && c.classTag === tag && c.status === 'confirmed'
                    ).length
                    const pct = Math.min(100, (confirmedCount / limit) * 100)

                    return (
                      <div key={tag} className="flex-1 min-w-[140px] space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <ClassBadge classTag={tag} className="text-[10px] font-extrabold" />
                          <span className="font-mono text-xs font-bold text-slate-300">
                            {confirmedCount} / {limit} cars
                          </span>
                        </div>
                        <div className="w-full bg-slate-900/80 border border-white/5 h-2 overflow-hidden rounded-none">
                          <div
                            className="h-full transition-all duration-300"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: pct >= 100 ? '#f43f5e' : (league.accentColor || '#1274de'),
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Team Confirmations */}
                {(() => {
                  const myRegisteredTeams = myManagedTeams.filter((t) =>
                    initialRegistrations.some((r) => r.teamId === t.id)
                  )
                  if (myRegisteredTeams.length === 0) return null

                  return myRegisteredTeams.map((team) => {
                    const teamCars = initialRegistrations.filter(
                      (r) => r.teamId === team.id && r.classTag && r.assignedNumber
                    )
                    if (teamCars.length === 0) return null

                    return (
                      <div key={team.id} className="bg-slate-900/40 border border-cyan-500/10 p-3 z-10 space-y-2 mt-2">
                        <p className="text-[11px] uppercase tracking-wider font-extrabold text-cyan-400 flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          Confirm Attendance: {team.name}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {teamCars.map((car) => {
                            const tag = car.classTag!
                            const num = car.assignedNumber!
                            const limit = (league as any).classLimits?.[tag] ?? 30
                            const isConfirmed = localConfirmations.some(
                              (c) =>
                                c.eventId === ev.id &&
                                c.teamId === team.id &&
                                c.classTag === tag &&
                                c.carNumber === num &&
                                c.status === 'confirmed'
                            )
                            const confirmedCount = localConfirmations.filter(
                              (c) => c.eventId === ev.id && c.classTag === tag && c.status === 'confirmed'
                            ).length
                            const isGridFull = !isConfirmed && confirmedCount >= limit

                            return (
                              <div
                                key={`${tag}_${num}`}
                                className="flex items-center justify-between gap-2 bg-black/40 border border-shell-line/30 px-3 py-1.5"
                              >
                                <div className="flex items-center gap-2">
                                  <ClassBadge classTag={tag} className="text-[9px]" />
                                  <span className="font-mono text-xs font-bold text-slate-200">#{num}</span>
                                </div>

                                <button
                                  type="button"
                                  onClick={async () => {
                                    const wasConfirmed = isConfirmed
                                    if (wasConfirmed) {
                                      setLocalConfirmations((prev) =>
                                        prev.filter(
                                          (c) =>
                                            !(
                                              c.eventId === ev.id &&
                                              c.teamId === team.id &&
                                              c.classTag === tag &&
                                              c.carNumber === num
                                            )
                                        )
                                      )
                                    } else {
                                      setLocalConfirmations((prev) => [
                                        ...prev,
                                        {
                                          id: `${ev.id}_${team.id}_${tag}_${num}`,
                                          eventId: ev.id,
                                          leagueId: league.id,
                                          teamId: team.id,
                                          classTag: tag,
                                          carNumber: num,
                                          carModel: '',
                                          status: 'confirmed',
                                        },
                                      ])
                                    }

                                    try {
                                      const fd = new FormData()
                                      fd.set('eventId', ev.id)
                                      fd.set('leagueId', league.id)
                                      fd.set('teamId', team.id)
                                      fd.set('classTag', tag)
                                      fd.set('carNumber', String(num))
                                      fd.set('carModel', '')
                                      fd.set('slug', league.slug)

                                      if (wasConfirmed) {
                                        await cancelAttendanceAction(fd)
                                      } else {
                                        await confirmAttendanceAction(fd)
                                      }
                                      router.refresh()
                                    } catch (err: any) {
                                      setLocalConfirmations(confirmations)
                                      alert(err.message || 'Error updating attendance.')
                                    }
                                  }}
                                  disabled={isGridFull}
                                  className={`px-2 py-1 text-[10px] font-bold uppercase transition-colors rounded-none border ${
                                    isConfirmed
                                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25'
                                      : isGridFull
                                      ? 'bg-rose-500/5 border-rose-500/20 text-rose-400/50 cursor-not-allowed'
                                      : 'bg-cyan-500/5 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/15'
                                  }`}
                                >
                                  {isConfirmed ? 'Confirmed' : isGridFull ? 'Grid Full' : 'Confirm'}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
