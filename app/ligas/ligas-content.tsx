'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Trash2, X, AlertCircle } from 'lucide-react'
import { LeagueCard } from '@/components/league-card'
import { SectionTitle } from '@/components/section-title'
import { createLeagueAction, deleteLeagueAction } from './actions'
import { ImagePicker } from '@/components/image-picker'

type League = {
  id: string
  title: string
  slug: string
  simulator: string
  format: string
  classTags?: string[]
  startsAt: string
  endsAt: string
  maxDrivers: number | null
  registrationOpen: boolean
  status: string
  bannerUrl: string | null
  shortDescription?: string
}

type Props = {
  initialLeagues: League[]
  registeredByLeague: Record<string, number>
  isAdmin: boolean
  searchParams: {
    simulator?: string
    status?: string
    format?: string
    q?: string
  }
}

export default function LigasPageContent({
  initialLeagues,
  registeredByLeague,
  isAdmin,
  searchParams,
}: Props) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>(['GT3', 'LMP2', 'HYPERCAR'])
  const [selectedAccent, setSelectedAccent] = useState('#1274de')

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  // Filters from URL or state
  const q = (searchParams.q || '').toLowerCase().trim()
  const filtered = initialLeagues.filter((league) => {
    const matchSimulator = !searchParams.simulator || league.simulator === searchParams.simulator
    const matchStatus = !searchParams.status || league.status === searchParams.status
    const matchFormat = !searchParams.format || league.format === searchParams.format
    const matchQuery =
      !q ||
      league.title.toLowerCase().includes(q) ||
      (league.shortDescription && league.shortDescription.toLowerCase().includes(q))
    return matchSimulator && matchStatus && matchFormat && matchQuery
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')

    const formData = new FormData(e.currentTarget)
    try {
      await createLeagueAction(formData)
      setIsCreateOpen(false)
    } catch (err: any) {
      if (err?.digest?.startsWith('NEXT_REDIRECT') || err?.message === 'NEXT_REDIRECT') {
        setIsCreateOpen(false)
        return
      }
      setErrorMessage(err.message || 'Failed to create league.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string, slug: string) => {
    if (confirm(`Are you sure you want to delete the league "${slug}" entirely?`)) {
      try {
        await deleteLeagueAction(id)
      } catch (err: any) {
        alert(err.message || 'Failed to delete league.')
      }
    }
  }

  return (
    <div className="space-y-4 text-white">
      {/* Search and Filters Box */}
      <section className="shell-panel p-4 md:p-5 rounded-none">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4 border-b border-shell-line pb-3">
          <SectionTitle title="Hosted Races" subtitle="Filter by sim, status and format just like a race browser." />
          {isAdmin && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="bg-shell-accent hover:bg-red-700 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white rounded-none transition-colors flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Create League
            </button>
          )}
        </div>

        <form className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <input
            name="q"
            defaultValue={searchParams.q}
            placeholder="Search league..."
            className="border border-shell-line bg-black/20 px-3 py-2 text-xs text-white outline-none rounded-none placeholder:text-slate-500 focus:border-cyan-400"
          />

          <select
            name="simulator"
            defaultValue={searchParams.simulator}
            className="border border-shell-line bg-black/20 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400"
          >
            <option value="">All Simulators</option>
            <option value="ac">Assetto Corsa</option>
          </select>

          <select
            name="status"
            defaultValue={searchParams.status}
            className="border border-shell-line bg-black/20 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="ongoing">Ongoing</option>
            <option value="finished">Finished</option>
          </select>

          <button className="bg-shell-accent hover:bg-red-700 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white rounded-none transition-colors">
            Apply Filters
          </button>
        </form>
      </section>

      {/* Leagues List Grid */}
      {filtered.length === 0 ? (
        <div className="shell-panel flex flex-col items-center justify-center text-center p-8 md:p-12 space-y-4 rounded-none border border-shell-line bg-zinc-950/40">
          <div className="flex h-12 w-12 items-center justify-center bg-white/5 border border-white/10 text-slate-400">
            <AlertCircle className="h-6 w-6 text-[#1274de]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black uppercase tracking-wider text-white">No Leagues Found</h3>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              There are no leagues matching your filters or created on the platform yet. {isAdmin && "Click 'Create League' above to launch your first championship."}
            </p>
          </div>
        </div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((league) => (
            <div key={league.id} className="flex flex-col h-full group">
              <div className="flex-1">
                <LeagueCard
                  league={league as any}
                  registeredCount={registeredByLeague[league.id] || 0}
                />
              </div>
              {isAdmin && (
                <div className="border border-t-0 border-shell-line bg-zinc-950 p-2 flex justify-end rounded-none">
                  <button
                    onClick={() => handleDelete(league.id, league.title)}
                    className="border border-rose-500/40 hover:bg-rose-500/10 px-3 py-1 text-xxs font-bold uppercase tracking-wider text-rose-400 rounded-none transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete League
                  </button>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Create League Modal dialog */}
      {isCreateOpen && mounted && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-[150] overflow-y-auto bg-black/85 backdrop-blur-sm p-4 flex justify-center items-start md:items-center">
              <div className="w-full max-w-2xl bg-[#090d16] border border-shell-line shadow-2xl my-auto relative">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-shell-line p-5">
                  <h2 className="text-lg font-black uppercase italic tracking-wider text-white">
                    Create New League
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Modal Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  {errorMessage && (
                    <div className="border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-300 rounded-none">
                      {errorMessage}
                    </div>
                  )}

                  {/* Title */}
                  <div>
                    <label className="mb-1 block text-xs text-slate-355 uppercase tracking-wider font-semibold">League Title *</label>
                    <input
                      name="title"
                      type="text"
                      required
                      placeholder="e.g. ALR GT3 Sprint Series"
                      className="w-full border border-shell-line bg-black/40 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-white/30 rounded-none transition-colors"
                    />
                  </div>

                  {/* Simulator & Format */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-slate-355 uppercase tracking-wider font-semibold">Simulator</label>
                      <select
                        name="simulator"
                        required
                        className="w-full border border-shell-line bg-black/40 px-3 py-2 text-sm text-white outline-none rounded-none cursor-pointer focus:border-white/30 transition-colors"
                      >
                        <option value="ac">Assetto Corsa</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-slate-355 uppercase tracking-wider font-semibold">Format</label>
                      <select
                        name="format"
                        required
                        className="w-full border border-shell-line bg-black/40 px-3 py-2 text-sm text-white outline-none rounded-none cursor-pointer focus:border-white/30 transition-colors"
                      >
                        <option value="gt3">GT3</option>
                        <option value="endurance">Endurance</option>
                        <option value="prototype">Prototype</option>
                        <option value="formula">Formula</option>
                        <option value="sprint">Sprint</option>
                      </select>
                    </div>
                  </div>

                  {/* Class Tags & Car Limits */}
                  <div className="space-y-2">
                    <label className="block text-xs text-slate-355 uppercase tracking-wider font-semibold">Competition Categories & Max Cars</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {['GT3', 'LMP2', 'HYPERCAR'].map((tag) => {
                        const isChecked = selectedTags.includes(tag)
                        return (
                          <div key={tag} className={`border p-3 flex flex-col justify-between gap-2 transition-all rounded-none ${
                            isChecked ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-shell-line bg-black/40'
                          }`}>
                            <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer hover:text-white select-none">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleTagToggle(tag)}
                                className="rounded-none border-slate-700 bg-transparent text-cyan-500 focus:ring-0 w-4 h-4 cursor-pointer"
                              />
                              <span className="font-bold">{tag}</span>
                            </label>
                            {isChecked && (
                              <div className="mt-1 space-y-1">
                                <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold">Max Cars</label>
                                <input
                                  type="number"
                                  name={`max_cars_${tag}`}
                                  defaultValue={30}
                                  min={1}
                                  max={100}
                                  required
                                  className="w-full border border-shell-line bg-black/60 px-2 py-1 text-xs text-white outline-none rounded-none focus:border-white/30"
                                />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <input type="hidden" name="classTags" value={selectedTags.join(', ')} />
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-slate-355 uppercase tracking-wider font-semibold">Start Date</label>
                      <input
                        name="startsAt"
                        type="date"
                        required
                        className="w-full border border-shell-line bg-black/40 px-3 py-2 text-sm text-white outline-none rounded-none focus:border-white/30 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-slate-355 uppercase tracking-wider font-semibold">End Date</label>
                      <input
                        name="endsAt"
                        type="date"
                        required
                        className="w-full border border-shell-line bg-black/40 px-3 py-2 text-sm text-white outline-none rounded-none focus:border-white/30 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Capacity & Reg Status */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-slate-355 uppercase tracking-wider font-semibold">Registered Teams Limit</label>
                      <div className="w-full border border-shell-line bg-black/20 px-3 py-2 text-sm text-slate-300 font-bold uppercase rounded-none">
                        Infinite / Unlimited
                      </div>
                      <input type="hidden" name="maxDrivers" value={9999} />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-slate-355 uppercase tracking-wider font-semibold">Registration Status</label>
                      <select
                        name="registrationOpen"
                        className="w-full border border-shell-line bg-black/40 px-3 py-2 text-sm text-white outline-none rounded-none cursor-pointer focus:border-white/30 transition-colors"
                      >
                        <option value="true">Open</option>
                        <option value="false">Closed</option>
                      </select>
                    </div>
                  </div>

                  {/* Slogan & Accent Color */}
                  <div className="space-y-4 border border-white/5 bg-white/[0.02] p-4">
                    <div>
                      <label className="mb-1 block text-xs text-slate-355 uppercase tracking-wider font-semibold">League Slogan</label>
                      <input
                        name="slogan"
                        type="text"
                        placeholder="e.g. The Ultimate Endurance Challenge"
                        className="w-full border border-shell-line bg-black/40 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-white/30 rounded-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs text-slate-355 uppercase tracking-wider font-semibold">League Accent Color</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { name: 'Neon Blue', hex: '#1274de', bg: 'bg-[#1274de]' },
                          { name: 'Neon Pink', hex: '#ec4899', bg: 'bg-[#ec4899]' },
                          { name: 'Electric Lime', hex: '#84cc16', bg: 'bg-[#84cc16]' },
                          { name: 'Fire Orange', hex: '#f97316', bg: 'bg-[#f97316]' },
                          { name: 'Gold Yellow', hex: '#eab308', bg: 'bg-[#eab308]' },
                          { name: 'Acid Purple', hex: '#a855f7', bg: 'bg-[#a855f7]' },
                          { name: 'Electric Blue', hex: '#3b82f6', bg: 'bg-[#3b82f6]' },
                          { name: 'Emerald Green', hex: '#22c55e', bg: 'bg-[#22c55e]' },
                        ].map((color) => {
                          const isSelected = selectedAccent === color.hex
                          return (
                            <button
                              key={color.hex}
                              type="button"
                              onClick={() => setSelectedAccent(color.hex)}
                              className={`flex items-center gap-1.5 border px-2.5 py-1.5 text-[11px] font-bold tracking-wider uppercase transition-all rounded-none cursor-pointer ${
                                isSelected
                                  ? 'border-white bg-white/10 text-white'
                                  : 'border-white/10 bg-black/40 hover:bg-white/5 text-slate-400'
                              }`}
                            >
                              <span className={`h-2.5 w-2.5 rounded-full ${color.bg}`} />
                              {color.name}
                            </button>
                          )
                        })}
                      </div>
                      <input type="hidden" name="accentColor" value={selectedAccent} />
                    </div>
                  </div>

                  <ImagePicker name="bannerUrl" defaultValue="" label="League Banner Image" />

                  <ImagePicker name="logoUrl" defaultValue="" label="League Logo (Upper right badge)" />

                  {/* Buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-shell-line/50">
                    <button
                      type="button"
                      onClick={() => setIsCreateOpen(false)}
                      className="border border-shell-line bg-transparent hover:bg-white/5 px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-none transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-shell-accent hover:bg-red-700 disabled:bg-red-900/60 px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-none transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      {isSubmitting ? 'Saving...' : 'Create League'}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  )
}
