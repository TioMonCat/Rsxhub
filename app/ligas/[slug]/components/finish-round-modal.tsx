'use client'

import { useState } from 'react'
import { X, Upload, FileText, BarChart3, CheckCircle2, AlertCircle, RefreshCw, Edit3 } from 'lucide-react'
import { ClassBadge } from '@/components/class-badge'
import type { LeagueEvent } from '../hooks/use-league-state'

interface FinishRoundModalProps {
  event: LeagueEvent
  leagueId: string
  classTags: string[]
  onClose: () => void
  onSuccess: () => void
}

export type ParsedRow = {
  id: string
  overallPos: number
  pos: number // Category Position
  driverName: string
  teamName: string
  steamId: string
  userId?: string
  classTag: string
  dorsal?: number
  points: number
}

const DEFAULT_POINTS_SYSTEM = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]

export function FinishRoundModal({
  event,
  leagueId,
  classTags = ['GT3', 'LMP2'],
  onClose,
  onSuccess,
}: FinishRoundModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'preview'>('upload')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL')
  const [jsonText, setJsonText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Handle JSON file selection or text input parsing
  const handleParseJson = (rawContent: string) => {
    try {
      setErrorMsg('')
      const parsed = JSON.parse(rawContent)
      let rawList: any[] = []

      if (Array.isArray(parsed)) {
        rawList = parsed
      } else if (Array.isArray(parsed.Result)) {
        rawList = parsed.Result
      } else if (Array.isArray(parsed.results)) {
        rawList = parsed.results
      } else if (Array.isArray(parsed.Cars)) {
        rawList = parsed.Cars
      }

      if (rawList.length === 0) {
        throw new Error('No se encontraron filas de resultados válidas en el archivo JSON.')
      }

      // Track positions per class tag
      const classCounters: Record<string, number> = {}

      const rows: ParsedRow[] = rawList.map((item, idx) => {
        const overallPos = item.position || item.pos || idx + 1
        const driverName =
          item.DriverName ||
          item.driverName ||
          item.Driver?.Name ||
          item.driver?.name ||
          item.name ||
          `Piloto ${idx + 1}`
        const teamName = item.TeamName || item.teamName || item.Driver?.Team || driverName
        const steamId =
          item.DriverGuid || item.driverGuid || item.Driver?.Guid || item.guid || `76561198000000${idx + 1}`
        const userId = item.userId || item.user_id

        // Determine category tag
        let classTag = item.classTag || item.ClassTag || item.CarModel || item.carModel || ''
        if (!classTag || !classTags.includes(classTag)) {
          classTag = classTags[idx % classTags.length] || 'GT3'
        }

        // Increment category position counter
        classCounters[classTag] = (classCounters[classTag] || 0) + 1
        const catPos = item.pos != null ? item.pos : classCounters[classTag]

        // Calculate points based on category position unless points are explicitly specified
        const points =
          typeof item.points === 'number'
            ? item.points
            : DEFAULT_POINTS_SYSTEM[catPos - 1] || (catPos <= 15 ? 1 : 0)

        return {
          id: `${steamId}_${idx}`,
          overallPos,
          pos: catPos,
          driverName,
          teamName,
          steamId,
          userId,
          classTag,
          dorsal: item.ballast ? Number(item.ballast) : Math.floor(Math.random() * 80) + 1,
          points,
        }
      })

      setParsedRows(rows)
      setActiveTab('preview')
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar el archivo JSON de Assetto Corsa.')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result as string
        setJsonText(text)
        handleParseJson(text)
      }
      reader.readAsText(selectedFile)
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    setJsonText(text)
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      handleParseJson(text)
    }
  }

  // Update Row Position
  const handleUpdateRowPos = (rowId: string, newPos: number) => {
    setParsedRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, pos: Math.max(1, newPos) } : row))
    )
  }

  // Update Row Points
  const handleUpdateRowPoints = (rowId: string, newPoints: number) => {
    setParsedRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, points: Math.max(0, newPoints) } : row))
    )
  }

  // Recalculate Points automatically based on Category Position
  const handleRecalculatePoints = () => {
    setParsedRows((prev) =>
      prev.map((row) => ({
        ...row,
        points: DEFAULT_POINTS_SYSTEM[row.pos - 1] || (row.pos <= 15 ? 1 : 0),
      }))
    )
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setErrorMsg('')

    try {
      // Build formatted results JSON text containing user edits
      const formattedResultsPayload = {
        eventId: event.id,
        results: parsedRows.map((r) => ({
          userId: r.userId,
          steamId: r.steamId,
          position: r.pos,
          points: r.points,
          classTag: r.classTag,
        })),
      }

      const formData = new FormData()
      formData.append('leagueId', leagueId)
      formData.append('eventId', event.id)
      formData.append('replaceExisting', 'on')
      formData.append('resultsJsonText', JSON.stringify(formattedResultsPayload))

      const res = await fetch('/api/admin/import-results', {
        method: 'POST',
        body: formData,
      })

      if (res.ok || res.redirected) {
        onSuccess()
      } else {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data.message || 'Error al guardar los resultados.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión al finalizar la ronda.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter & Group rows by Category Tag
  const availableCategories = Array.from(new Set(parsedRows.map((r) => r.classTag)))
  const displayCategories =
    selectedCategoryFilter === 'ALL'
      ? availableCategories.length > 0
        ? availableCategories
        : classTags
      : [selectedCategoryFilter]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 animate-fade-in">
      <div className="shell-panel border border-shell-line bg-zinc-950 max-w-4xl w-full p-5 md:p-6 text-white rounded-none shadow-[0_0_60px_rgba(0,0,0,0.9)] relative flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="border-b border-shell-line pb-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="bg-cyan-950 text-cyan-400 border border-cyan-800/50 px-2 py-0.5 text-[10px] font-mono font-bold uppercase">
              ROUND FINALIZATION
            </span>
            <h2 className="text-xl font-bold uppercase text-white tracking-tight">
              Finalizar Ronda: {event.title || event.circuitName}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Carga el JSON de la carrera, edita las posiciones/puntos por categoría si es necesario y confirma.
          </p>
        </div>

        {/* Main Tab Selector */}
        <div className="flex items-center justify-between border-b border-white/10 mb-4 gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'upload'
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload className="h-4 w-4" /> 1. Cargar AC JSON
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              disabled={parsedRows.length === 0}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors disabled:opacity-40 ${
                activeTab === 'preview'
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="h-4 w-4" /> 2. Preview & Edición ({parsedRows.length})
            </button>
          </div>

          {activeTab === 'preview' && (
            <button
              onClick={handleRecalculatePoints}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold uppercase flex items-center gap-1 bg-cyan-950/40 border border-cyan-800/40 px-2.5 py-1 transition-colors"
              title="Recalcular puntos de la escala por defecto"
            >
              <RefreshCw className="h-3 w-3" /> Auto-Recalcular Puntos
            </button>
          )}
        </div>

        {errorMsg && (
          <div className="mb-4 border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {activeTab === 'upload' ? (
            <div className="space-y-4">
              <label className="border-2 border-dashed border-shell-line hover:border-cyan-400 bg-black/40 p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors text-center group">
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="p-3 bg-cyan-950/60 border border-cyan-800/40 group-hover:scale-110 transition-transform">
                  <FileText className="h-6 w-6 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white uppercase">
                    {file ? file.name : 'Haz clic para seleccionar el archivo result.json'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Soporta archivos oficiales de Assetto Corsa Server (`results.json`).
                  </p>
                </div>
              </label>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase text-slate-300">
                  O Pega el contenido JSON directamente:
                </label>
                <textarea
                  value={jsonText}
                  onChange={handleTextChange}
                  rows={6}
                  placeholder='{"Result": [{"DriverGuid": "7656119...", "position": 1, "points": 25}]}'
                  className="w-full border border-shell-line bg-black/50 p-3 text-xs font-mono text-cyan-200 outline-none rounded-none focus:border-cyan-400"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Category Filter Pills */}
              <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                <span className="text-xs font-extrabold uppercase text-slate-400 mr-2">Categoría:</span>
                <button
                  onClick={() => setSelectedCategoryFilter('ALL')}
                  className={`px-3 py-1 text-xs font-extrabold uppercase transition-colors border ${
                    selectedCategoryFilter === 'ALL'
                      ? 'bg-cyan-500 text-black border-cyan-400'
                      : 'bg-black/40 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  TODAS ({parsedRows.length})
                </button>
                {availableCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategoryFilter(cat)}
                    className={`px-3 py-1 text-xs font-extrabold uppercase transition-colors border ${
                      selectedCategoryFilter === cat
                        ? 'bg-cyan-500 text-black border-cyan-400'
                        : 'bg-black/40 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    {cat} ({parsedRows.filter((r) => r.classTag === cat).length})
                  </button>
                ))}
              </div>

              {/* Grouped Category Tables */}
              {displayCategories.map((tag) => {
                const categoryRows = parsedRows.filter((r) => r.classTag === tag)
                if (categoryRows.length === 0) return null

                return (
                  <div key={tag} className="space-y-2">
                    <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2">
                      <div className="flex items-center gap-2">
                        <ClassBadge classTag={tag} className="text-xs font-black px-3 py-1" />
                        <span className="text-xs text-slate-400 font-mono font-bold">
                          ({categoryRows.length} competidores)
                        </span>
                      </div>
                      <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                        <Edit3 className="h-3 w-3" /> Edita posición y puntos directamente
                      </span>
                    </div>

                    <div className="border border-shell-line bg-black/40 overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-shell-line bg-white/5 text-slate-400 uppercase font-mono text-[10px]">
                            <th className="p-2.5 text-center w-16">Pos Cat.</th>
                            <th className="p-2.5">Equipo / Piloto</th>
                            <th className="p-2.5 text-center w-24">Pos General</th>
                            <th className="p-2.5 text-right w-32">Puntos Ronda</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {categoryRows.map((row) => (
                            <tr key={row.id} className="hover:bg-white/5 transition-colors">
                              {/* 1. Editable Category Position */}
                              <td className="p-2 text-center">
                                <input
                                  type="number"
                                  min={1}
                                  max={99}
                                  value={row.pos}
                                  onChange={(e) => handleUpdateRowPos(row.id, Number(e.target.value))}
                                  className="w-12 bg-black/80 border border-slate-700 text-center font-mono font-black text-amber-400 text-xs py-1 outline-none focus:border-cyan-400"
                                />
                              </td>

                              {/* 2. Driver/Team Details */}
                              <td className="p-2.5">
                                <p className="font-extrabold text-white leading-tight">{row.teamName}</p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {row.driverName} ({row.steamId})
                                </p>
                              </td>

                              {/* 3. Overall Position */}
                              <td className="p-2.5 text-center font-mono text-slate-400 text-xs">
                                P{row.overallPos}
                              </td>

                              {/* 4. Editable Points */}
                              <td className="p-2 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <span className="text-cyan-400 font-bold text-xs">+</span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={500}
                                    value={row.points}
                                    onChange={(e) => handleUpdateRowPoints(row.id, Number(e.target.value))}
                                    className="w-16 bg-black/80 border border-slate-700 text-right font-mono font-black text-cyan-300 text-xs py-1 px-1.5 outline-none focus:border-cyan-400"
                                  />
                                  <span className="text-slate-400 text-[10px] font-mono">pts</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-shell-line/50 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="border border-shell-line bg-black/40 hover:bg-slate-800 px-4 py-2 text-xs font-bold uppercase text-slate-300 rounded-none transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || parsedRows.length === 0}
            className="bg-cyan-500 hover:bg-cyan-400 text-black disabled:opacity-40 px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-none transition-colors flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            {isSubmitting ? 'Guardando...' : 'Confirmar & Finalizar Ronda'}
          </button>
        </div>
      </div>
    </div>
  )
}
