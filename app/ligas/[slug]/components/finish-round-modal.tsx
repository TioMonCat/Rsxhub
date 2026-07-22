'use client'

import { useState } from 'react'
import { X, Upload, FileText, BarChart3, CheckCircle2, AlertCircle } from 'lucide-react'
import { ClassBadge } from '@/components/class-badge'
import type { LeagueEvent } from '../hooks/use-league-state'

interface FinishRoundModalProps {
  event: LeagueEvent
  leagueId: string
  classTags: string[]
  onClose: () => void
  onSuccess: () => void
}

type ParsedRow = {
  pos: number
  driverName: string
  teamName: string
  steamId: string
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

      const rows: ParsedRow[] = rawList.map((item, idx) => {
        const pos = item.position || item.pos || idx + 1
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
        const points =
          typeof item.points === 'number' ? item.points : DEFAULT_POINTS_SYSTEM[idx] || (idx < 15 ? 1 : 0)
        const classTag = item.classTag || classTags[idx % classTags.length] || 'GT3'

        return {
          pos,
          driverName,
          teamName,
          steamId,
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

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setErrorMsg('')

    try {
      const formData = new FormData()
      formData.append('leagueId', leagueId)
      formData.append('eventId', event.id)
      formData.append('replaceExisting', 'on')
      if (file) {
        formData.append('resultsFile', file)
      }
      if (jsonText) {
        formData.append('resultsJsonText', jsonText)
      }

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 animate-fade-in">
      <div className="shell-panel border border-shell-line bg-zinc-950 max-w-3xl w-full p-5 md:p-6 text-white rounded-none shadow-[0_0_60px_rgba(0,0,0,0.9)] relative flex flex-col max-h-[90vh]">
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
            Carga el resultado oficial en formato JSON de Assetto Corsa y revisa la vista previa del Standing.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 border-b border-white/10 mb-4">
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
            <BarChart3 className="h-4 w-4" /> 2. Preview del Standing ({parsedRows.length})
          </button>
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
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-black/40 border border-shell-line/50 p-3 text-xs text-slate-300">
                <span>Total de pilotos procesados: <strong className="text-white">{parsedRows.length}</strong></span>
                <span className="font-mono text-cyan-400 font-bold">Puntos asignados automáticamente</span>
              </div>

              <div className="border border-shell-line bg-black/40 overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-shell-line bg-white/5 text-slate-400 uppercase font-mono text-[10px]">
                      <th className="p-2.5 text-center w-12">Pos</th>
                      <th className="p-2.5">Equipo / Piloto</th>
                      <th className="p-2.5 text-center w-24">Categoría</th>
                      <th className="p-2.5 text-right w-24">Puntos Ronda</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {parsedRows.map((row) => (
                      <tr key={`${row.steamId}_${row.pos}`} className="hover:bg-white/5 transition-colors">
                        <td className="p-2.5 text-center font-black text-amber-400 font-mono">
                          {row.pos === 1 ? '🥇 1' : row.pos === 2 ? '🥈 2' : row.pos === 3 ? '🥉 3' : row.pos}
                        </td>
                        <td className="p-2.5">
                          <p className="font-bold text-white leading-tight">{row.teamName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{row.driverName} ({row.steamId})</p>
                        </td>
                        <td className="p-2.5 text-center">
                          <ClassBadge classTag={row.classTag} className="text-[9px] font-black" />
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-cyan-300">
                          +{row.points} pts
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
