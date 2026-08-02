'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  User,
  Shield,
  Edit3,
  X,
  Check,
  Globe,
  Gamepad2,
  Trophy,
  Users,
  Award,
  Sparkles,
  Copy,
  Mail,
  AlertCircle
} from 'lucide-react'
import { COUNTRIES, getCountryName, getCountryFlag } from '@/lib/countries'
import { ClassBadge } from '@/components/class-badge'
import { simulatorLabel } from '@/lib/utils'
import { updateProfile, respondTeamInvite } from './actions'

type ProfileData = {
  id: string
  displayName: string
  countryCode: string
  bio: string
  mainSim: 'ac' | 'lmu'
  avatarUrl: string | null
  steamId: string
  steamDisplayName: string
  preferredCategories: string[]
}

type RegistrationItem = {
  id: string
  leagueId: string
  status: string
  classTag?: string | null
  assignedNumber?: number | string | null
}

type LeagueItem = {
  id: string
  title: string
  slug: string
}

type TeamInvite = {
  id: string
  teamName: string
  teamLogoUrl: string | null
  invitedBy: string
  message: string | null
}

type Props = {
  profile: ProfileData
  registrations: RegistrationItem[]
  leagues: LeagueItem[]
  pendingInvites: TeamInvite[]
  qsInvite?: string
  initialEditOpen?: boolean
}

const CATEGORY_OPTIONS = ['GT3', 'HYPERCAR', 'FORMULA', 'LMP2']

