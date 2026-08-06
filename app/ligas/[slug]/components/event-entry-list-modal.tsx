'use client'

import React, { useState, useMemo } from 'react'
import JSZip from 'jszip'
import { FolderDown, X, Check, Copy } from 'lucide-react'
import { ClassBadge } from '@/components/class-badge'
import type { LeagueEvent, EventConfirmation, Registration, ManagedTeam, TeamStanding } from '../hooks/use-league-state'

type EventEntryListModalProps = {
  event: LeagueEvent
  confirmations: EventConfirmation[]
  registrations: Registration[]
  classTags: string[]
  myManagedTeams: ManagedTeam[]
  teamInfo?: Record<string, { name: string; primaryColor: string | null; logoUrl: string | null; cars?: any[]; members?: any[]; skinAssignments?: any[] }>
  standings?: Record<string, TeamStanding[]>
  isAdmin: boolean
  onClose: () => void
}

export function EventEntryListModal({
  event,
  confirmations,
  registrations,
  classTags,
  myManagedTeams,
  teamInfo = {},
  standings,
  isAdmin,
  onClose,
}: EventEntryListModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [downloadingCategory, setDownloadingCategory] = useState<string | null>(null)

  const allTeamsInStandings = useMemo(() => {
    if (!standings) return []
    const list: Array<{ id: string; name: string }> = []
    Object.values(standings).forEach((catTeams) => {
      catTeams.forEach((t) => {
        if (!list.some((existing) => existing.id === t.id)) {
          list.push({ id: t.id, name: t.name })
        }
      })
    })
    return list
  }, [standings])

  const resolveTeamName = (teamId: string) => {
    const managed = myManagedTeams.find((t) => t.id === teamId)
    if (managed) return managed.name
    const standingTeam = allTeamsInStandings.find((t) => t.id === teamId)
    if (standingTeam) return standingTeam.name
    const info = teamInfo[teamId]
    if (info) return info.name
    return `Team (${teamId.slice(0, 5)})`
  }

  const resolveCarSkin = (teamId: string, classTag: string, dorsal: string) => {
    const targetDorsal = String(dorsal ?? '').trim()
    const targetTag = String(classTag ?? '').trim().toUpperCase()

    const checkCars = (cars?: any[]): { found: boolean; url: string | null } => {
      if (!Array.isArray(cars) || cars.length === 0) return { found: false, url: null }

      // 1. Strict match by category & dorsal
      const car1 = cars.find(
        (c: any) =>
          String(c.category || '').toUpperCase() === targetTag &&
          String(c.dorsal ?? '').trim() === targetDorsal
      )
      if (car1) {
        const url = String(car1.skinUrl || car1.skin_url || car1.skin || car1.skinFile || '').trim()
        return { found: true, url: url || null }
      }

      // 2. Strict match by dorsal
      const car2 = cars.find((c: any) => String(c.dorsal ?? '').trim() === targetDorsal)
      if (car2) {
        const url = String(car2.skinUrl || car2.skin_url || car2.skin || car2.skinFile || '').trim()
        return { found: true, url: url || null }
      }

      return { found: false, url: null }
    }

    const checkAssignments = (assignments?: any[]): { found: boolean; url: string | null } => {
      if (!Array.isArray(assignments) || assignments.length === 0) return { found: false, url: null }
      const match = assignments.find(
        (s: any) => String((s.carNumber || s.dorsal) ?? '').trim() === targetDorsal
      )
      if (match) {
        const url = String(match.skinUrl || match.skin_url || '').trim()
        return { found: true, url: url || null }
      }
      return { found: false, url: null }
    }

    // 1. Check in myManagedTeams
    const managed = myManagedTeams.find((m) => m.id === teamId)
    if (managed) {
      const resCars = checkCars(managed.cars)
      if (resCars.found) return resCars.url
      const resAss = checkAssignments((managed as any).skinAssignments)
      if (resAss.found) return resAss.url
    }

    // 2. Check in teamInfo
    const info = teamInfo[teamId]
    if (info) {
      const resCars = checkCars(info.cars)
      if (resCars.found) return resCars.url
      const resAss = checkAssignments(info.skinAssignments)
      if (resAss.found) return resAss.url
    }

    return null
  }

  const getSteam64Id = (rSteam?: string, rUser?: string, memberSteam?: string) => {
    const candidates = [rSteam, memberSteam, rUser]
    for (const cand of candidates) {
      if (!cand) continue
      const cleaned = String(cand).trim().replace(/^steam_/, '')
      if (/^\d{15,18}$/.test(cleaned)) {
        return cleaned
      }
    }
    return ''
  }

  const resolveDrivers = (teamId: string, classTag: string, carNumber: string | number) => {
    const targetDorsal = String(carNumber ?? '').trim()
    const targetTag = String(classTag ?? '').trim().toUpperCase()

    // 1. Get team info from myManagedTeams or teamInfo
    const managed = myManagedTeams.find((t) => t.id === teamId)
    const info = teamInfo[teamId]
    const teamCars = managed?.cars || info?.cars || []
    const teamMembers: any[] = managed?.members || info?.members || []

    // 2. Find car matching category & dorsal
    const car =
      teamCars.find(
        (c: any) =>
          String(c.category || '').toUpperCase() === targetTag &&
          String(c.dorsal ?? '').trim() === targetDorsal
      ) || teamCars.find((c: any) => String(c.dorsal ?? '').trim() === targetDorsal)

    const driverUserIds: string[] = car?.driverUserIds || car?.driver_user_ids || []

    if (driverUserIds.length > 0) {
      const resolved = driverUserIds
        .map((dId) => {
          const member = teamMembers.find((m: any) => m.userId === dId || m.id === dId)
          const reg = registrations.find((r) => r.userId === dId && r.teamId === teamId)
          const name = member?.displayName || member?.name || reg?.displayName || 'Driver'
          const steamId = getSteam64Id(member?.steamId, (reg as any)?.steamId, dId)
          return { name, steamId }
        })
        .filter((d) => d.name)

      if (resolved.length > 0) return resolved
    }

    // 3. Fallback to matched registrations
    const matchedRegs = registrations.filter(
      (r) =>
        r.teamId === teamId &&
        String(r.classTag || '').toUpperCase() === targetTag &&
        String(r.assignedNumber ?? '').trim() === targetDorsal
    )

    if (matchedRegs.length > 0) {
      return matchedRegs.map((r) => {
        const member = teamMembers.find((m: any) => m.userId === r.userId)
        return {
          name: r.displayName || member?.displayName || 'Driver',
          steamId: getSteam64Id((r as any).steamId, member?.steamId, r.userId),
        }
      })
    }

    if (teamMembers.length > 0) {
      return teamMembers.map((m: any) => ({
        name: m.displayName || m.name || 'Driver',
        steamId: getSteam64Id(m.steamId, m.userId),
      }))
    }

    return []
  }

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
  }, [confirmations, classTags, myManagedTeams, registrations, allTeamsInStandings, teamInfo])

  const handleDownloadCategorySkins = async (tag: string, teamList: Array<{ teamId: string; teamName: string; dorsal: string }>) => {
    setDownloadingCategory(tag)
    try {
      const masterZip = new JSZip()
      let downloadedCount = 0

      for (const t of teamList) {
        const skinUrl = resolveCarSkin(t.teamId, tag, t.dorsal)

        if (skinUrl) {
          const sanitize = (str: string) => str.replace(/[^a-z0-9_-]/gi, '_')
          const skinFolderName = `#${t.dorsal}_${sanitize(t.teamName)}`

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
              const resp = await fetch(skinUrl)
              if (resp.ok) {
                buffer = await resp.arrayBuffer()
              } else {
                console.warn(`Fetch returned status ${resp.status} for skinUrl: ${skinUrl}`)
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
                downloadedCount++
              } catch (unzipErr) {
                // If not a valid zip archive (e.g. single dds or png), place in skin subfolder
                const ext = skinUrl.includes('.') ? skinUrl.slice(skinUrl.lastIndexOf('.')) : '.dds'
                masterZip.file(`skins/${skinFolderName}/skin${ext}`, new Uint8Array(buffer))
                downloadedCount++
              }
            }
          } catch (fetchErr) {
            console.error(`Failed to fetch/process skin for team ${t.teamName}:`, fetchErr)
          }
        }
      }

      if (downloadedCount === 0) {
        alert(`No skin files found to download for ${tag} category.`)
        return
      }

      const content = await masterZip.generateAsync({ type: 'blob' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(content)
      link.download = `Skins_Confirmed_${tag}_Round.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Error generating skins zip bundle:', err)
      alert('Error creating compressed skins bundle file.')
    } finally {
      setDownloadingCategory(null)
    }
  }

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
                {totalConfirmed} {totalConfirmed === 1 ? 'confirmed team' : 'confirmed teams'}
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
              No confirmed teams for this round yet.
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
                        ({teamList.length} {teamList.length === 1 ? 'team' : 'teams'})
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
                      title={`Download all .zip skin files for ${tag} category`}
                    >
                      <FolderDown className="h-3.5 w-3.5 text-cyan-400" />
                      {downloadingCategory === tag ? 'Bundling Skins...' : `Download ${tag} Skins (.zip)`}
                    </button>
                  </div>

                  <div className="grid gap-2">
                    {teamList.map((t, idx) => {
                      const rowKey = `${tag}_${t.teamId}_${t.dorsal}_${idx}`
                      const skinUrl = resolveCarSkin(t.teamId, tag, t.dorsal)

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
                                    <span key={dIdx} className="text-slate-300 font-medium">
                                      {d.name}
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
                                  const ids = t.drivers
                                    .map((d) => d.steamId)
                                    .filter((id) => Boolean(id) && /^\d{15,18}$/.test(id))
                                  const copyText = ids.join(', ')
                                  if (copyText) {
                                    navigator.clipboard.writeText(copyText)
                                    setCopiedKey(rowKey)
                                    setTimeout(() => setCopiedKey(null), 2200)
                                  } else {
                                    alert('No Steam 64 IDs found for drivers in this car.')
                                  }
                                }}
                                className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                                title={`Copy driver Steam 64 IDs for car #${t.dorsal}`}
                              >
                                {copiedKey === rowKey ? (
                                  <>
                                    <Check className="h-3 w-3 text-emerald-400" />
                                    <span className="text-emerald-400">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3 text-cyan-400" />
                                    <span>Copy IDs</span>
                                  </>
                                )}
                              </button>
                            )}

                            {skinUrl ? (
                              <span className="bg-cyan-950/60 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold uppercase px-2 py-0.5 flex items-center gap-1">
                                <Check className="h-3 w-3 text-cyan-400" />
                                SKIN OK
                              </span>
                            ) : (
                              <span className="bg-slate-900 text-slate-400 border border-slate-700/60 text-[10px] font-bold uppercase px-2 py-0.5">
                                NO SKIN
                              </span>
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
