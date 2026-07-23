'use client'

import { useState, useMemo } from 'react'
import { Plus, Trash, Users, ShieldAlert, Filter, Trophy, AlertTriangle, Upload, FileArchive } from 'lucide-react'

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

      {/* Tabs Header Container */}
      <div className="bg-[#0f172a]/90 border border-slate-800/80 p-4 rounded-xl shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Filtrar Vehículos por Liga
            </span>
          </div>
          <span className="text-[11px] font-medium text-cyan-400 bg-cyan-950/50 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
            {cars.length} {cars.length === 1 ? 'Vehículo total' : 'Vehículos totales'}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-800/60">
          {/* Main / All Cars Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border ${
              activeTab === 'all'
                ? 'border-cyan-400/80 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <Trophy className="h-3.5 w-3.5" />
            Principal (Todos los coches)
            <span className="text-[10px] px-1.5 py-0.2 bg-black/50 rounded-md font-mono border border-white/10">
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
                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border ${
                  isActive
                    ? 'border-amber-400/80 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {league.title}
                <span className="text-[10px] px-1.5 py-0.2 bg-black/50 rounded-md font-mono border border-white/10">
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Global Validation Warning Banner */}
      {hasErrors && (
        <div className="border border-rose-500/50 bg-rose-950/40 p-3.5 rounded-xl text-xs text-rose-200 flex items-start gap-3 shadow-md animate-pulse">
          <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-rose-300 uppercase tracking-wider block">
              Conflicto en números de vehículos
            </span>
            <p className="text-[11px] text-rose-200/90 leading-relaxed">
              Hay dorsales repetidos o no válidos. Asegúrate de que los números sean únicos (ej: 0, 00, 000, 07, 77) y de máximo 3 dígitos.
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
          addBtn: 'border-slate-700 bg-slate-900 hover:bg-slate-800 text-white',
          headerText: 'text-cyan-400',
          cardBorder: 'border-slate-800 bg-slate-900/50',
          glow: 'border-slate-800 bg-slate-950/40',
          badge: 'border-cyan-500/40 bg-cyan-950/40 text-cyan-300'
        }

        return (
          <div key={category} className="bg-[#0b1120]/90 border border-slate-800/90 rounded-xl p-4 shadow-md space-y-4">
            {/* Category Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-md border ${theme.badge}`}>
                  {category} CATEGORY
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-900/80 border border-slate-800 px-2.5 py-1 rounded-md">
                {categoryCars.length} {categoryCars.length === 1 ? 'vehículo' : 'vehículos'}
              </span>
            </div>

            {categoryCars.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2 text-center">
                No hay vehículos configurados en la categoría <strong className="text-slate-400">{category}</strong> {activeTab !== 'all' ? 'para esta liga' : ''}.
              </p>
            ) : (
              <div className="space-y-4">
                {categoryCars.map((car) => {
                  const errorMsg = dorsalValidation[car.id]
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

                      {/* Driver Slots Container */}
                      <div className="bg-[#0a0f1d]/80 border border-slate-800 rounded-lg p-3 space-y-2">
                        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-cyan-400" />
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

