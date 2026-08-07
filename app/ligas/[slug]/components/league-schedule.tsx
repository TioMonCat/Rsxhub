'use client'

import { useState, useEffect, useMemo } from 'react'
import JSZip from 'jszip'
import { Calendar, Clock, Plus, Edit2, Trash2, Users, CheckCircle2, Trophy, Eye, Copy, Check, X, FolderDown } from 'lucide-react'
import { ClassBadge } from '@/components/class-badge'
import { FormattedDate } from '@/components/formatted-date'
import { formatDateTime } from '@/lib/utils'
import { League, LeagueEvent, Registration, ManagedTeam, EventConfirmation, TeamStanding } from '../hooks/use-league-state'
import { confirmAttendanceAction, cancelAttendanceAction } from '@/app/ligas/actions'
import { useRouter } from 'next/navigation'
import { EventEntryListModal } from './event-entry-list-modal'

interface LeagueScheduleProps {
  league: League
  events: LeagueEvent[]
  isAdmin: boolean
  isSteward?: boolean
  classTags: string[]
  confirmations: EventConfirmation[]
  initialRegistrations: Registration[]
  myManagedTeams: ManagedTeam[]
  teamInfo?: Record<string, { name: string; primaryColor: string | null; logoUrl: string | null; cars?: any[]; skinAssignments?: any[] }>
  standings?: Record<string, TeamStanding[]>
  onOpenEventModal: (event?: LeagueEvent) => void
  onDeleteEvent: (eventId: string) => void
  onFinishRound?: (event: LeagueEvent, initialSessionType?: 'qualifying' | 'race') => void
  onViewResults?: (event: LeagueEvent) => void
}

