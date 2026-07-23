'use client'

import { useState, useEffect, useMemo } from 'react'
import { Calendar, Clock, Plus, Edit2, Trash2, Users, CheckCircle2, Trophy, Eye, Copy, Check, X } from 'lucide-react'
import { ClassBadge } from '@/components/class-badge'
import { FormattedDate } from '@/components/formatted-date'
import { formatDateTime } from '@/lib/utils'
import { League, LeagueEvent, Registration, ManagedTeam, EventConfirmation, TeamStanding } from '../hooks/use-league-state'
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
  standings?: Record<string, TeamStanding[]>
  onOpenEventModal: (event?: LeagueEvent) => void
  onDeleteEvent: (eventId: string) => void
  onFinishRound?: (event: LeagueEvent) => void
  onViewResults?: (event: LeagueEvent) => void
}

export function LeagueSchedule({
  league,
  events,
  isAdmin,
  classTags,
  confirmations,
  initialRegistrations,
  myManagedTeams,
  standings,
  onOpenEventModal,
  onDeleteEvent,
  onFinishRound,
  onViewResults,
}: LeagueScheduleProps) {
  const router = useRouter()
  const [localConfirmations, setLocalConfirmations] = useState<EventConfirmation[]>(confirmations)
  const [viewingEntryListEvent, setViewingEntryListEvent] = useState<LeagueEvent | null>(null)

  useEffect(() => {
    setLocalConfirmations(confirmations)
  }, [confirmations])

  return (
    <div className="shell-panel p-4 md:p-5 rounded-none space-y-4">
      <div className="flex items-center justify-between border-b border-shell-line pb-3">
        <h2 className="text-xl font-bold uppercase tracking-tight text-white">League Schedule</h2>
        {isAdmin && (
          <button
            type="button"
            onClick={() => onOpenEventModal()}
            className="border border-cyan-500/40 bg-cyan-950/30 hover:bg-cyan-500/20 text-cyan-300 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-none transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Round
          </button>
        )}
      </div>
      <p className="text-xs text-slate-400">Timeline of rounds and race sessions.</p>

      <div className="space-y-4">
        {events.length === 0 ? (
          <p className="text-sm text-slate-300">No scheduled rounds yet.</p>
        ) : (
          events.map((ev, index) => {
            const isCompleted = ev.status === 'completed' || new Date(ev.startsAt) < new Date()

            return (
              <div
                key={ev.id}
                className={`border p-4 transition-colors space-y-3 rounded-none relative ${
                  isCompleted
                    ? 'border-slate-800 bg-slate-900/40 opacity-90'
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
                    {/* READ-ONLY RESULTS BUTTON FOR PILOTS & USERS WHEN ROUND IS COMPLETED */}
                    {isCompleted && onViewResults && (
                      <button
                        type="button"
                        onClick={() => onViewResults(ev)}
                        className="border border-emerald-500/50 bg-emerald-950/60 hover:bg-emerald-500/20 text-emerald-300 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-none transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <Trophy className="h-3.5 w-3.5 text-emerald-400" />
                        Ver Resultados
                      </button>
                    )}

                    {isAdmin && onFinishRound && !isCompleted && (
                      <button
                        type="button"
                        onClick={() => onFinishRound(ev)}
                        className="border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-500/20 text-cyan-300 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-none transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
                        Finalizar Ronda
                      </button>
                    )}

                    <div className="flex items-center gap-1 border-l border-shell-line/40 pl-2">
                      {/* EYE ICON: View Confirmed Teams & Entry List */}
                      <button
                        type="button"
                        onClick={() => setViewingEntryListEvent(ev)}
                        title="Ver Equipos Confirmados"
                        className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-white/5 transition-colors rounded-none cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>

                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => onOpenEventModal(ev)}
                            title="Edit Round"
                            className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-white/5 transition-colors rounded-none cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteEvent(ev.id)}
                            title="Delete Round"
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-white/5 transition-colors rounded-none cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
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
                    const activeCarsWithDrivers = ((team as any).cars || []).filter((carObj: any) => {
                      const drivers = Array.isArray(carObj.driverUserIds)
                        ? carObj.driverUserIds.filter(Boolean)
                        : Array.isArray((carObj as any).driver_user_ids)
                        ? (carObj as any).driver_user_ids.filter(Boolean)
                        : []
                      if (drivers.length === 0) return false

                      return initialRegistrations.some(
                        (r) =>
                          r.teamId === team.id &&
                          String(r.classTag || '').toUpperCase() === String(carObj.category || '').toUpperCase() &&
                          (String(r.assignedNumber || '') === String(carObj.dorsal || '') || Number(r.assignedNumber) === Number(carObj.dorsal))
                      )
                    })

                    if (activeCarsWithDrivers.length === 0) return null

                    return (
                      <div key={team.id} className="bg-slate-900/40 border border-cyan-500/10 p-3 z-10 space-y-2 mt-2">
                        <p className="text-[11px] uppercase tracking-wider font-extrabold text-cyan-400 flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          Confirm Attendance: {team.name}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {activeCarsWithDrivers.map((carObj: any, carIdx: number) => {
                            const tag = String(carObj.category).toUpperCase()
                            const dorsalDisplay = String(carObj.dorsal || '')
                            const num = Number(carObj.dorsal)
                            const limit = (league as any).classLimits?.[tag] ?? 30
                            const isConfirmed = localConfirmations.some(
                              (c) =>
                                c.eventId === ev.id &&
                                c.teamId === team.id &&
                                c.classTag === tag &&
                                (String((c as any).dorsalDisplay || c.carNumber) === dorsalDisplay || Number(c.carNumber) === num) &&
                                c.status === 'confirmed'
                            )
                            const confirmedCount = localConfirmations.filter(
                              (c) => c.eventId === ev.id && c.classTag === tag && c.status === 'confirmed'
                            ).length
                            const isGridFull = !isConfirmed && confirmedCount >= limit

                            return (
                              <div
                                key={`${tag}_${dorsalDisplay}_${carIdx}`}
                                className="flex items-center justify-between gap-2 bg-black/40 border border-shell-line/30 px-3 py-1.5"
                              >
                                <div className="flex items-center gap-2">
                                  <ClassBadge classTag={tag} className="text-[9px]" />
                                  <span className="font-mono text-xs font-bold text-slate-200">#{dorsalDisplay}</span>
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
                                              (String((c as any).dorsalDisplay || c.carNumber) === dorsalDisplay || Number(c.carNumber) === num)
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

      {/* View Entry List / Confirmed Teams Modal */}
      {viewingEntryListEvent && (
        <ViewEntryListModal
          event={viewingEntryListEvent}
          league={league}
          classTags={classTags}
          confirmations={localConfirmations.filter((c) => c.eventId === viewingEntryListEvent.id && c.status === 'confirmed')}
          registrations={initialRegistrations}
          myManagedTeams={myManagedTeams}
          standings={standings}
          isAdmin={isAdmin}
          onClose={() => setViewingEntryListEvent(null)}
        />
      )}
    </div>
  )
}

function ViewEntryListModal({
  event,
  league,
  classTags,
  confirmations,
  registrations,
  myManagedTeams,
  standings,
  isAdmin,
  onClose,
}: {
  event: LeagueEvent
  league: League
  classTags: string[]
  confirmations: EventConfirmation[]
  registrations: Registration[]
  myManagedTeams: ManagedTeam[]
  standings?: Record<string, TeamStanding[]>
  isAdmin: boolean
  onClose: () => void
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Map all confirmed teams
  const allTeamsInStandings = useMemo(() => {
    const list: TeamStanding[] = []
    if (standings) {
      Object.values(standings).forEach((arr) => {
        arr.forEach((t) => {
          if (!list.some((existing) => existing.id === t.id)) {
            list.push(t)
          }
        })
      })
    }
    return list
  }, [standings])

  const resolveTeamName = (teamId: string) => {
    const fromManaged = myManagedTeams.find((t) => t.id === teamId)
    if (fromManaged) return fromManaged.name

    const fromStandings = allTeamsInStandings.find((t) => t.id === teamId)
    if (fromStandings) return fromStandings.name

    const fromReg = registrations.find((r) => r.teamId === teamId)
    if (fromReg) return fromReg.displayName

    return `Team ${teamId.slice(0, 8)}`
  }

  const resolveDrivers = (teamId: string, classTag: string, carNumber: string | number) => {
    const matchedRegs = registrations.filter(
      (r) =>
        r.teamId === teamId &&
        String(r.classTag || '').toUpperCase() === String(classTag || '').toUpperCase() &&
        (String(r.assignedNumber || '') === String(carNumber) || Number(r.assignedNumber) === Number(carNumber))
    )
    if (matchedRegs.length > 0) {
      return matchedRegs.map((r) => ({
        name: r.displayName || 'Driver',
        steamId: (r as any).steamId || r.userId || '',
      }))
    }

    const managed = myManagedTeams.find((t) => t.id === teamId)
    if (managed && managed.members) {
      return managed.members.map((m) => ({
        name: m.displayName || 'Driver',
        steamId: m.userId || '',
      }))
    }

    return []
  }

  // Group confirmations by category
  const groupedConfirmations = useMemo(() => {
    const map: Record<string, Array<{ teamId: string; teamName: string; dorsal: string; drivers: Array<{ name: string; steamId: string }> }>> = {}

    classTags.forEach((tag) => {
      map[tag] = []
    })

    confirmations.forEach((c) => {
      const tag = String(c.classTag || '').toUpperCase()
      const dorsal = String((c as any).dorsalDisplay || c.carNumber || '')
      const teamName = resolveTeamName(c.teamId)
      const drivers = resolveDrivers(c.teamId, tag, c.carNumber)

      if (!map[tag]) map[tag] = []

      if (!map[tag].some((item) => item.teamId === c.teamId && item.dorsal === dorsal)) {
        map[tag].push({
          teamId: c.teamId,
          teamName,
          dorsal,
          drivers,
        })
      }
    })

    return map
  }, [confirmations, classTags, myManagedTeams, registrations, allTeamsInStandings])

  const totalConfirmed = confirmations.length

  return (
    <div className="fixed inset-0 z-[150] overflow-y-auto bg-black/85 backdrop-blur-sm p-4 flex justify-center items-start md:items-center">
      <div className="w-full max-w-2xl bg-[#090d16] border border-shell-line shadow-2xl my-auto relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-shell-line p-4 md:p-5 bg-black/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-cyan-950 text-cyan-400 border border-cyan-800/50 px-2 py-0.5 text-[10px] font-mono font-bold uppercase">
                {event.circuitName}
              </span>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                {totalConfirmed} {totalConfirmed === 1 ? 'equipo confirmado' : 'equipos confirmados'}
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-black uppercase italic tracking-tight text-white mt-1">
              {event.title || `Round: ${event.circuitName}`}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 md:p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {totalConfirmed === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm font-medium">
              No hay equipos confirmados para esta ronda aún.
            </div>
          ) : (
            Object.entries(groupedConfirmations).map(([tag, teamList]) => {
              if (teamList.length === 0) return null

              return (
                <div key={tag} className="space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                    <div className="flex items-center gap-2">
                      <ClassBadge classTag={tag} className="text-xs font-black" />
                      <span className="text-xs text-slate-400 font-bold uppercase">
                        ({teamList.length} {teamList.length === 1 ? 'equipo' : 'equipos'})
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    {teamList.map((t, idx) => {
                      const rowKey = `${tag}_${t.teamId}_${t.dorsal}_${idx}`
                      return (
                        <div
                          key={rowKey}
                          className="flex flex-wrap items-center justify-between gap-3 bg-black/40 border border-slate-800 p-3 hover:border-cyan-500/30 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono text-sm font-black text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-1 shrink-0">
                              #{t.dorsal}
                            </span>
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-white uppercase tracking-wide truncate">
                                {t.teamName}
                              </h4>
                              {t.drivers.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                  {t.drivers.map((d, dIdx) => (
                                    <span key={dIdx} className="inline-flex items-center gap-1">
                                      <span className="text-slate-300 font-medium">{d.name}</span>
                                      {isAdmin && d.steamId && (
                                        <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-1 border border-slate-800">
                                          {d.steamId}
                                        </span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  const ids = t.drivers.map((d) => d.steamId).filter(Boolean)
                                  const copyText = ids.length > 0 ? ids.join(', ') : t.teamId
                                  navigator.clipboard.writeText(copyText)
                                  setCopiedKey(rowKey)
                                  setTimeout(() => setCopiedKey(null), 2200)
                                }}
                                className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                                title={`Copiar IDs para el dorsal #${t.dorsal}`}
                              >
                                {copiedKey === rowKey ? (
                                  <>
                                    <Check className="h-3 w-3 text-emerald-400" />
                                    <span className="text-emerald-400">¡Copiado!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3 text-cyan-400" />
                                    <span>Copiar IDs</span>
                                  </>
                                )}
                              </button>
                            )}

                            <span className="bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase px-2 py-0.5">
                              CONFIRMED
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
