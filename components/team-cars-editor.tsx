'use client'

import { useState, useMemo, useCallback } from 'react'
import { Plus, Trash, Users, ShieldAlert, Filter, Trophy, AlertTriangle, Upload, FileArchive } from 'lucide-react'

export type CarEntry = {
  id: string
  category: 'GT3' | 'LMP2' | 'HYPERCAR'
  dorsal: string // String representation: '0', '00', '000', '7', '07', '123'
  skinUrl: string
  driverUserIds: string[] // All assigned drivers across all leagues
  driverUserIdsByLeague?: Record<string, string[]> // Mapping: leagueId -> driverUserIds[]
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
  maxDriversPerCar?: number
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
      return initialCars.map((car) => {
        const byLeague: Record<string, string[]> = car.driverUserIdsByLeague || {}
        // If byLeague is empty and car has driverUserIds and a leagueId, initialize it
        if (Object.keys(byLeague).length === 0 && Array.isArray(car.driverUserIds)) {
          if (car.leagueId) {
            byLeague[car.leagueId] = [...car.driverUserIds]
          }
        }
        return {
          id: car.id || `car_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          category: car.category || 'GT3',
          dorsal: String(car.dorsal || '').trim(),
          skinUrl: car.skinUrl || '',
          driverUserIds: Array.isArray(car.driverUserIds) ? car.driverUserIds.filter(Boolean) : [],
          driverUserIdsByLeague: byLeague,
          leagueId: car.leagueId || null,
        }
      })
    }
    return []
  })

  // Selected Filter Tab: 'all' or league.id / league.slug
  const [activeTab, setActiveTab] = useState<string>('all')
  const [uploadingCarId, setUploadingCarId] = useState<string | null>(null)

  const handleSkinFileUpload = async (carId: string, file: File) => {
    if (!file) return

    const isArchive = /\.(zip|rar|7z|tar|gz|tgz)$/i.test(file.name)
    if (!isArchive) {
      alert('Únicamente se permiten archivos comprimidos (.zip, .rar, .7z, .tar.gz)')
      return
    }

    setUploadingCarId(carId)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'skin')

      const res = await fetch('/api/uploads', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        alert(data.error || 'Error al subir el archivo de skin comprimido.')
        return
      }

      if (data.url) {
        updateCarField(carId, 'skinUrl', data.url)
      }
    } catch (err) {
      console.error('Skin upload failed:', err)
      alert('Error al conectar con el servidor para subir el archivo.')
    } finally {
      setUploadingCarId(null)
    }
  }

  // Active League Info
  const activeLeague = useMemo(() => {
    return leaguesOptions.find((l) => l.id === activeTab || l.slug === activeTab)
  }, [leaguesOptions, activeTab])

  // Helper to resolve drivers for a specific league tab
  const getCarDriversForLeague = useCallback((car: CarEntry, leagueKey: string): string[] => {
    if (!leagueKey || leagueKey === 'all') {
      return car.driverUserIds || []
    }
    const byLeague = car.driverUserIdsByLeague || {}
    const list = byLeague[leagueKey] || byLeague[activeLeague?.id || ''] || byLeague[activeLeague?.slug || ''] || []
    return [...list, '', '', '', ''].slice(0, activeLeague?.maxDriversPerCar ?? 4)
  }, [activeLeague])

  // Set of assigned drivers for the CURRENT active league tab
  const assignedDriverUserIds = useMemo(() => {
    const set = new Set<string>()
    for (const car of cars) {
      const leagueDrivers = getCarDriversForLeague(car, activeTab)
      for (const driverId of leagueDrivers) {
        if (driverId && driverId.trim() !== '') {
          set.add(driverId.trim())
        }
      }
    }
    return set
  }, [cars, activeTab, getCarDriversForLeague])

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
      driverUserIds: (car.driverUserIds || []).map((id) => String(id || '').trim()).filter(Boolean),
      driverUserIdsByLeague: car.driverUserIdsByLeague || {},
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
        driverUserIds: [],
        driverUserIdsByLeague: {},
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

  const updateCarDriver = (id: string, leagueKey: string, driverIndex: number, userId: string) => {
    setCars((prev) =>
      prev.map((car) => {
        if (car.id !== id) return car

        const currentByLeague = { ...(car.driverUserIdsByLeague || {}) }
        const targetLeagueKey = (!leagueKey || leagueKey === 'all')
          ? (activeLeague?.id || activeLeague?.slug || car.leagueId || 'default')
          : leagueKey

        const maxSlots = activeLeague?.maxDriversPerCar ?? 4
        const currentList = [...(currentByLeague[targetLeagueKey] || [])]
        while (currentList.length < maxSlots) currentList.push('')

        currentList[driverIndex] = userId
        currentByLeague[targetLeagueKey] = currentList

        // Recompute flat union of all assigned drivers across all leagues
        const allDriversSet = new Set<string>()
        Object.values(currentByLeague).forEach((arr) => {
          if (Array.isArray(arr)) {
            arr.forEach((d) => {
              if (d && d.trim() !== '') allDriversSet.add(d.trim())
            })
          }
        })

        return {
          ...car,
          driverUserIdsByLeague: currentByLeague,
          driverUserIds: Array.from(allDriversSet),
        }
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

      {/* Tabs Header Container */}
      <div className="bg-[#0f172a]/90 border border-slate-800/80 p-4 rounded-xl shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider font-extrabold text-cyan-400 flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtrar Vehículos por Liga
          </p>
          <span className="text-[11px] text-slate-400 font-mono font-bold">
            {cars.length} Vehículos totales
          </span>
        </div>

        {/* League Selection Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* Main Tab (All Cars Preview) */}
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
              activeTab === 'all'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                : 'bg-[#131d31]/60 border-slate-700/80 text-slate-400 hover:text-white hover:border-slate-600'
            }`}
          >
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
            <span>Principal (Todos los coches)</span>
            <span className="ml-1 bg-black/40 text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-mono">
              {cars.length}
            </span>
          </button>

          {/* Per-League Filter Tabs */}
          {leaguesOptions.map((league) => {
            const count = cars.filter((c) => {
              if (c.leagueId) return c.leagueId === league.id || c.leagueId === league.slug
              if (league.classTags) {
                return league.classTags.some((tag) => tag.toUpperCase() === c.category.toUpperCase())
              }
              return false
            }).length

            const isSelected = activeTab === league.id || activeTab === league.slug

            return (
              <button
                key={league.id}
                type="button"
                onClick={() => setActiveTab(league.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                    : 'bg-[#131d31]/60 border-slate-700/80 text-slate-400 hover:text-white hover:border-slate-600'
                }`}
              >
                <span>{league.title}</span>
                <span className="ml-1 bg-black/40 text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-mono">
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {hasErrors && (
        <div className="bg-rose-950/40 border border-rose-500/50 p-4 rounded-xl flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs text-rose-200">
            <p className="font-bold">Hay errores en la configuración de tus vehículos:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              {Object.values(dorsalValidation).map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Render Cars Grouped by Category */}
      {availableCategories.map((category) => {
        const categoryCars = filteredCars.filter((c) => c.category === category)
        const theme = categoryThemes[category]

        return (
          <div key={category} className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className={`text-sm ${theme.headerText} flex items-center gap-2`}>
                <span className={`px-2 py-0.5 rounded text-xs border ${theme.badge}`}>
                  {category} CATEGORY
                </span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {categoryCars.length} vehículos
              </span>
            </div>

            {categoryCars.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2 pl-2">
                No hay vehículos de categoría {category} registrados en esta vista.
              </p>
            ) : (
              <div className="space-y-4">
                {categoryCars.map((car) => {
                  const errorMsg = dorsalValidation[car.id]
                  const carLeagueDrivers = getCarDriversForLeague(car, activeTab)

                  return (
                    <div
                      key={car.id}
                      className={`bg-[#131d31]/80 border rounded-xl p-4 relative space-y-4 transition-all shadow-sm ${
                        errorMsg
                          ? 'border-rose-500/80 bg-rose-950/20 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                          : 'border-slate-700/60 hover:border-slate-600'
                      }`}
                    >
                      {/* Item Top Bar */}
                      <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                            Coche <span className={`font-black font-mono text-sm ${theme.text}`}>#{car.dorsal || '---'}</span>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCar(car.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-800/50 hover:bg-rose-950/40 border border-slate-700/50 hover:border-rose-500/40 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[11px]"
                          title="Eliminar Vehículo"
                        >
                          <Trash className="h-3.5 w-3.5" />
                          <span>Eliminar</span>
                        </button>
                      </div>

                      {/* Item Inputs Grid */}
                      <div className="grid gap-3 md:grid-cols-3">
                        {/* Car Number / Dorsal */}
                        <div>
                          <label className="mb-1 block text-[11px] text-slate-300 font-semibold uppercase tracking-wider">
                            Dorsal / Número (#0, #00, #000)
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={3}
                            value={car.dorsal}
                            onChange={(e) => {
                              const clean = e.target.value.replace(/[^0-9]/g, '').slice(0, 3)
                              updateCarField(car.id, 'dorsal', clean)
                            }}
                            placeholder="ej. 0, 00, 000, 77"
                            className={`w-full bg-[#0a0f1d] border text-xs text-white rounded-lg px-3 py-2 outline-none font-mono transition-all shadow-inner ${
                              errorMsg
                                ? 'border-rose-500 focus:border-rose-400'
                                : 'border-slate-700 focus:border-cyan-400'
                            }`}
                          />
                          {errorMsg && (
                            <p className="text-[10px] text-rose-400 font-medium mt-1 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              {errorMsg}
                            </p>
                          )}
                        </div>

                        {/* Compressed Skin File Upload */}
                        <div>
                          <label className="mb-1 text-[11px] text-slate-300 font-semibold uppercase tracking-wider flex items-center justify-between">
                            <span>Skin Comprimido (.zip, .rar)</span>
                            {uploadingCarId === car.id && (
                              <span className="text-[10px] text-cyan-400 font-normal animate-pulse">Subiendo...</span>
                            )}
                          </label>

                          {car.skinUrl ? (
                            <div className="flex items-center gap-2 bg-[#0a0f1d] border border-emerald-500/50 rounded-lg px-3 py-1.5 text-xs text-emerald-300 min-w-0">
                              <FileArchive className="h-4 w-4 shrink-0 text-emerald-400" />
                              <span className="truncate flex-1 font-mono text-[11px]" title={car.skinUrl}>
                                {car.skinUrl.split('/').pop() || 'skin.zip'}
                              </span>
                              <label className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 hover:text-cyan-300 cursor-pointer underline shrink-0 ml-1">
                                Cambiar
                                <input
                                  type="file"
                                  accept=".zip,.rar,.7z,.tar,.tar.gz,.gz"
                                  className="hidden"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0]
                                    if (f) handleSkinFileUpload(car.id, f)
                                  }}
                                />
                              </label>
                            </div>
                          ) : (
                            <label className={`w-full flex items-center justify-center gap-2 bg-[#0a0f1d] border border-dashed rounded-lg px-3 py-1.5 text-xs cursor-pointer transition-all ${
                              uploadingCarId === car.id
                                ? 'border-cyan-500/50 text-cyan-300 bg-cyan-950/20'
                                : 'border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white'
                            }`}>
                              <Upload className="h-4 w-4 text-cyan-400" />
                              <span className="font-medium text-[11px]">
                                {uploadingCarId === car.id ? 'Subiendo skin...' : 'Subir .zip / .rar'}
                              </span>
                              <input
                                type="file"
                                accept=".zip,.rar,.7z,.tar,.tar.gz,.gz"
                                className="hidden"
                                disabled={uploadingCarId === car.id}
                                onChange={(e) => {
                                  const f = e.target.files?.[0]
                                  if (f) handleSkinFileUpload(car.id, f)
                                }}
                              />
                            </label>
                          )}
                        </div>

                        {/* League Assignment Filter Tag */}
                        <div>
                          <label className="mb-1 block text-[11px] text-slate-300 font-semibold uppercase tracking-wider">
                            Asignar a Liga
                          </label>
                          <select
                            value={car.leagueId || ''}
                            onChange={(e) => updateCarField(car.id, 'leagueId', e.target.value || null)}
                            className="w-full bg-[#0a0f1d] border border-slate-700 focus:border-cyan-400 text-xs text-slate-200 rounded-lg px-3 py-2 outline-none cursor-pointer transition-all"
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

                      {/* Driver Slots Container - ONLY shown when filtering by a specific league */}
                      {activeTab !== 'all' && (
                        <div className="bg-[#0a0f1d]/80 border border-slate-800 rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5 text-cyan-400" />
                              Pilotos Asignados a la Liga ({activeLeague?.title || 'Liga'})
                            </label>
                            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded">
                              Máx. {activeLeague?.maxDriversPerCar ?? 4} Pilotos por Coche
                            </span>
                          </div>

                          <div className={`grid gap-2 grid-cols-2 ${
                            (activeLeague?.maxDriversPerCar ?? 4) > 2 ? 'md:grid-cols-4' : 'md:grid-cols-2'
                          }`}>
                            {Array.from({ length: activeLeague?.maxDriversPerCar ?? 4 }, (_, driverIdx) => {
                              const currentVal = carLeagueDrivers[driverIdx] || ''

                              return (
                                <select
                                  key={driverIdx}
                                  value={currentVal}
                                  onChange={(e) => updateCarDriver(car.id, activeTab, driverIdx, e.target.value)}
                                  className="w-full bg-[#131d31] border border-slate-700/70 focus:border-cyan-400 text-slate-200 rounded-md px-2.5 py-1.5 text-xs outline-none cursor-pointer hover:border-slate-600 transition-all"
                                >
                                  <option value="">-- Vacante --</option>
                                  {teamMembers.map((m) => {
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
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Add Car Button */}
            <button
              type="button"
              onClick={() => addCar(category, activeTab === 'all' ? null : activeTab)}
              className="w-full py-2.5 px-4 rounded-xl border border-dashed border-slate-700 hover:border-emerald-500/60 bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-400 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Añadir Vehículo {category}
            </button>
          </div>
        )
      })}
    </div>
  )
}
