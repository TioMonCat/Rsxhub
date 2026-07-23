'use client'

import { useState, useEffect } from 'react'
import { X, Trophy, ShieldCheck, Loader2 } from 'lucide-react'
import { ClassBadge } from '@/components/class-badge'
import { getEventResultsAction } from '@/app/ligas/actions'
import type { LeagueEvent } from '../hooks/use-league-state'

interface ViewResultsModalProps {
  event: LeagueEvent
  leagueId: string
  classTags: string[]
  onClose: () => void
}

export type EventResultRow = {
  id: string
  position: number
  driverName: string
  teamName: string
  steamId: string
  classTag: string
  dorsal: number | null
  points: number
}

export function ViewResultsModal({
  event,
  leagueId,
  classTags = ['GT3', 'LMP2'],
  onClose,
}: ViewResultsModalProps) {
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL')
  const [results, setResults] = useState<EventResultRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    async function loadResults() {
      setLoading(true)
      try {
        const data = await getEventResultsAction(leagueId, event.id)
        if (isMounted) {
          setResults(data)
        }
      } catch (err) {
        console.error('Error fetching event results:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    loadResults()
    return () => {
      isMounted = false
    }
  }, [leagueId, event.id])

  const availableCategories = Array.from(new Set(results.map((r) => r.classTag)))
  const displayCategories =
    selectedCategoryFilter === 'ALL'
      ? availableCategories.length > 0
        ? availableCategories
        : classTags
      : [selectedCategoryFilter]

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm p-4 md:p-6 flex justify-center items-start sm:items-center animate-fade-in">
      <div className="shell-panel border border-shell-line bg-[#090d16] max-w-4xl w-full p-5 md:p-6 text-white rounded-none shadow-[0_0_60px_rgba(0,0,0,0.9)] relative flex flex-col my-auto">
        {/* Modal Header */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="border-b border-shell-line pb-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-950 text-emerald-400 border border-emerald-800/50 px-2 py-0.5 text-[10px] font-mono font-bold uppercase">
              RESULTADOS OFICIALES
            </span>
            <span className="bg-cyan-950 text-cyan-400 border border-cyan-800/50 px-2 py-0.5 text-[10px] font-mono font-bold uppercase">
              LECTURA SOLAMENTE
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black uppercase text-white tracking-tight italic mt-1.5 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-400" />
            {event.title || event.circuitName}
          </h2>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            Clasificación oficial de la ronda verificada por la organización.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-3 overflow-x-auto">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2 shrink-0">
            Categoría:
          </span>
          <button
            type="button"
            onClick={() => setSelectedCategoryFilter('ALL')}
            className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-none transition-colors cursor-pointer shrink-0 ${
              selectedCategoryFilter === 'ALL'
                ? 'bg-cyan-500 text-black border border-cyan-400'
                : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
            }`}
          >
            Todas las Categorías
          </button>
          {(availableCategories.length > 0 ? availableCategories : classTags).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategoryFilter(cat)}
              className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-none transition-colors cursor-pointer shrink-0 ${
                selectedCategoryFilter === cat
                  ? 'bg-cyan-500 text-black border border-cyan-400'
                  : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            <p className="text-xs font-mono uppercase tracking-wider">Cargando clasificación de la ronda...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="border border-white/10 bg-black/40 p-8 text-center rounded-none my-4">
            <Trophy className="h-10 w-10 text-slate-600 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-bold text-slate-300 uppercase tracking-wider">Sin resultados oficiales cargados</p>
            <p className="text-xs text-slate-500 mt-1">Los comisarios de la liga aún no han publicado la tabla final de esta ronda.</p>
          </div>
        ) : (
          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
            {displayCategories.map((catTag) => {
              const categoryRows = results.filter((r) => r.classTag === catTag)
              if (categoryRows.length === 0 && selectedCategoryFilter !== 'ALL') return null

              return (
                <div key={catTag} className="border border-shell-line bg-black/40 p-4 rounded-none space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <ClassBadge classTag={catTag} className="text-xs px-2.5 py-0.5 font-black" />
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Clasificación Categoría {catTag}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-400">
                      {categoryRows.length} Pilotos Finalistas
                    </span>
                  </div>

                  {categoryRows.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2">No hay posiciones registradas para esta categoría.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-white/10 bg-white/[0.03] text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                            <th className="p-2 w-16 text-center">POS</th>
                            <th className="p-2">PILOTO</th>
                            <th className="p-2">ESCUDERÍA / EQUIPO</th>
                            <th className="p-2 w-20 text-center">DORSAL</th>
                            <th className="p-2 w-24 text-right">PUNTOS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {categoryRows.map((row, idx) => {
                            const isP1 = row.position === 1 || idx === 0
                            const isP2 = row.position === 2 || idx === 1
                            const isP3 = row.position === 3 || idx === 2

                            let posBg = 'bg-black/20 text-slate-300'
                            if (isP1) posBg = 'bg-amber-500/20 text-amber-300 border border-amber-500/50 font-black'
                            else if (isP2) posBg = 'bg-slate-300/20 text-slate-200 border border-slate-300/50 font-black'
                            else if (isP3) posBg = 'bg-amber-700/20 text-amber-500 border border-amber-700/50 font-black'

                            return (
                              <tr key={row.id || idx} className="hover:bg-white/[0.04] transition-colors">
                                <td className="p-2 text-center">
                                  <span className={`inline-block w-7 py-0.5 text-center text-xs font-mono rounded-none ${posBg}`}>
                                    {isP1 ? '🥇 P1' : isP2 ? '🥈 P2' : isP3 ? '🥉 P3' : `P${row.position || idx + 1}`}
                                  </span>
                                </td>
                                <td className="p-2">
                                  <div>
                                    <p className="font-bold text-white leading-tight">{row.driverName}</p>
                                    {row.steamId && (
                                      <p className="text-[10px] text-slate-500 font-mono">Steam: {row.steamId}</p>
                                    )}
                                  </div>
                                </td>
                                <td className="p-2 font-semibold text-slate-300 uppercase tracking-wide">
                                  {row.teamName}
                                </td>
                                <td className="p-2 text-center font-mono font-bold text-cyan-400">
                                  {row.dorsal ? `#${row.dorsal}` : '-'}
                                </td>
                                <td className="p-2 text-right font-mono font-extrabold text-emerald-400 text-sm">
                                  {row.points} pts
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex justify-end pt-4 border-t border-shell-line mt-4">
          <button
            type="button"
            onClick={onClose}
            className="border border-shell-line bg-white/10 hover:bg-white/20 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white rounded-none transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
