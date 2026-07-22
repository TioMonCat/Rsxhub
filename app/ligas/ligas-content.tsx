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
          <SectionTitle title="LEAGUES" subtitle="Filter by sim, status and format just like a race browser." />
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

                  {/* SECTION 1: General Info */}
                  <div className="space-y-4 bg-black/30 p-4 border border-shell-line/40">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-cyan-400 border-b border-cyan-500/20 pb-1.5">
                      1. Información Principal & Títulos
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">Nombre de la Liga (Title) *</label>
                        <input
                          name="title"
                          type="text"
                          required
                          placeholder="e.g. ALR GT3 Sprint Series"
                          className="w-full border border-shell-line bg-black/60 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400 font-bold"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">Abreviatura / URL (Slug)</label>
                        <input
                          name="slug"
                          type="text"
                          placeholder="e.g. alr-gt3-sprint"
                          className="w-full border border-shell-line bg-black/60 px-3 py-2 text-xs text-cyan-300 outline-none rounded-none focus:border-cyan-400 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: Rules, Simulator & Format */}
                  <div className="space-y-4 bg-black/30 p-4 border border-shell-line/40">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-cyan-400 border-b border-cyan-500/20 pb-1.5">
                      2. Simulador, Formato & Estado de la Liga
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">Simulador</label>
                        <select
                          name="simulator"
                          required
                          className="w-full border border-shell-line bg-black/60 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400 font-semibold"
                        >
                          <option value="ac">Assetto Corsa</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">Formato</label>
                        <select
                          name="format"
                          required
                          className="w-full border border-shell-line bg-black/60 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400 font-semibold"
                        >
                          <option value="endurance">Endurance (Resistencia)</option>
                          <option value="sprint">Sprint</option>
                          <option value="championship">Championship (Campeonato)</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">Estado de la Liga</label>
                        <select
                          name="status"
                          defaultValue="open"
                          className="w-full border border-shell-line bg-black/60 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400 font-semibold"
                        >
                          <option value="open">Abiertas (Cualquier equipo nuevo se puede inscribir)</option>
                          <option value="completed">Cerrada (Ningún equipo nuevo puede entrar)</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-2">
                      <div>
                        <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">Modo de Inscripción</label>
                        <select
                          name="registrationMode"
                          defaultValue="team"
                          className="w-full border border-shell-line bg-black/60 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400"
                        >
                          <option value="team">Por Escudería / Equipo (Team Registration)</option>
                          <option value="individual">Por Piloto Individual (Individual Entry)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: Categories, Max Slots & Color Palette */}
                  <div className="space-y-4 bg-black/30 p-4 border border-shell-line/40">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-cyan-400 border-b border-cyan-500/20 pb-1.5">
                      3. Categorías, Slot Máximos, Color Visual & Fechas
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Category Selection & Max Slots */}
                      <div>
                        <label className="mb-1.5 block text-xs text-slate-300 uppercase font-semibold">Categorías & Slot Máximos por Categoría</label>
                        <div className="grid grid-cols-1 gap-2.5 bg-black/60 p-3 border border-shell-line/50">
                          {['GT3', 'HYPERCAR', 'LMP2'].map((cat) => {
                            const isChecked = selectedTags.includes(cat)
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
                                    onChange={() => handleTagToggle(cat)}
                                    className="h-4 w-4 accent-cyan-400 cursor-pointer"
                                  />
                                  <span>{cat}</span>
                                </label>

                                {isChecked && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Max Cars:</span>
                                    <input
                                      type="number"
                                      name={`max_cars_${cat}`}
                                      defaultValue={30}
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
                        <input type="hidden" name="classTags" value={selectedTags.join(', ')} />
                      </div>

                      {/* Predefined Color Palette */}
                      <div>
                        <label className="mb-1.5 block text-xs text-slate-300 uppercase font-semibold">Color Visual de la Liga (Paleta de Colores)</label>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap bg-black/60 p-2.5 border border-shell-line/50">
                            {[
                              { name: 'Cyan Neón', hex: '#00f2fe' },
                              { name: 'Rojo Carrera', hex: '#ff3b30' },
                              { name: 'Azul Eléctrico', hex: '#1274de' },
                              { name: 'Verde Esmeralda', hex: '#10b981' },
                              { name: 'Naranja Hyper', hex: '#ff6b00' },
                              { name: 'Púrpura Neón', hex: '#a855f7' },
                            ].map((color) => (
                              <button
                                key={color.hex}
                                type="button"
                                onClick={() => setSelectedAccent(color.hex)}
                                title={color.name}
                                className={`h-7 w-7 rounded-none transition-transform border ${
                                  selectedAccent.toLowerCase() === color.hex.toLowerCase()
                                    ? 'scale-125 border-white ring-2 ring-cyan-400 shadow-[0_0_10px_rgba(0,242,254,0.6)] z-10'
                                    : 'border-white/20 hover:scale-110'
                                }`}
                                style={{ backgroundColor: color.hex }}
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 font-mono">Personalizado:</span>
                            <input
                              type="text"
                              name="accentColor"
                              value={selectedAccent}
                              onChange={(e) => setSelectedAccent(e.target.value)}
                              className="w-28 border border-shell-line bg-black/60 px-2.5 py-1 text-xs text-white font-mono outline-none rounded-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">Fecha de Inicio *</label>
                        <input
                          name="startsAt"
                          type="date"
                          required
                          className="w-full border border-shell-line bg-black/60 px-3 py-2 text-xs text-white font-mono outline-none rounded-none focus:border-cyan-400"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">Fecha de Finalización *</label>
                        <input
                          name="endsAt"
                          type="date"
                          required
                          className="w-full border border-shell-line bg-black/60 px-3 py-2 text-xs text-white font-mono outline-none rounded-none focus:border-cyan-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 4: Media & Banner */}
                  <div className="space-y-4 bg-black/30 p-4 border border-shell-line/40">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-cyan-400 border-b border-cyan-500/20 pb-1.5">
                      4. Imagen de Portada de la Liga
                    </h3>
                    <div>
                      <ImagePicker
                        name="bannerUrl"
                        defaultValue=""
                        label="Imagen de Banner de la Liga (Cabecera Principal)"
                      />
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-shell-line/50">
                    <button
                      type="button"
                      onClick={() => setIsCreateOpen(false)}
                      className="border border-shell-line bg-transparent hover:bg-white/5 px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-none transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-900/60 text-black font-extrabold px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-none transition-colors flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(0,242,254,0.3)]"
                    >
                      {isSubmitting ? 'Creando Liga...' : 'Crear Liga'}
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
