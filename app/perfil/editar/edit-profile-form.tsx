'use client'

import { useState } from 'react'
import { COUNTRIES } from '@/lib/countries'

type ProfileData = {
  displayName: string
  countryCode: string
  bio: string
  mainSim: 'ac' | 'lmu'
  preferredCategories: string[]
}

type Props = {
  profile: ProfileData
  updateAction: (formData: FormData) => Promise<void>
}

const CATEGORY_OPTIONS = ['GT3', 'HYPERCAR', 'FORMULA', 'LMP2']

export default function EditProfileForm({ profile, updateAction }: Props) {
  const [mainSim, setMainSim] = useState<'ac' | 'lmu'>(profile.mainSim)
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    profile.preferredCategories.map((c) => c.toUpperCase())
  )

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    )
  }

  return (
    <form action={updateAction} className="mt-6 space-y-5">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-300">Display Name</label>
        <input
          name="displayName"
          defaultValue={profile.displayName}
          required
          className="w-full border border-shell-line bg-black/40 px-3 py-2 text-sm text-white outline-none rounded-none focus:border-cyan-400 transition-colors"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-300">Country</label>
        <select
          name="countryCode"
          defaultValue={profile.countryCode || 'ES'}
          required
          className="w-full border border-shell-line bg-black px-3 py-2 text-sm text-white outline-none rounded-none focus:border-cyan-400 transition-colors cursor-pointer max-h-48 overflow-y-auto"
        >
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.code} className="bg-neutral-900 text-white py-1">
              {country.name} ({country.code})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Main Simulator</label>
        {/* Hidden input to pass value in form action */}
        <input type="hidden" name="mainSim" value={mainSim} />

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMainSim('ac')}
            className={`flex flex-col items-center justify-center p-4 border text-center transition-all rounded-none ${
              mainSim === 'ac'
                ? 'border-cyan-400 bg-cyan-950/30 text-white shadow-[0_0_12px_rgba(34,211,238,0.2)]'
                : 'border-shell-line bg-black/20 text-slate-400 hover:text-white hover:border-slate-400'
            }`}
          >
            <span className="text-sm font-bold tracking-wide uppercase">Assetto Corsa</span>
            <span className="mt-1 text-xxs text-slate-400">AC / ACC Racing Platform</span>
          </button>

          <button
            type="button"
            onClick={() => setMainSim('lmu')}
            className={`flex flex-col items-center justify-center p-4 border text-center transition-all rounded-none ${
              mainSim === 'lmu'
                ? 'border-cyan-400 bg-cyan-950/30 text-white shadow-[0_0_12px_rgba(34,211,238,0.2)]'
                : 'border-shell-line bg-black/20 text-slate-400 hover:text-white hover:border-slate-400'
            }`}
          >
            <span className="text-sm font-bold tracking-wide uppercase">Le Mans Ultimate</span>
            <span className="mt-1 text-xxs text-slate-400">LMU WEC Platform</span>
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-300">Bio</label>
        <textarea
          name="bio"
          defaultValue={profile.bio}
          rows={4}
          className="w-full border border-shell-line bg-black/40 px-3 py-2 text-sm text-white outline-none rounded-none focus:border-cyan-400 transition-colors"
        />
      </div>

      <div className="border border-shell-line bg-black/20 p-4 rounded-none">
        <p className="text-sm font-bold text-white uppercase tracking-wide">Category Preferences</p>
        <p className="mt-1 text-xs text-slate-400">Select the classes you prefer to compete in.</p>
        
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          {CATEGORY_OPTIONS.map((category) => {
            const isSelected = selectedCategories.includes(category)
            return (
              <label
                key={category}
                className={`flex items-center justify-between p-3 border cursor-pointer select-none transition-all rounded-none ${
                  isSelected
                    ? 'border-cyan-400 bg-cyan-950/20 text-cyan-300 font-bold'
                    : 'border-shell-line bg-black/20 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                }`}
              >
                <span className="text-xs tracking-wider">{category}</span>
                <input
                  type="checkbox"
                  name="preferredCategories"
                  value={category}
                  checked={isSelected}
                  onChange={() => handleCategoryToggle(category)}
                  className="hidden"
                />
                <span
                  className={`w-3.5 h-3.5 border flex items-center justify-center text-xxs ${
                    isSelected ? 'border-cyan-400 bg-cyan-400 text-black' : 'border-slate-500 bg-transparent'
                  }`}
                >
                  {isSelected && '✓'}
                </span>
              </label>
            )
          })}
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-shell-accent hover:bg-red-700 py-3 text-sm font-bold text-white transition-colors tracking-widest uppercase rounded-none"
      >
        Save Changes
      </button>
    </form>
  )
}
