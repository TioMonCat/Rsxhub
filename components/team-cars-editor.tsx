'use client'

import { useState, useMemo } from 'react'
import { Plus, Trash, Users, ShieldAlert, Filter, Trophy, AlertTriangle } from 'lucide-react'

export type CarEntry = {
  id: string
  category: 'GT3' | 'LMP2' | 'HYPERCAR'
  dorsal: string // String representation: '0', '00', '000', '7', '07', '123'
  skinUrl: string
  driverUserIds: string[] // Up to 4 userIds
  leagueId?: string | null
}

export type TeamMemberOption = {
  userId: string
  name: string
  steamId?: string
}

export type TakenDorsal = {
  teamId: string
  teamName: string
  category: string
  dorsal: string
}

export type LeagueOption = {
  id: string
  slug: string
  title: string
  classTags: string[]
}

const CATEGORIES: Array<'GT3' | 'LMP2' | 'HYPERCAR'> = ['GT3', 'LMP2', 'HYPERCAR']

export function TeamCarsEditor({
  teamMembers,
  initialCars = [],
  takenDorsals = [],
  leaguesOptions = [],
  currentTeamId = '',
}: {
  teamMembers: TeamMemberOption[]
  initialCars: CarEntry[]
  takenDorsals?: TakenDorsal[]
  leaguesOptions?: LeagueOption[]
  currentTeamId?: string
}) {
  const [cars, setCars] = useState<CarEntry[]>(() => {
    if (initialCars && initialCars.length > 0) {
      return initialCars.map((car) => ({
        id: car.id || `car_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        category: car.category || 'GT3',
        dorsal: String(car.dorsal || '').trim(),
        skinUrl: car.skinUrl || '',
        driverUserIds: Array.isArray(car.driverUserIds)
          ? [...car.driverUserIds, '', '', '', ''].slice(0, 4)
          : ['', '', '', ''],
        leagueId: car.leagueId || null,
      }))
    }
    return []
  })

  // Selected Filter Tab: 'all' or league.id
  const [activeTab, setActiveTab] = useState<string>('all')

  // Set of all assigned drivers across ALL cars
  const assignedDriverUserIds = useMemo(() => {
    const set = new Set<string>()
    for (const car of cars) {
      for (const driverId of car.driverUserIds) {
        if (driverId && driverId.trim() !== '') {
          set.add(driverId.trim())
        }
      }
    }
    return set
  }, [cars])

  // Dorsal Uniqueness Map and Validation
  const dorsalValidation = useMemo(() => {
    const errors: Record<string, string> = {}
    const teamDorsalCount: Record<string, string[]> = {}

    // First pass: collect dorsals within current team
    for (const car of cars) {
      const d = String(car.dorsal || '').trim()
      if (d) {
        if (!teamDorsalCount[d]) teamDorsalCount[d] = []
        teamDorsalCount[d].push(car.id)
      }
    }

    // Second pass: validate each car
    for (const car of cars) {
      const d = String(car.dorsal || '').trim()
      if (!d) continue

      // Check format (digits only, max 3 digits)
      if (!/^[0-9]{1,3}$/.test(d)) {
        errors[car.id] = 'El dorsal debe ser de máximo 3 dígitos numéricos (ej: 0, 00, 000, 77).'
        continue
      }

      // Check duplicate within current team
      if (teamDorsalCount[d] && teamDorsalCount[d].length > 1) {
        errors[car.id] = `El dorsal #${d} está repetido en otro vehículo de tu equipo.`
        continue
      }

      // Check taken by another team
      const takenByOther = takenDorsals.find(
        (td) => td.teamId !== currentTeamId && td.dorsal.trim() === d
      )
      if (takenByOther) {
        errors[car.id] = `El dorsal #${d} ya está registrado por el equipo "${takenByOther.teamName}".`
      }
    }

    return errors
  }, [cars, takenDorsals, currentTeamId])

  const hasErrors = Object.keys(dorsalValidation).length > 0

  const serialized = useMemo(() => {
    const cleaned = cars.map((car) => ({
      id: car.id,
      category: car.category,
      dorsal: String(car.dorsal || '').trim(),
      skinUrl: String(car.skinUrl || '').trim(),
      driverUserIds: (car.driverUserIds || [])
        .map((id) => String(id || '').trim())
        .slice(0, 4),
      leagueId: car.leagueId || null,
    }))
    return JSON.stringify(cleaned)
  }, [cars])

  const addCar = (category: 'GT3' | 'LMP2' | 'HYPERCAR', defaultLeagueId?: string | null) => {
    setCars((prev) => [
      ...prev,
      {
        id: `car_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        category,
        dorsal: '',
        skinUrl: '',
        driverUserIds: ['', '', '', ''],
        leagueId: defaultLeagueId || (activeTab === 'all' ? null : activeTab),
      },
    ])
  }

  const removeCar = (id: string) => {
    setCars((prev) => prev.filter((car) => car.id !== id))
  }

  const updateCarField = (id: string, field: keyof CarEntry, value: any) => {
    setCars((prev) =>
      prev.map((car) => (car.id === id ? { ...car, [field]: value } : car))
    )
  }

  const updateCarDriver = (id: string, driverIndex: number, userId: string) => {
    setCars((prev) =>
      prev.map((car) => {
        if (car.id !== id) return car
        const updatedDrivers = [...car.driverUserIds]
        updatedDrivers[driverIndex] = userId
        return { ...car, driverUserIds: updatedDrivers }
      })
    )
  }

  const categories: Array<'GT3' | 'LMP2' | 'HYPERCAR'> = ['GT3', 'LMP2', 'HYPERCAR']

  const categoryThemes: Record<string, {
    text: string
    border: string
    focus: string
    icon: string
    addBtn: string
    headerText: string
    cardBorder: string
    glow: string
    badge: string
  }> = {
    HYPERCAR: {
      text: 'text-rose-400 font-extrabold',
      border: 'border-rose-500/20',
      focus: 'focus:border-rose-400 focus:ring-1 focus:ring-rose-500/30',
      icon: 'text-rose-400',
      addBtn: 'border-rose-500/40 bg-rose-950/30 hover:bg-rose-500 hover:text-white hover:border-rose-400 text-rose-300 font-bold',
      headerText: 'text-rose-400 font-black tracking-wider',
      cardBorder: 'border-slate-800 bg-black/40 hover:border-slate-700',
      glow: 'border-shell-line bg-black/20',
      badge: 'border-rose-500/40 bg-rose-950/50 text-rose-300'
    },
    LMP2: {
      text: 'text-blue-400 font-extrabold',
      border: 'border-blue-500/20',
      focus: 'focus:border-blue-400 focus:ring-1 focus:ring-blue-500/30',
      icon: 'text-blue-400',
      addBtn: 'border-blue-500/40 bg-blue-950/30 hover:bg-blue-500 hover:text-white hover:border-blue-400 text-blue-300 font-bold',
      headerText: 'text-blue-400 font-black tracking-wider',
      cardBorder: 'border-slate-800 bg-black/40 hover:border-slate-700',
      glow: 'border-shell-line bg-black/20',
      badge: 'border-blue-500/40 bg-blue-950/50 text-blue-300'
    },
    GT3: {
      text: 'text-emerald-400 font-extrabold',
      border: 'border-emerald-500/20',
      focus: 'focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/30',
      icon: 'text-emerald-400',
      addBtn: 'border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-500 hover:text-white hover:border-emerald-400 text-emerald-300 font-bold',
      headerText: 'text-emerald-400 font-black tracking-wider',
      cardBorder: 'border-slate-800 bg-black/40 hover:border-slate-700',
      glow: 'border-shell-line bg-black/20',
      badge: 'border-emerald-500/40 bg-emerald-950/50 text-emerald-300'
    }
  }

  // Active League Info
  const activeLeague = leaguesOptions.find((l) => l.id === activeTab || l.slug === activeTab)

  // Filter cars depending on active tab
  const filteredCars = useMemo(() => {
    if (activeTab === 'all') return cars

    return cars.filter((car) => {
      // If car explicitly assigned to this league
      if (car.leagueId && (car.leagueId === activeTab || car.leagueId === activeLeague?.slug)) return true

      // If car has no explicit league assigned, check if category matches league classTags
      if (!car.leagueId && activeLeague?.classTags && activeLeague.classTags.length > 0) {
        return activeLeague.classTags.some((tag) => tag.toUpperCase() === car.category.toUpperCase())
      }

      return false
    })
  }, [cars, activeTab, activeLeague])

  // Filter available categories based on active league
  const availableCategories = useMemo(() => {
    if (activeTab === 'all' || !activeLeague || !activeLeague.classTags || activeLeague.classTags.length === 0) {
      return CATEGORIES
    }
    const leagueTags = activeLeague.classTags.map((t) => t.toUpperCase())
    const filtered = CATEGORIES.filter((cat) => leagueTags.includes(cat.toUpperCase()))
    return filtered.length > 0 ? filtered : CATEGORIES
  }, [activeTab, activeLeague])

  return (
    <div className="space-y-6">
      <input type="hidden" name="teamCarsJson" value={serialized} />

      {/* Tabs Header */}
      <div className="border border-shell-line bg-[#0c121e]/80 p-3 rounded-none space-y-2">
        <div className="flex items-center justify-between border-b border-shell-line/40 pb-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Gestión por Ligas & Filtros
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            {cars.length} {cars.length === 1 ? 'Vehículo total' : 'Vehículos totales'}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {/* Main / All Cars Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-none transition-all cursor-pointer border ${
              activeTab === 'all'
                ? 'border-cyan-500 bg-cyan-950/60 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                : 'border-slate-800 bg-black/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <Trophy className="h-3.5 w-3.5" />
            Principal (Todos)
            <span className="ml-1 text-[10px] px-1.5 py-0.2 bg-black/60 rounded border border-current">
              {cars.length}
            </span>
          </button>

          {/* Per-League Tabs */}
          {leaguesOptions.map((league) => {
            const count = cars.filter((c) => {
              if (c.leagueId === league.id || c.leagueId === league.slug) return true
              if (!c.leagueId && league.classTags) {
                return league.classTags.some((t) => t.toUpperCase() === c.category.toUpperCase())
              }
              return false
            }).length

            const isActive = activeTab === league.id || activeTab === league.slug

            return (
              <button
                key={league.id}
                type="button"
                onClick={() => setActiveTab(league.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-none transition-all cursor-pointer border ${
                  isActive
                    ? 'border-amber-500 bg-amber-950/60 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                    : 'border-slate-800 bg-black/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {league.title}
                <span className="ml-1 text-[10px] px-1.5 py-0.2 bg-black/60 rounded border border-current">
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Global Validation Warning Banner */}
      {hasErrors && (
        <div className="border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-200 flex items-start gap-2.5 rounded-none animate-pulse">
          <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-extrabold uppercase tracking-wider block">
              Atención: Conflicto en números / dorsales
            </span>
            <p className="text-[11px] text-rose-300">
              Hay dorsales duplicados o no válidos. Por favor, asegúrate de que los números sean únicos (ej: 0, 00, 000, 07, 77) y de máximo 3 dígitos.
            </p>
          </div>
        </div>
      )}

      {/* Categories & Vehicles */}
      {availableCategories.map((category) => {
        const categoryCars = filteredCars.filter((car) => car.category === category)
        const theme = categoryThemes[category] || {
          text: 'text-cyan-400 font-bold',
          border: 'border-cyan-500/20',
          focus: 'focus:border-cyan-400',
          icon: 'text-cyan-400',
          addBtn: 'border-shell-line bg-white/5 hover:bg-white/10 text-white',
          headerText: 'text-cyan-400',
          cardBorder: 'border-shell-line/60 bg-black/35',
          glow: 'border-shell-line bg-black/10',
          badge: 'border-cyan-500/40 bg-cyan-950/40 text-cyan-300'
        }

        return (
          <div key={category} className={`border p-4 rounded-none space-y-4 transition-all ${theme.glow}`}>
            <div className={`flex items-center justify-between border-b pb-2 ${theme.border}`}>
              <h3 className={`text-sm uppercase italic tracking-wider ${theme.headerText}`}>
                {category} Category
              </h3>
              <span className={`text-[10px] font-mono not-italic px-2.5 py-0.5 rounded-none border font-bold ${theme.badge}`}>
                {categoryCars.length} {categoryCars.length === 1 ? 'VEHÍCULO' : 'VEHÍCULOS'}
              </span>
            </div>

            {categoryCars.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                No hay vehículos configurados en la categoría {category} {activeTab !== 'all' ? 'para esta liga' : ''}.
              </p>
            ) : (
              <div className="space-y-4">
                {categoryCars.map((car) => {
                  const errorMsg = dorsalValidation[car.id]
                  return (
                    <div
                      key={car.id}
                      className={`border p-4 rounded-none relative space-y-3 transition-all ${
                        errorMsg ? 'border-rose-500 bg-rose-950/20' : theme.cardBorder
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => removeCar(car.id)}
                        className="absolute top-4 right-4 text-rose-400 hover:text-rose-300 p-1 cursor-pointer transition-colors"
                        title="Eliminar Vehículo"
                      >
                        <Trash className="h-4 w-4" />
                      </button>

                      <div className="grid gap-3 md:grid-cols-3">
                        {/* Car Number / Dorsal (Max 3 Digits: 0, 00, 000) */}
                        <div>
                          <label className="mb-1 block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                            Dorsal / Número (#0, #00, #000)
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={3}
                            value={car.dorsal}
                            onChange={(e) => {
                              // Only allow digits 0-9, max 3 chars
                              const clean = e.target.value.replace(/[^0-9]/g, '').slice(0, 3)
                              updateCarField(car.id, 'dorsal', clean)
                            }}
                            placeholder="Ej: 0, 00, 000, 77"
                            className={`w-full border bg-black/50 px-3 py-1.5 text-xs text-white outline-none rounded-none transition-colors font-mono ${
                              errorMsg
                                ? 'border-rose-500 focus:border-rose-400'
                                : `${theme.border} ${theme.focus}`
                            }`}
                          />
                          {errorMsg && (
                            <p className="text-[10px] text-rose-400 font-semibold mt-1 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              {errorMsg}
                            </p>
                          )}
                        </div>

                        {/* Skin URL */}
                        <div>
                          <label className="mb-1 block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                            URL de Descarga de Skin
                          </label>
                          <input
                            type="text"
                            required
                            value={car.skinUrl}
                            onChange={(e) => updateCarField(car.id, 'skinUrl', e.target.value)}
                            placeholder="Ej: https://mega.nz/file/..."
                            className={`w-full border bg-black/50 px-3 py-1.5 text-xs text-white outline-none rounded-none transition-colors ${theme.border} ${theme.focus}`}
                          />
                        </div>

                        {/* League Assignment Filter Tag */}
                        <div>
                          <label className="mb-1 block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                            Asignar a Liga (Opcional)
                          </label>
                          <select
                            value={car.leagueId || ''}
                            onChange={(e) => updateCarField(car.id, 'leagueId', e.target.value || null)}
                            className={`w-full border bg-black/50 px-2 py-1.5 text-[11px] text-slate-200 outline-none rounded-none cursor-pointer ${theme.border} ${theme.focus}`}
                          >
                            <option value="">-- Todas las ligas --</option>
                            {leaguesOptions.map((l) => (
                              <option key={l.id} value={l.id}>
                                {l.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Driver Slots (Excludes already selected drivers from other slots) */}
                      <div className="space-y-1.5 pt-1">
                        <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1">
                          <Users className={`h-3 w-3 ${theme.icon}`} />
                          Pilotos Asignados (Máximo 4)
                        </label>
                        <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
                          {[0, 1, 2, 3].map((driverIdx) => {
                            const currentVal = car.driverUserIds[driverIdx] || ''

                            return (
                              <select
                                key={driverIdx}
                                value={currentVal}
                                onChange={(e) => updateCarDriver(car.id, driverIdx, e.target.value)}
                                className={`w-full border bg-black/60 px-2 py-1.5 text-[11px] text-slate-200 outline-none rounded-none cursor-pointer ${theme.border} ${theme.focus}`}
                              >
                                <option value="">-- Vacante --</option>
                                {teamMembers.map((m) => {
                                  // Exclude driver if assigned to another slot/car
                                  const isAssignedElsewhere =
                                    assignedDriverUserIds.has(m.userId) && m.userId !== currentVal

                                  if (isAssignedElsewhere) return null

                                  return (
                                    <option key={m.userId} value={m.userId}>
                                      {m.name} {m.steamId ? `(${m.steamId})` : ''}
                                    </option>
                                  )
                                })}
                              </select>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Add Car Button */}
            <button
              type="button"
              onClick={() => addCar(category, activeTab === 'all' ? null : activeTab)}
              className={`flex items-center gap-1.5 border px-3.5 py-2 text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer transition-colors ${theme.addBtn}`}
            >
              <Plus className="h-3.5 w-3.5" />
              Añadir Vehículo {category}
            </button>
          </div>
        )
      })}
    </div>
  )
}