export function LeagueSchedule({
  league,
  events,
  isAdmin,
  isSteward = false,
  classTags,
  confirmations,
  initialRegistrations,
  myManagedTeams,
  teamInfo,
  standings,
  onOpenEventModal,
  onDeleteEvent,
  onFinishRound,
  onViewResults,
}: LeagueScheduleProps) {
  const router = useRouter()
  const [localConfirmations, setLocalConfirmations] = useState<EventConfirmation[]>(confirmations)
  const [viewingEntryListEvent, setViewingEntryListEvent] = useState<LeagueEvent | null>(null)

  const [showExpiredRounds, setShowExpiredRounds] = useState(false)

  useEffect(() => {
    setLocalConfirmations(confirmations)
  }, [confirmations])

  const { activeEvents, expiredCount } = useMemo(() => {
    const now = Date.now()
    const fortyEightHoursMs = 48 * 60 * 60 * 1000

    let expired = 0
    const active = events.filter((ev) => {
      const isCompleted = (ev as any).status === 'completed'
      if (!isCompleted) return true

      const finishTime = (ev as any).completedAt
        ? new Date((ev as any).completedAt).getTime()
        : new Date(ev.endsAt || ev.startsAt).getTime()

      const isExpired = (now - finishTime) > fortyEightHoursMs
      if (isExpired) {
        expired++
        return showExpiredRounds
      }
      return true
    })

    return { activeEvents: active, expiredCount: expired }
  }, [events, showExpiredRounds])

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
        {activeEvents.length === 0 ? (
          <p className="text-sm text-slate-300">No scheduled rounds in timeline.</p>
        ) : (
          activeEvents.map((ev, index) => {
            const isCompleted = (ev as any).status === 'completed' || new Date(ev.startsAt) < new Date()

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

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 pt-1 font-mono">
                      {(ev.hasQualy === true || String(ev.hasQualy) === 'true' || Boolean(ev.qualyStartsAt)) && (
                        <div className="flex items-center gap-1.5 bg-black/60 border border-cyan-500/30 px-2 py-0.5">
                          <Clock className="h-3 w-3 text-cyan-400" />
                          <span className="text-[10px] text-cyan-300 font-bold uppercase">QUALY:</span>
                          <span className="text-xs text-slate-200">
                            {ev.qualyStartsAt ? formatDateTime(ev.qualyStartsAt) : formatDateTime(ev.startsAt)}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 bg-black/60 border border-amber-500/30 px-2 py-0.5">
                        <Calendar className="h-3 w-3 text-amber-400" />
                        <span className="text-[10px] text-amber-300 font-bold uppercase">RACE:</span>
                        <span className="text-xs text-slate-200">{formatDateTime(ev.startsAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* ADMIN & STEWARD: MANAGE ROUND BUTTON */}
                    {(isAdmin || isSteward) && onFinishRound && (
                      <button
                        type="button"
                        onClick={() => onFinishRound(ev)}
                        className="border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-500/20 text-cyan-300 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-none transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
                        Manage Round
                      </button>
                    )}

                    {/* DRIVERS & NON-ADMINS/NON-STEWARDS: VIEW ROUND BUTTON */}
                    {(!isAdmin && !isSteward) && onViewResults && (
                      <button
                        type="button"
                        onClick={() => onViewResults(ev)}
                        className="border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-500/20 text-cyan-300 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-none transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <Trophy className="h-3.5 w-3.5 text-cyan-400" />
                        View Round
                      </button>
                    )}

                    {/* ADMIN ACTIONS ONLY */}
                    {isAdmin && (
                      <div className="flex items-center gap-1 border-l border-shell-line/40 pl-2">
                        <button
                          type="button"
                          onClick={() => setViewingEntryListEvent(ev)}
                          title="View Confirmed Entry List"
                          className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-white/5 transition-colors rounded-none cursor-pointer"
                        >
                          <Users className="h-3.5 w-3.5" />
                        </button>
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
                      </div>
                    )}
                  </div>
                </div>

                {/* Grid Occupancy Meter */}
                <div className="flex flex-wrap gap-4 pt-2 z-10 w-full">
                  {classTags.map((tag) => {
                    const limit = (league as any).classLimits?.[tag] ?? 30
                    const confirmedCount = localConfirmations.filter((c) => {
                      if (c.eventId !== ev.id || String(c.classTag || '').toUpperCase() !== tag.toUpperCase() || c.status !== 'confirmed') {
                        return false
                      }
                      if (initialRegistrations && initialRegistrations.length > 0) {
                        const isRegistered = initialRegistrations.some(
                          (r) =>
                            (r.teamId ? r.teamId === c.teamId : r.userId === (c as any).userId) &&
                            String(r.classTag || '').toUpperCase() === tag.toUpperCase()
                        )
                        if (!isRegistered) return false
                      }
                      return true
                    }).length
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
                    initialRegistrations.some((r) => r.teamId === t.id) ||
                    ((t as any).cars || []).some((c: any) => {
                      const cLeagueId = c.leagueId || c.league_id
                      return cLeagueId === league.id || cLeagueId === league.slug
                    })
                  )
                  if (myRegisteredTeams.length === 0) return null

                  return myRegisteredTeams.map((team) => {
                    const activeCars = ((team as any).cars || []).filter((carObj: any) => {
                      const carLeagueId = carObj.leagueId || carObj.league_id
                      if (carLeagueId && carLeagueId !== league.id && carLeagueId !== league.slug) return false

                      const isReg = initialRegistrations.some(
                        (r) =>
                          r.teamId === team.id &&
                          String(r.classTag || '').toUpperCase() === String(carObj.category || '').toUpperCase() &&
                          (String(r.assignedNumber ?? '').trim() === String(carObj.dorsal ?? '').trim() || !r.assignedNumber || !carObj.dorsal)
                      )

                      return isReg || Boolean(carLeagueId)
                    })

                    if (activeCars.length === 0) return null

                    return (
                      <div key={team.id} className="bg-slate-900/40 border border-cyan-500/10 p-3 z-10 space-y-2 mt-2">
                        <p className="text-[11px] uppercase tracking-wider font-extrabold text-cyan-400 flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          Confirm Attendance: {team.name}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {activeCars.map((carObj: any, carIdx: number) => {
                            const tag = String(carObj.category).toUpperCase()
                            const dorsalDisplay = String(carObj.dorsal || '').trim()
                            const limit = (league as any).classLimits?.[tag] ?? 30

                            const carDriversList = (() => {
                              const byLeague = carObj.driverUserIdsByLeague || carObj.driver_user_ids_by_league || {}
                              let list: string[] = []
                              if (byLeague[league.id] && Array.isArray(byLeague[league.id])) {
                                list = byLeague[league.id].filter(Boolean)
                              } else if (league.slug && byLeague[league.slug] && Array.isArray(byLeague[league.slug])) {
                                list = byLeague[league.slug].filter(Boolean)
                              } else if (Array.isArray(carObj.driverUserIds)) {
                                list = carObj.driverUserIds.filter(Boolean)
                              } else if (Array.isArray(carObj.driver_user_ids)) {
                                list = carObj.driver_user_ids.filter(Boolean)
                              }
                              if (list.length > 0) return list

                              const regDrivers = initialRegistrations.filter(
                                (r) =>
                                  r.teamId === team.id &&
                                  String(r.classTag || '').toUpperCase() === tag &&
                                  (String(r.assignedNumber ?? '').trim() === dorsalDisplay || !r.assignedNumber || !dorsalDisplay)
                              )
                              return regDrivers.map((r) => r.userId).filter(Boolean)
                            })()

                            const hasDrivers = carDriversList.length > 0

                            const isConfirmed = hasDrivers && localConfirmations.some(
                              (c) =>
                                c.eventId === ev.id &&
                                c.teamId === team.id &&
                                c.classTag === tag &&
                                String((c as any).dorsalDisplay || c.carNumber || '').trim() === dorsalDisplay &&
                                c.status === 'confirmed'
                            )
                            const confirmedCount = localConfirmations.filter(
                              (c) => c.eventId === ev.id && c.classTag === tag && c.status === 'confirmed'
                            ).length
                            const isGridFull = !isConfirmed && confirmedCount >= limit

                            return (
                              <div
                                key={`${tag}_${dorsalDisplay}_${carIdx}`}
                                className={`flex items-center justify-between gap-2 border px-3 py-1.5 transition-colors ${
                                  !hasDrivers
                                    ? 'bg-black/20 border-slate-800/40 opacity-75'
                                    : 'bg-black/40 border-shell-line/30'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <ClassBadge classTag={tag} className="text-[9px]" />
                                  <span className="font-mono text-xs font-bold text-slate-200">#{dorsalDisplay}</span>
                                  {!hasDrivers && (
                                    <span className="text-[10px] text-slate-400 font-mono italic font-medium">
                                      (Sin pilotos)
                                    </span>
                                  )}
                                </div>

                                {!hasDrivers ? (
                                  <button
                                    type="button"
                                    disabled
                                    title="No se puede confirmar: El vehículo no tiene pilotos asignados."
                                    className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-none border bg-slate-800/80 border-slate-700/60 text-slate-400/70 cursor-not-allowed flex items-center gap-1"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                                    Sin pilotos
                                  </button>
                                ) : (
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
                                                String((c as any).dorsalDisplay || c.carNumber || '').trim() === dorsalDisplay
                                              )
                                          )
                                        )
                                      } else {
                                        setLocalConfirmations((prev) => [
                                          ...prev,
                                          {
                                            id: `${ev.id}_${team.id}_${tag}_${dorsalDisplay}`,
                                            eventId: ev.id,
                                            leagueId: league.id,
                                            teamId: team.id,
                                            classTag: tag,
                                            carNumber: dorsalDisplay,
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
                                        fd.set('carNumber', dorsalDisplay)
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
                                )}
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

        {expiredCount > 0 && (
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setShowExpiredRounds((prev) => !prev)}
              className="text-xs font-semibold text-slate-400 hover:text-cyan-400 underline underline-offset-4 cursor-pointer transition-colors"
            >
              {showExpiredRounds
                ? `Hide ${expiredCount} completed round(s) (>48h ago)`
                : `Show ${expiredCount} completed round(s) (>48h ago)`}
            </button>
          </div>
        )}
      </div>

      {/* Entry List Modal (Confirmed teams & driver IDs & skin download) */}
      {viewingEntryListEvent && (
        <EventEntryListModal
          event={viewingEntryListEvent}
          confirmations={localConfirmations.filter((c) => c.eventId === viewingEntryListEvent.id)}
          registrations={initialRegistrations}
          classTags={classTags}
          myManagedTeams={myManagedTeams}
          teamInfo={teamInfo}
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
  const [downloadingCategory, setDownloadingCategory] = useState<string | null>(null)

  const resolveSkinUrl = (teamId: string, classTag: string, carNumber: string | number) => {
    const team: any = myManagedTeams.find((t) => t.id === teamId) || (allTeamsInStandings as any[]).find((t) => t.id === teamId)
    if (!team) return null

    const targetDorsal = String(carNumber ?? '').trim()

    if (Array.isArray(team.skinAssignments) && team.skinAssignments.length > 0) {
      const matched = team.skinAssignments.find(
        (s: any) =>
          String(s.carNumber ?? '').trim() === targetDorsal &&
          s.skinUrl
      )
      if (matched?.skinUrl) return matched.skinUrl
      if (team.skinAssignments[0]?.skinUrl) return team.skinAssignments[0].skinUrl
    }

    if (Array.isArray(team.cars) && team.cars.length > 0) {
      const matchedCar = team.cars.find(
        (car: any) =>
          String(car.category || '').toUpperCase() === String(classTag).toUpperCase() &&
          String(car.dorsal ?? '').trim() === targetDorsal
      )
      if (matchedCar?.skinUrl) return matchedCar.skinUrl
      if (team.cars[0]?.skinUrl) return team.cars[0].skinUrl
    }

    if (Array.isArray(team.carSkinUrls) && team.carSkinUrls.length > 0) {
      return team.carSkinUrls[0]
    }

    return null
  }

  const handleDownloadCategorySkins = async (tag: string, teamList: Array<{ teamId: string; teamName: string; dorsal: string }>) => {
    setDownloadingCategory(tag)
    try {
      const masterZip = new JSZip()
      let addedCount = 0

      for (const item of teamList) {
        const skinUrl = resolveSkinUrl(item.teamId, tag, item.dorsal)
        if (skinUrl) {
          const sanitize = (str: string) => str.replace(/[^a-z0-9_-]/gi, '_')
          const skinFolderName = `#${item.dorsal}_${sanitize(item.teamName)}`

          try {
            let buffer: ArrayBuffer | null = null

            if (skinUrl.startsWith('data:')) {
              const base64Parts = skinUrl.split(',')
              if (base64Parts[1]) {
                const binaryStr = atob(base64Parts[1])
                const len = binaryStr.length
                const bytes = new Uint8Array(len)
                for (let i = 0; i < len; i++) {
                  bytes[i] = binaryStr.charCodeAt(i)
                }
                buffer = bytes.buffer
              }
            } else if (skinUrl.startsWith('http') || skinUrl.startsWith('/')) {
              const res = await fetch(skinUrl)
              if (res.ok) {
                buffer = await res.arrayBuffer()
              }
            }

            if (buffer) {
              try {
                // Unpack team zip in memory into AC Content Manager format
                const teamZip = await JSZip.loadAsync(buffer)
                let hasContentCars = false
                let hasSkinsFolder = false

                teamZip.forEach((relativePath) => {
                  if (relativePath.startsWith('content/cars/')) hasContentCars = true
                  if (relativePath.startsWith('skins/')) hasSkinsFolder = true
                })

                for (const [relativePath, zipObj] of Object.entries(teamZip.files)) {
                  if (zipObj.dir) continue
                  const fileData = await zipObj.async('uint8array')

                  if (hasContentCars || hasSkinsFolder) {
                    masterZip.file(relativePath, fileData)
                  } else {
                    masterZip.file(`skins/${skinFolderName}/${relativePath}`, fileData)
                  }
                }
                addedCount++
              } catch (unzipErr) {
                const ext = skinUrl.includes('.') ? skinUrl.slice(skinUrl.lastIndexOf('.')) : '.dds'
                masterZip.file(`skins/${skinFolderName}/skin${ext}`, new Uint8Array(buffer))
                addedCount++
              }
            }
          } catch (e) {
            console.error(`Failed to fetch skin for team ${item.teamName}:`, e)
          }
        }
      }

      if (addedCount === 0) {
        alert(`No custom skins found for category ${tag}.`)
        setDownloadingCategory(null)
        return
      }

      const content = await masterZip.generateAsync({ type: 'blob' })
      const downloadUrl = URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `Skins_${tag}_${league.slug || 'league'}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(downloadUrl)
    } catch (err) {
      console.error('Error bundling skins zip:', err)
      alert('Error creating master skin zip file.')
    } finally {
      setDownloadingCategory(null)
    }
  }

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
    const managed = myManagedTeams.find((t) => t.id === teamId)
    if (managed) return managed.name

    const fromStandings: any = (allTeamsInStandings as any[]).find((t) => t.id === teamId)
    if (fromStandings) return fromStandings.name

    const fromReg = registrations.find((r) => r.teamId === teamId)
    if (fromReg) return fromReg.displayName

    return `Team ${teamId.slice(0, 8)}`
  }

  const resolveDrivers = (teamId: string, classTag: string, carNumber: string | number) => {
    const targetDorsal = String(carNumber ?? '').trim()
    const matchedRegs = registrations.filter(
      (r) =>
        r.teamId === teamId &&
        String(r.classTag || '').toUpperCase() === String(classTag || '').toUpperCase() &&
        String(r.assignedNumber ?? '').trim() === targetDorsal
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
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <ClassBadge classTag={tag} className="text-xs font-black" />
                      <span className="text-xs text-slate-400 font-bold uppercase">
                        ({teamList.length} {teamList.length === 1 ? 'equipo' : 'equipos'})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDownloadCategorySkins(tag, teamList)}
                      disabled={downloadingCategory === tag}
                      className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider border rounded-none flex items-center gap-1.5 transition-colors cursor-pointer ${
                        downloadingCategory === tag
                          ? 'border-cyan-500/50 bg-cyan-950/60 text-cyan-300 animate-pulse'
                          : 'border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-white'
                      }`}
                      title={`Descargar todos los archivos .zip de skins de la categoría ${tag}`}
                    >
                      <FolderDown className="h-3.5 w-3.5 text-cyan-400" />
                      {downloadingCategory === tag ? 'Empaquetando Skins...' : `Descargar Skins ${tag} (.zip)`}
                    </button>
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
