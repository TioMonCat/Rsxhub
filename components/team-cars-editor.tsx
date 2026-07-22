'use client'

import { useState, useMemo } from 'react'
import { Plus, Trash, Users } from 'lucide-react'

type CarEntry = {
  id: string
  category: 'GT3' | 'LMP2' | 'HYPERCAR'
  dorsal: string
  skinUrl: string
  driverUserIds: string[] // Up to 4 userIds
}

type TeamMemberOption = {
  userId: string
  name: string
  steamId?: string
}

export function TeamCarsEditor({
  teamMembers,
  initialCars = [],
}: {
  teamMembers: TeamMemberOption[]
  initialCars: CarEntry[]
}) {
  const [cars, setCars] = useState<CarEntry[]>(() => {
    if (initialCars && initialCars.length > 0) {
      return initialCars.map((car) => ({
        id: car.id || `car_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        category: car.category || 'GT3',
        dorsal: car.dorsal || '',
        skinUrl: car.skinUrl || '',
        driverUserIds: Array.isArray(car.driverUserIds)
          ? [...car.driverUserIds, '', '', '', ''].slice(0, 4)
          : ['', '', '', ''],
      }))
    }
    return []
  })

  const serialized = useMemo(() => {
    // Clean and validate before serializing
    const cleaned = cars.map((car) => ({
      id: car.id,
      category: car.category,
      dorsal: String(car.dorsal || '').trim(),
      skinUrl: String(car.skinUrl || '').trim(),
      driverUserIds: (car.driverUserIds || [])
        .map((id) => String(id || '').trim())
        .slice(0, 4),
    }))
    return JSON.stringify(cleaned)
  }, [cars])

  const addCar = (category: 'GT3' | 'LMP2' | 'HYPERCAR') => {
    setCars((prev) => [
      ...prev,
      {
        id: `car_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        category,
        dorsal: '',
        skinUrl: '',
        driverUserIds: ['', '', '', ''],
      },
    ])
  }

  const removeCar = (id: string) => {
    setCars((prev) => prev.filter((car) => car.id !== id))
  }

  const updateCarField = (id: string, field: keyof CarEntry, value: any) => {
    setCars((prev) =>
      prev.map((car) => (car.id === id ? { ...car, [field]: value } : car))
    );
  };

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
  }> = {
    HYPERCAR: {
      text: 'text-rose-450',
      border: 'border-rose-500/40',
      focus: 'focus:border-rose-400 focus:ring-1 focus:ring-rose-500/30',
      icon: 'text-rose-400',
      addBtn: 'border-rose-500/40 bg-rose-950/30 hover:bg-rose-500 hover:text-white hover:border-rose-400 text-rose-300 font-bold',
      headerText: 'text-rose-400 font-black tracking-wider shadow-[0_0_15px_rgba(244,63,94,0.1)]',
      cardBorder: 'border-rose-500/30 focus-within:border-rose-400 bg-[#210c10]/40 hover:border-rose-500/50',
      glow: 'shadow-[inset_0_1px_0_0_rgba(244,63,94,0.25),0_0_24px_rgba(244,63,94,0.08)] bg-[#19090c]/60 border-rose-500/45'
    },
    LMP2: {
      text: 'text-blue-450',
      border: 'border-blue-500/40',
      focus: 'focus:border-blue-400 focus:ring-1 focus:ring-blue-500/30',
      icon: 'text-blue-400',
      addBtn: 'border-blue-500/40 bg-blue-950/30 hover:bg-blue-500 hover:text-white hover:border-blue-400 text-blue-300 font-bold',
      headerText: 'text-blue-400 font-black tracking-wider shadow-[0_0_15px_rgba(59,130,246,0.1)]',
      cardBorder: 'border-blue-500/30 focus-within:border-blue-400 bg-[#0a1226]/40 hover:border-blue-500/50',
      glow: 'shadow-[inset_0_1px_0_0_rgba(59,130,246,0.25),0_0_24px_rgba(59,130,246,0.08)] bg-[#070b18]/60 border-blue-500/45'
    },
    GT3: {
      text: 'text-emerald-450',
      border: 'border-emerald-500/40',
      focus: 'focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/30',
      icon: 'text-emerald-400',
      addBtn: 'border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-500 hover:text-white hover:border-emerald-400 text-emerald-300 font-bold',
      headerText: 'text-emerald-400 font-black tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.1)]',
      cardBorder: 'border-emerald-500/30 focus-within:border-emerald-400 bg-[#09180f]/40 hover:border-emerald-500/50',
      glow: 'shadow-[inset_0_1px_0_0_rgba(16,185,129,0.25),0_0_24px_rgba(16,185,129,0.08)] bg-[#06100a]/60 border-emerald-500/45'
    }
  }

  return (
    <div className="space-y-6">
      <input type="hidden" name="teamCarsJson" value={serialized} />

      {categories.map((category) => {
        const categoryCars = cars.filter((car) => car.category === category)
        const theme = categoryThemes[category] || {
          text: 'text-cyan-400',
          border: 'border-cyan-500/20',
          focus: 'focus:border-cyan-400',
          icon: 'text-cyan-400',
          addBtn: 'border-shell-line bg-white/5 hover:bg-white/10 text-white',
          headerText: 'text-cyan-400',
          cardBorder: 'border-shell-line/60 bg-black/35',
          glow: 'border-shell-line bg-black/10'
        }

        return (
          <div key={category} className={`border p-4 rounded-none space-y-4 transition-all ${theme.glow}`}>
            <div className={`flex items-center justify-between border-b pb-2 ${theme.border}`}>
              <h3 className={`text-sm font-black uppercase italic tracking-wider ${theme.headerText}`}>
                {category} Category
              </h3>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                {categoryCars.length} Vehicles
              </span>
            </div>

            {categoryCars.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                No vehicles configured in this category.
              </p>
            ) : (
              <div className="space-y-4">
                {categoryCars.map((car) => (
                  <div
                    key={car.id}
                    className={`border p-4 rounded-none relative space-y-3 transition-all ${theme.cardBorder}`}
                  >
                    <button
                      type="button"
                      onClick={() => removeCar(car.id)}
                      className="absolute top-4 right-4 text-rose-400 hover:text-rose-300 p-1 cursor-pointer transition-colors"
                      title="Delete Vehicle"
                    >
                      <Trash className="h-4 w-4" />
                    </button>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                          Car Number
                        </label>
                        <input
                          type="text"
                          required
                          value={car.dorsal}
                          onChange={(e) => updateCarField(car.id, 'dorsal', e.target.value)}
                          placeholder="e.g. #45"
                          className={`w-full border bg-black/40 px-3 py-1.5 text-xs text-white outline-none rounded-none transition-colors ${theme.border} ${theme.focus}`}
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                          Skin Download URL
                        </label>
                        <input
                          type="text"
                          required
                          value={car.skinUrl}
                          onChange={(e) => updateCarField(car.id, 'skinUrl', e.target.value)}
                          placeholder="e.g. https://mega.nz/file/..."
                          className={`w-full border bg-black/40 px-3 py-1.5 text-xs text-white outline-none rounded-none transition-colors ${theme.border} ${theme.focus}`}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1">
                        <Users className={`h-3 w-3 ${theme.icon}`} />
                        Assigned Drivers (Max 4)
                      </label>
                      <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
                        {[0, 1, 2, 3].map((driverIdx) => {
                          const val = car.driverUserIds[driverIdx] || ''
                          return (
                            <select
                              key={driverIdx}
                              value={val}
                              onChange={(e) => updateCarDriver(car.id, driverIdx, e.target.value)}
                              className={`w-full border bg-black/50 px-2 py-1.5 text-[11px] text-slate-200 outline-none rounded-none cursor-pointer ${theme.border} ${theme.focus}`}
                            >
                              <option value="">-- Vacant --</option>
                              {teamMembers.map((m) => (
                                <option key={m.userId} value={m.userId}>
                                  {m.name} {m.steamId ? `(${m.steamId})` : ''}
                                </option>
                              ))}
                            </select>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Car Button */}
            <button
              type="button"
              onClick={() => addCar(category)}
              className={`flex items-center gap-1.5 border px-3.5 py-2 text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer transition-colors ${theme.addBtn}`}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Vehicle
            </button>
          </div>
        )
      })}
    </div>
  )
}
