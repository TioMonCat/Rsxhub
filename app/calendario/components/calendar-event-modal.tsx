'use client'

import { X } from 'lucide-react'
import { ImagePicker } from '@/components/image-picker'
import { LeagueEvent, League } from '../hooks/use-calendar-state'

interface CalendarEventModalProps {
  isOpen: boolean
  editingEvent: LeagueEvent | null
  selectedDate: Date | null
  leagues: League[]
  isSubmitting: boolean
  errorMessage: string
  formLeagueId: string
  formTitle: string
  formCircuit: string
  formStartsAtTime: string
  formEndsAtTime: string
  formImageUrl: string
  formServerLink: string
  formEventType: 'race' | 'qualifying' | 'time_attack'
  formCountryCode: string
  onClose: () => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  setFormLeagueId: (val: string) => void
  setFormTitle: (val: string) => void
  setFormCircuit: (val: string) => void
  setFormStartsAtTime: (val: string) => void
  setFormEndsAtTime: (val: string) => void
  setFormServerLink: (val: string) => void
  setFormEventType: (val: 'race' | 'qualifying' | 'time_attack') => void
  setFormCountryCode: (val: string) => void
}

export function CalendarEventModal({
  isOpen,
  editingEvent,
  selectedDate,
  leagues,
  isSubmitting,
  errorMessage,
  formLeagueId,
  formTitle,
  formCircuit,
  formStartsAtTime,
  formEndsAtTime,
  formImageUrl,
  formServerLink,
  formEventType,
  formCountryCode,
  onClose,
  onSubmit,
  setFormLeagueId,
  setFormTitle,
  setFormCircuit,
  setFormStartsAtTime,
  setFormEndsAtTime,
  setFormServerLink,
  setFormEventType,
  setFormCountryCode,
}: CalendarEventModalProps) {
  if (!isOpen) return null

  const targetDateStr = editingEvent
    ? new Date(editingEvent.startsAt).toISOString().split('T')[0]
    : selectedDate
    ? selectedDate.toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fade-in">
      <div className="shell-panel border border-shell-line bg-zinc-950 max-w-xl w-full p-5 md:p-6 text-white rounded-none shadow-[0_0_50px_rgba(0,0,0,0.8)] relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
          <X className="h-4 w-4" />
        </button>

        <h2 className="text-xl font-bold uppercase tracking-tight text-white mb-1">
          {editingEvent ? 'Edit Calendar Event' : 'Add Calendar Event'}
        </h2>
        <p className="text-xs text-slate-400 mb-4 font-mono">Date: {targetDateStr}</p>

        <form onSubmit={onSubmit} className="space-y-4">
          {errorMessage && (
            <div className="border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-300 rounded-none">
              {errorMessage}
            </div>
          )}

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

          <div>
            <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">Event Title / Session</label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Round 1, Practice, Time Attack"
              className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">Session Format</label>
              <select
                value={formEventType}
                onChange={(e) => setFormEventType(e.target.value as any)}
                className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400 font-bold"
              >
                <option value="race">Race</option>
                <option value="qualifying">Qualifying</option>
                <option value="time_attack">Time Attack</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">Country (Flag)</label>
              <select
                value={formCountryCode}
                onChange={(e) => setFormCountryCode(e.target.value)}
                className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400 font-bold"
              >
                <option value="ESP">Spain (ESP)</option>
                <option value="DEU">Germany (DEU)</option>
                <option value="FRA">France (FRA)</option>
                <option value="ITA">Italy (ITA)</option>
                <option value="GBR">United Kingdom (GBR)</option>
                <option value="USA">United States (USA)</option>
                <option value="JPN">Japan (JPN)</option>
                <option value="BEL">Belgium (BEL)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">Circuit Name</label>
            <input
              type="text"
              value={formCircuit}
              onChange={(e) => setFormCircuit(e.target.value)}
              required
              placeholder="e.g. Spa-Francorchamps, Nürburgring GP"
              className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">Starts At Time</label>
              <input
                type="time"
                value={formStartsAtTime}
                onChange={(e) => setFormStartsAtTime(e.target.value)}
                required
                className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">Ends At Time</label>
              <input
                type="time"
                value={formEndsAtTime}
                onChange={(e) => setFormEndsAtTime(e.target.value)}
                required
                className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400"
              />
            </div>
          </div>

          <ImagePicker name="circuitImageUrl" defaultValue={formImageUrl} label="Circuit Banner Image" />

          <div>
            <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">Server Connection Link</label>
            <input
              type="text"
              value={formServerLink}
              onChange={(e) => setFormServerLink(e.target.value)}
              placeholder="e.g. steam://connect/12.34.56.78:27015"
              className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400 font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-shell-line/50">
            <button
              type="button"
              onClick={onClose}
              className="border border-shell-line bg-transparent hover:bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-shell-accent hover:bg-red-700 px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-none transition-colors"
            >
              {isSubmitting ? 'Saving...' : editingEvent ? 'Save Changes' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
