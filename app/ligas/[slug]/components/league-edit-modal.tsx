'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { ImagePicker } from '@/components/image-picker'
import { updateLeagueDetailsAction, deleteLeagueAction } from '../actions'
import type { League } from '@/types'

type LeagueEditModalProps = {
  league: League
  isOpen: boolean
  onClose: () => void
}

export function LeagueEditModal({ league, isOpen, onClose }: LeagueEditModalProps) {
  const router = useRouter()
  const accentHex = league.accentColor || '#1274de'

  const [formTitle, setFormTitle] = useState(league.title)
  const [formSlug, setFormSlug] = useState(league.slug)
  const [formSimulator, setFormSimulator] = useState(league.simulator || 'ac')
  const [formFormat, setFormFormat] = useState(league.format || 'sprint')
  const [formStatus, setFormStatus] = useState(league.status || 'open')
  const [formRegistrationMode, setFormRegistrationMode] = useState((league as any).registrationMode || 'team')
  const [formClassTags, setFormClassTags] = useState((league.classTags || []).join(', '))
  const [formStartsAt, setFormStartsAt] = useState(league.startsAt.split('T')[0])
  const [formEndsAt, setFormEndsAt] = useState(league.endsAt.split('T')[0])
  const [formRegistrationOpen, setFormRegistrationOpen] = useState(league.registrationOpen)
  const [formMaxDriversPerCar, setFormMaxDriversPerCar] = useState<number>((league as any).maxDriversPerCar ?? 4)
  const [formSlogan, setFormSlogan] = useState(league.slogan || '')
  const [formAccentColor, setFormAccentColor] = useState(accentHex)
  const [formBannerUrl, setFormBannerUrl] = useState(league.bannerUrl || '')
  const [formLogoUrl, setFormLogoUrl] = useState((league as any).logoUrl || '')
  const [isLeagueSubmitting, setIsLeagueSubmitting] = useState(false)

  if (!isOpen) return null

  const handleLeagueDelete = async () => {
    if (!confirm('Are you sure you want to delete this league? This action cannot be undone.')) return
    try {
      await deleteLeagueAction(league.id, league.slug)
      router.push('/ligas')
    } catch (e: any) {
      alert(e.message || 'Error deleting league.')
    }
  }

  const handleLeagueUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLeagueSubmitting(true)
    try {
      const formData = new FormData(e.currentTarget)
      formData.set('leagueId', league.id)
      formData.set('title', formTitle)
      formData.set('slug', formSlug)
      formData.set('simulator', formSimulator)
      formData.set('format', formFormat)
      formData.set('status', formStatus)
      formData.set('registrationMode', formRegistrationMode)
      formData.set('classTags', formClassTags)
      formData.set('startsAt', formStartsAt)
      formData.set('endsAt', formEndsAt)
      formData.set('registrationOpen', formRegistrationOpen ? 'true' : 'false')
      formData.set('maxDriversPerCar', String(formMaxDriversPerCar))
      formData.set('slogan', formSlogan)
      formData.set('accentColor', formAccentColor)
      formData.set('bannerUrl', String(formData.get('bannerUrl') || formBannerUrl))
      formData.set('logoUrl', String(formData.get('logoUrl') || formLogoUrl))

      await updateLeagueDetailsAction(formData)
      onClose()
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Error updating league settings.')
    } finally {
      setIsLeagueSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm p-4 md:p-6 flex justify-center items-start sm:items-center animate-fade-in">
      <div className="shell-panel border border-shell-line bg-[#090d16] max-w-4xl w-full p-5 md:p-6 text-white rounded-none shadow-[0_0_60px_rgba(0,0,0,0.9)] relative my-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 pb-3 border-b border-shell-line/40">
          <h2 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
            ⚙️ Edit League Settings &amp; Details
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Modify any league parameter: title, dates, simulator, format, categories, registrations and branding.
          </p>
        </div>

        <form onSubmit={handleLeagueUpdate} className="space-y-6">
          {/* SECTION 1: General Info */}
          <div className="space-y-4 bg-black/30 p-4 border border-shell-line/40">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-cyan-400 border-b border-cyan-500/20 pb-1.5">
              1. General Info &amp; Titles
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">League Name (Title)</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                  className="w-full border border-shell-line bg-black/60 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400 font-bold"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">Abbreviation / URL (Slug)</label>
                <input
                  type="text"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  required
                  className="w-full border border-shell-line bg-black/60 px-3 py-2 text-xs text-cyan-300 outline-none rounded-none focus:border-cyan-400 font-mono"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Rules, Simulator & Format */}
          <div className="space-y-4 bg-black/30 p-4 border border-shell-line/40">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-cyan-400 border-b border-cyan-500/20 pb-1.5">
              2. Simulator, Format &amp; League Status
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">Simulator</label>
                <select
                  value={formSimulator}
                  onChange={(e) => setFormSimulator(e.target.value)}
                  className="w-full border border-shell-line bg-black/60 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400 font-semibold"
                >
                  <option value="ac">Assetto Corsa</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">Format</label>
                <select
                  value={formFormat}
                  onChange={(e) => setFormFormat(e.target.value)}
                  className="w-full border border-shell-line bg-black/60 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400 font-semibold"
                >
                  <option value="endurance">Endurance</option>
                  <option value="sprint">Sprint</option>
                  <option value="championship">Championship</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">League Status</label>
                <select
                  value={formStatus === 'open' ? 'open' : 'completed'}
                  onChange={(e) => {
                    const val = e.target.value
                    setFormStatus(val)
                    setFormRegistrationOpen(val === 'open')
                  }}
                  className="w-full border border-shell-line bg-black/60 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400 font-semibold"
                >
                  <option value="open">Open (Any new team can register)</option>
                  <option value="completed">Closed (No new teams can join)</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <div>
                <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">Registration Mode</label>
                <select
                  value={formRegistrationMode}
                  onChange={(e) => setFormRegistrationMode(e.target.value)}
                  className="w-full border border-shell-line bg-black/60 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400"
                >
                  <option value="team">By Team / Constructor (Team Registration)</option>
                  <option value="individual">Individual Driver Entry</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 3: Categories & Color Palette */}
          <div className="space-y-4 bg-black/30 p-4 border border-shell-line/40">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-cyan-400 border-b border-cyan-500/20 pb-1.5">
              3. Categories, Visual Color &amp; Dates
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category Selection & Max Slots */}
              <div>
                <label className="mb-1.5 block text-xs text-slate-300 uppercase font-semibold">Categories &amp; Max Slots per Category</label>
                <div className="grid grid-cols-1 gap-2.5 bg-black/60 p-3 border border-shell-line/50">
                  {['GT3', 'Hypercar', 'LMP2'].map((cat) => {
                    const currentCats = formClassTags
                      .split(',')
                      .map((s) => s.trim().toUpperCase())
                      .filter(Boolean)
                    const isChecked = currentCats.includes(cat.toUpperCase())
                    const currentLimit = (league as any).classLimits?.[cat.toUpperCase()] ?? 30

                    return (
                      <div
                        key={cat}
                        className={`p-2 border transition-colors flex items-center justify-between gap-3 ${
                          isChecked
                            ? 'bg-cyan-950/40 border-cyan-400/60'
                            : 'bg-black/40 border-white/10 opacity-60'
                        }`}
                      >
                        <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              let updated: string[]
                              if (e.target.checked) {
                                updated = Array.from(new Set([...currentCats, cat.toUpperCase()]))
                              } else {
                                updated = currentCats.filter((c) => c !== cat.toUpperCase())
                              }
                              setFormClassTags(updated.join(', '))
                            }}
                            className="h-4 w-4 accent-cyan-400 cursor-pointer"
                          />
                          <span>{cat}</span>
                        </label>

                        {isChecked && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Max Cars:</span>
                            <input
                              type="number"
                              name={`max_cars_${cat.toUpperCase()}`}
                              defaultValue={currentLimit}
                              min={1}
                              max={100}
                              required
                              className="w-16 border border-shell-line bg-black/80 px-2 py-1 text-xs text-cyan-300 font-mono text-center outline-none rounded-none focus:border-cyan-400"
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Max Drivers Per Car Input */}
                <div className="mt-3 bg-black/60 p-3 border border-shell-line/50 space-y-1">
                  <label className="block text-xs text-slate-300 uppercase font-semibold flex items-center justify-between">
                    <span>Max Drivers per Car / Number</span>
                    <span className="text-[10px] text-cyan-400 font-mono font-bold">{formMaxDriversPerCar} DRIVERS PER NUMBER</span>
                  </label>
                  <input
                    type="number"
                    name="maxDriversPerCar"
                    min={1}
                    max={6}
                    value={formMaxDriversPerCar}
                    onChange={(e) => setFormMaxDriversPerCar(Number(e.target.value) || 4)}
                    required
                    className="w-full border border-shell-line bg-black/80 px-3 py-2 text-xs text-cyan-300 outline-none rounded-none focus:border-cyan-400 font-mono font-bold"
                    placeholder="e.g: 4"
                  />
                  <p className="text-[10px] text-slate-400">
                    Define the maximum number of drivers assignable per vehicle/number in this league.
                  </p>
                </div>
              </div>

              {/* Predefined Color Palette */}
              <div>
                <label className="mb-1.5 block text-xs text-slate-300 uppercase font-semibold">League Visual Color (Color Palette)</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap bg-black/60 p-2.5 border border-shell-line/50">
                    {[
                      { name: 'Neon Cyan', hex: '#00f2fe' },
                      { name: 'Racing Red', hex: '#ff3b30' },
                      { name: 'Electric Blue', hex: '#1274de' },
                      { name: 'Emerald Green', hex: '#10b981' },
                      { name: 'Hyper Orange', hex: '#ff6b00' },
                      { name: 'Neon Purple', hex: '#a855f7' },
                    ].map((color) => (
                      <button
                        key={color.hex}
                        type="button"
                        onClick={() => setFormAccentColor(color.hex)}
                        title={color.name}
                        className={`h-7 w-7 rounded-none transition-transform border cursor-pointer ${
                          formAccentColor.toLowerCase() === color.hex.toLowerCase()
                            ? 'scale-125 border-white ring-2 ring-cyan-400 shadow-[0_0_10px_rgba(0,242,254,0.6)] z-10'
                            : 'border-white/20 hover:scale-110'
                        }`}
                        style={{ backgroundColor: color.hex }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-mono">Custom:</span>
                    <input
                      type="text"
                      value={formAccentColor}
                      onChange={(e) => setFormAccentColor(e.target.value)}
                      className="w-28 border border-shell-line bg-black/60 px-2.5 py-1 text-xs text-white font-mono outline-none rounded-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">Start Date</label>
                <input
                  type="date"
                  value={formStartsAt}
                  onChange={(e) => setFormStartsAt(e.target.value)}
                  required
                  className="w-full border border-shell-line bg-black/60 px-3 py-2 text-xs text-white font-mono outline-none rounded-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">End Date</label>
                <input
                  type="date"
                  value={formEndsAt}
                  onChange={(e) => setFormEndsAt(e.target.value)}
                  required
                  className="w-full border border-shell-line bg-black/60 px-3 py-2 text-xs text-white font-mono outline-none rounded-none focus:border-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: Media & Banner */}
          <div className="space-y-4 bg-black/30 p-4 border border-shell-line/40">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-cyan-400 border-b border-cyan-500/20 pb-1.5">
              4. League Cover Image
            </h3>
            <div>
              <ImagePicker
                name="bannerUrl"
                defaultValue={formBannerUrl}
                onChange={setFormBannerUrl}
                label="League Banner Image (Main Header)"
              />
            </div>
          </div>

          {/* DANGER ZONE & ACTIONS */}
          <div className="flex items-center justify-between pt-4 border-t border-shell-line/50">
            <button
              type="button"
              onClick={handleLeagueDelete}
              className="border border-rose-800/60 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              ⚠️ Delete League
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="border border-shell-line px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLeagueSubmitting}
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold px-6 py-2 text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isLeagueSubmitting ? 'Saving Settings...' : 'Save League Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