export default function PerfilContent({
  profile,
  registrations,
  leagues,
  pendingInvites,
  qsInvite,
  initialEditOpen = false,
}: Props) {
  const router = useRouter()
  const [isEditOpen, setIsEditOpen] = useState(initialEditOpen)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copiedSteam, setCopiedSteam] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Edit form state
  const [editDisplayName, setEditDisplayName] = useState(profile.displayName)
  const [editCountryCode, setEditCountryCode] = useState(profile.countryCode || 'ES')
  const [editBio, setEditBio] = useState(profile.bio || '')
  const [editMainSim, setEditMainSim] = useState<'ac' | 'lmu'>(profile.mainSim || 'ac')
  const [editSelectedCategories, setEditSelectedCategories] = useState<string[]>(
    profile.preferredCategories.map((c) => c.toUpperCase())
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleCopySteamId = () => {
    if (!profile.steamId) return
    navigator.clipboard.writeText(profile.steamId)
    setCopiedSteam(true)
    setTimeout(() => setCopiedSteam(false), 2000)
  }

  const handleCategoryToggle = (category: string) => {
    setEditSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    )
  }

  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    try {
      await updateProfile(formData)
    } catch (err: any) {
      if (!err?.digest?.startsWith('NEXT_REDIRECT') && err?.message !== 'NEXT_REDIRECT') {
        console.error('Failed to update profile:', err)
      }
    } finally {
      setIsSubmitting(false)
      setIsEditOpen(false)
      router.refresh()
    }
  }

  return (
    <div className="space-y-6 text-white">
      {/* 1. Header Banner & Driver Card */}
      <section className="relative overflow-hidden border border-white/10 bg-gradient-to-r from-[#060a14] via-[#091122] to-[#060a14] p-6 md:p-8 rounded-none shadow-2xl">
        {/* Glow Accent Effects */}
        <div className="absolute top-0 right-0 h-48 w-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 h-48 w-48 bg-[#1274de]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="h-20 w-20 md:h-24 md:w-24 rounded-full object-cover ring-2 ring-cyan-400/40 shadow-[0_0_20px_rgba(0,240,255,0.25)]"
                />
              ) : (
                <div className="flex h-20 w-20 md:h-24 md:w-24 items-center justify-center rounded-full bg-cyan-950/60 text-2xl font-black text-cyan-400 border border-cyan-400/40 shadow-[0_0_20px_rgba(0,240,255,0.2)]">
                  {profile.displayName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="absolute bottom-0 right-0 h-5 w-5 rounded-full bg-emerald-500 border-2 border-[#091122]" title="Active Driver" />
            </div>

            {/* Driver Identity */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-2xl" title={getCountryName(profile.countryCode)}>
                  {getCountryFlag(profile.countryCode)}
                </span>
                <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-tight text-white">
                  {profile.displayName}
                </h1>
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                  Official Driver
                </span>
              </div>

              {/* Badges Info Bar */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-mono">
                <button
                  type="button"
                  onClick={handleCopySteamId}
                  className="flex items-center gap-1.5 bg-black/40 hover:bg-black/80 px-2.5 py-1 border border-white/10 text-slate-300 transition-colors rounded-none cursor-pointer"
                  title="Click to copy Steam ID"
                >
                  <Copy className="h-3 w-3 text-cyan-400" />
                  <span>Steam ID: {profile.steamId}</span>
                  {copiedSteam && <span className="text-emerald-400 font-bold text-[10px] ml-1">COPIED!</span>}
                </button>

                <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1 text-slate-200">
                  <span className="text-sm">{getCountryFlag(profile.countryCode)}</span>
                  <span>{getCountryName(profile.countryCode)} ({profile.countryCode})</span>
                </span>

                <span className="flex items-center gap-1 bg-white/5 border border-white/10 px-2.5 py-1 text-slate-200">
                  <Gamepad2 className="h-3 w-3 text-cyan-400" />
                  {simulatorLabel(profile.mainSim)}
                </span>
              </div>

              {/* Driver Bio Section (preserves Enters/newlines cleanly with whitespace-pre-wrap) */}
              {profile.bio && (
                <div className="mt-3 bg-black/40 border-l-2 border-cyan-400 p-3 text-xs text-slate-300 italic max-w-2xl font-medium leading-relaxed whitespace-pre-wrap break-words">
                  "{profile.bio}"
                </div>
              )}
            </div>
          </div>

          {/* Edit Profile Button (Opens Interactive Modal) */}
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="self-start md:self-center bg-[#1274de] hover:bg-[#1f82ee] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white transition-all shadow-[0_0_15px_rgba(18,116,222,0.3)] flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Edit3 className="h-4 w-4" />
            Edit Profile
          </button>
        </div>
      </section>

      {/* Invites Status Alerts */}
      {qsInvite === 'accepted' && (
        <div className="border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs font-bold text-emerald-300 rounded-none flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-400" /> Team invitation accepted successfully!
        </div>
      )}
      {qsInvite === 'rejected' && (
        <div className="border border-amber-500/40 bg-amber-950/40 p-3 text-xs font-bold text-amber-300 rounded-none flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-400" /> Team invitation declined.
        </div>
      )}

      {/* 2. Grid Columns: General Data & Registrations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Data Card */}
        <div className="shell-panel p-5 md:p-6 border border-white/10 bg-[#070b14]/80 space-y-4 rounded-none">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-sm font-black uppercase italic tracking-wider text-white flex items-center gap-2">
              <User className="h-4 w-4 text-cyan-400" /> General Driver Data
            </h2>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-black/30 p-3 border border-white/5 space-y-1">
              <dt className="text-[10px] text-slate-400 font-mono uppercase font-bold">Steam Name</dt>
              <dd className="font-bold text-white text-sm truncate">{profile.steamDisplayName}</dd>
            </div>

            <div className="bg-black/30 p-3 border border-white/5 space-y-1">
              <dt className="text-[10px] text-slate-400 font-mono uppercase font-bold">Steam 64 ID</dt>
              <dd className="font-mono text-slate-300 font-semibold truncate">{profile.steamId}</dd>
            </div>

            <div className="bg-black/30 p-3 border border-white/5 space-y-1">
              <dt className="text-[10px] text-slate-400 font-mono uppercase font-bold">Country / Region</dt>
              <dd className="font-semibold text-white flex items-center gap-1.5">
                <span>{getCountryFlag(profile.countryCode)}</span>
                <span>{getCountryName(profile.countryCode)}</span>
              </dd>
            </div>

            <div className="bg-black/30 p-3 border border-white/5 space-y-1">
              <dt className="text-[10px] text-slate-400 font-mono uppercase font-bold">Main Platform</dt>
              <dd className="font-semibold text-cyan-300">{simulatorLabel(profile.mainSim)}</dd>
            </div>
          </dl>
        </div>

        {/* My Registrations Card */}
        <div className="shell-panel p-5 md:p-6 border border-white/10 bg-[#070b14]/80 space-y-4 rounded-none">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-sm font-black uppercase italic tracking-wider text-white flex items-center gap-2">
              <Trophy className="h-4 w-4 text-cyan-400" /> My League Registrations
            </h2>
            <Link href="/ligas" className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 hover:underline">
              Find League →
            </Link>
          </div>

          <div className="space-y-3">
            {registrations.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs italic bg-black/20 border border-white/5">
                No active league registrations yet. Join a championship from the Leagues section!
              </div>
            ) : (
              registrations.map((reg) => {
                const league = leagues.find((l) => l.id === reg.leagueId)
                return (
                  <div
                    key={reg.id}
                    className="border border-white/10 bg-black/40 p-3.5 rounded-none flex items-center justify-between gap-3 hover:border-cyan-500/40 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <Link
                        href={league ? `/ligas/${league.slug}` : '#'}
                        className="font-extrabold text-white hover:text-cyan-300 transition-colors text-xs uppercase tracking-wide truncate block"
                      >
                        {league?.title ?? 'League Championship'}
                      </Link>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                        {reg.classTag && <ClassBadge classTag={reg.classTag} className="text-[10px] px-2 py-0.5" />}
                        {reg.assignedNumber && (
                          <span className="text-cyan-300 font-bold bg-cyan-950/40 px-2 py-0.5 border border-cyan-500/30">
                            #{reg.assignedNumber}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 shrink-0">
                      {reg.status || 'Active'}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* 3. Team Invitations Card */}
      <div className="shell-panel p-5 md:p-6 border border-white/10 bg-[#070b14]/80 space-y-4 rounded-none">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="text-sm font-black uppercase italic tracking-wider text-white flex items-center gap-2">
            <Users className="h-4 w-4 text-cyan-400" /> Pending Team Invitations
          </h2>
        </div>

        <div className="space-y-3">
          {pendingInvites.length === 0 ? (
            <p className="text-xs text-slate-400 italic p-4 bg-black/20 border border-white/5 text-center">
              You have no pending team invitations at the moment.
            </p>
          ) : (
            pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="border border-cyan-500/30 bg-gradient-to-r from-black/60 via-cyan-950/20 to-black/60 p-4 rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5">
                  {invite.teamLogoUrl ? (
                    <img
                      src={invite.teamLogoUrl}
                      alt={invite.teamName}
                      className="h-12 w-12 object-contain border border-white/15 bg-black p-1 shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-black text-base shrink-0">
                      {invite.teamName.substring(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div className="space-y-1">
                    <h4 className="font-extrabold text-white uppercase text-sm tracking-wide">{invite.teamName}</h4>
                    <p className="text-xs text-slate-400">
                      Invited by: <span className="text-slate-200 font-bold">{invite.invitedBy}</span>
                    </p>
                    {invite.message && (
                      <p className="mt-1 text-xs text-slate-300 italic bg-black/40 px-2.5 py-1 border-l-2 border-cyan-400">
                        "{invite.message}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <form action={respondTeamInvite}>
                    <input type="hidden" name="inviteId" value={invite.id} />
                    <input type="hidden" name="decision" value="accepted" />
                    <button
                      type="submit"
                      className="border border-emerald-500/60 bg-emerald-950/80 hover:bg-emerald-600 text-emerald-200 hover:text-white px-4 py-2 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Accept
                    </button>
                  </form>
                  <form action={respondTeamInvite}>
                    <input type="hidden" name="inviteId" value={invite.id} />
                    <input type="hidden" name="decision" value="rejected" />
                    <button
                      type="submit"
                      className="border border-rose-500/60 bg-rose-950/80 hover:bg-rose-600 text-rose-200 hover:text-white px-4 py-2 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Decline
                    </button>
                  </form>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 4. Preferred Categories Card */}
      <div className="shell-panel p-5 md:p-6 border border-white/10 bg-[#070b14]/80 space-y-4 rounded-none">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="text-sm font-black uppercase italic tracking-wider text-white flex items-center gap-2">
            <Award className="h-4 w-4 text-cyan-400" /> Preferred Competition Categories
          </h2>
        </div>

        <div className="flex flex-wrap gap-3">
          {profile.preferredCategories.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No category preferences configured yet. Click "Edit Profile" above to select your preferred classes!</p>
          ) : (
            profile.preferredCategories.map((category) => (
              <ClassBadge key={category} classTag={category} className="px-4 py-2 text-xs font-black tracking-wider shadow-md" />
            ))
          )}
        </div>
      </div>

      {/* 5. Interactive Edit Profile Modal */}
      {isEditOpen && mounted && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-[150] overflow-y-auto bg-black/85 backdrop-blur-sm p-4 flex justify-center items-start md:items-center">
              <div className="w-full max-w-2xl bg-[#090d16] border border-shell-line shadow-2xl my-auto relative">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-shell-line p-5">
                  <h2 className="text-lg font-black uppercase italic tracking-wider text-white flex items-center gap-2">
                    <Edit3 className="h-5 w-5 text-cyan-400" /> Edit Driver Profile
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Modal Form */}
                <form onSubmit={handleSaveProfile} className="p-6 space-y-5">
                  {/* Display Name */}
                  <div>
                    <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">
                      Display Name *
                    </label>
                    <input
                      name="displayName"
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      required
                      className="w-full border border-shell-line bg-black/60 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400 font-bold transition-colors"
                    />
                  </div>

                  {/* Country */}
                  <div>
                    <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">
                      Country *
                    </label>
                    <select
                      name="countryCode"
                      value={editCountryCode}
                      onChange={(e) => setEditCountryCode(e.target.value)}
                      required
                      className="w-full border border-shell-line bg-black px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400 transition-colors cursor-pointer"
                    >
                      {COUNTRIES.map((country) => (
                        <option key={country.code} value={country.code} className="bg-neutral-900 text-white">
                          {getCountryFlag(country.code)} {country.name} ({country.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Main Simulator */}
                  <div>
                    <label className="mb-1.5 block text-xs text-slate-300 uppercase tracking-wider font-semibold">
                      Main Simulator Platform
                    </label>
                    <input type="hidden" name="mainSim" value={editMainSim} />

                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setEditMainSim('ac')}
                        className={`flex flex-col items-center justify-center p-3.5 border text-center transition-all rounded-none cursor-pointer ${
                          editMainSim === 'ac'
                            ? 'border-cyan-400 bg-cyan-950/40 text-white shadow-[0_0_12px_rgba(34,211,238,0.2)]'
                            : 'border-white/10 bg-black/40 text-slate-400 hover:text-white hover:border-slate-400'
                        }`}
                      >
                        <span className="text-xs font-extrabold tracking-wide uppercase">Assetto Corsa</span>
                        <span className="mt-0.5 text-[10px] text-slate-400">AC / ACC Racing</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditMainSim('lmu')}
                        className={`flex flex-col items-center justify-center p-3.5 border text-center transition-all rounded-none cursor-pointer ${
                          editMainSim === 'lmu'
                            ? 'border-cyan-400 bg-cyan-950/40 text-white shadow-[0_0_12px_rgba(34,211,238,0.2)]'
                            : 'border-white/10 bg-black/40 text-slate-400 hover:text-white hover:border-slate-400'
                        }`}
                      >
                        <span className="text-xs font-extrabold tracking-wide uppercase">Le Mans Ultimate</span>
                        <span className="mt-0.5 text-[10px] text-slate-400">LMU WEC Series</span>
                      </button>
                    </div>
                  </div>

                  {/* Bio with line breaks note */}
                  <div>
                    <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold flex items-center justify-between">
                      <span>Driver Bio / Motto</span>
                      <span className="text-[10px] text-slate-400 font-mono italic">Enters / line breaks will be preserved</span>
                    </label>
                    <textarea
                      name="bio"
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      rows={4}
                      placeholder="Tell the community about yourself, your racing experience..."
                      className="w-full border border-shell-line bg-black/60 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400 transition-colors resize-y font-medium leading-relaxed"
                    />
                  </div>

                  {/* Preferred Categories */}
                  <div className="border border-white/10 bg-black/30 p-4 space-y-3">
                    <p className="text-xs font-bold text-white uppercase tracking-wider">Preferred Competition Categories</p>
                    <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                      {CATEGORY_OPTIONS.map((category) => {
                        const isSelected = editSelectedCategories.includes(category)
                        return (
                          <label
                            key={category}
                            className={`flex items-center justify-between p-2.5 border cursor-pointer select-none transition-all rounded-none ${
                              isSelected
                                ? 'border-cyan-400 bg-cyan-950/30 text-cyan-300 font-bold'
                                : 'border-white/10 bg-black/40 text-slate-400 hover:border-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <ClassBadge classTag={category} className="text-[10px] px-2 py-0.5" />
                            <input
                              type="checkbox"
                              name="preferredCategories"
                              value={category}
                              checked={isSelected}
                              onChange={() => handleCategoryToggle(category)}
                              className="hidden"
                            />
                            <span
                              className={`w-3.5 h-3.5 border flex items-center justify-center text-[10px] ${
                                isSelected ? 'border-cyan-400 bg-cyan-400 text-black font-bold' : 'border-slate-500 bg-transparent'
                              }`}
                            >
                              {isSelected && '✓'}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-shell-line/50">
                    <button
                      type="button"
                      onClick={() => setIsEditOpen(false)}
                      className="border border-shell-line bg-transparent hover:bg-white/5 px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-none transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-[#1274de] hover:bg-[#1f82ee] disabled:bg-cyan-900/60 px-6 py-2 text-xs font-bold uppercase tracking-wider text-white rounded-none transition-colors flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(18,116,222,0.4)]"
                    >
                      {isSubmitting ? 'Saving Profile...' : 'Save Profile'}
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
