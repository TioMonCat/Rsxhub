'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { SectionTitle } from '@/components/section-title'
import { TeamSkinConfigEditor } from '@/components/team-skin-config-editor'
import { TeamShowcase } from '@/components/team-showcase'
import { ImagePicker } from '@/components/image-picker'
import { Plus, X } from 'lucide-react'

type TeamDashboard = {
  id: string
  name: string
  description: string | null
  classTags: string[]
  logoUrl: string | null
  carSkinUrls: string[]
  skinAssignments: any[]
  ownerUserId: string | null
  createdAt: string
  members: any[]
  invites: any[]
  occupiedSlots: number
  competitionClassTags?: string[]
  primaryColor?: string | null
  accentColor?: string | null
  slogan?: string | null
  discordUrl?: string | null
  youtubeUrl?: string | null
}

type LeagueOption = {
  slug: string
  title: string
}

type EquiposContentProps = {
  teams: TeamDashboard[]
  leagues: LeagueOption[]
  createTeamAction: (formData: FormData) => Promise<void>
  session: any
  hasOwnedTeam: boolean
  belongsToTeam?: boolean
}

export default function EquiposContent({
  teams,
  leagues,
  createTeamAction,
  session,
  hasOwnedTeam,
  belongsToTeam = false
}: EquiposContentProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedAccent, setSelectedAccent] = useState('#00f0ff')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setIsSubmitting(true)
  }

  return (
    <div className="space-y-6 text-white">
      {/* Header Panel */}
      <section className="shell-panel p-5 rounded-none border border-shell-line bg-zinc-950/40 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <SectionTitle
          title="Teams"
          subtitle="Create and manage your team info, registered drivers, and skin download links."
        />
        {session && (
          belongsToTeam ? (
            <button
              disabled
              title="You cannot create a team if you already belong to one."
              className="flex items-center gap-2 bg-slate-800 border border-slate-700 text-slate-400 px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-none cursor-not-allowed"
            >
              Already in a team
            </button>
          ) : (
            <button
              onClick={() => {
                setSelectedTags([])
                setIsCreateOpen(true)
              }}
              className="flex items-center gap-2 bg-shell-accent hover:bg-red-700 px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-none transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Create Team
            </button>
          )
        )}
      </section>

      {/* Grid of Teams */}
      <section className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
        {teams.length === 0 ? (
          <div className="shell-panel p-8 text-center rounded-none border border-shell-line bg-zinc-950/20 md:col-span-2">
            <p className="text-sm text-slate-400">No teams have been created yet.</p>
            {session && !belongsToTeam && (
              <button
                onClick={() => setIsCreateOpen(true)}
                className="mt-4 text-xs font-bold text-shell-accent hover:underline uppercase tracking-wider cursor-pointer"
              >
                Create the first team now
              </button>
            )}
          </div>
        ) : (
          teams.map((team) => {
            const pilotNames = team.members.map(
              (m) => m.displayName || m.steamDisplayName || 'Driver'
            )
            return (
              <div key={team.id} className="relative group">
                <TeamShowcase
                  teamName={team.name}
                  teamLogoUrl={team.logoUrl}
                  primaryColor={team.primaryColor}
                  accentColor={team.accentColor}
                  slogan={team.slogan}
                  competitionClasses={team.classTags && team.classTags.length > 0 ? team.classTags : ['UNCLASSIFIED']}
                  pilotNames={pilotNames}
                  profileHref={`/equipos/${team.id}`}
                  skins={team.skinAssignments}
                />
              </div>
            )
          })
        )}
      </section>

      {/* Create Team Modal */}
      {isCreateOpen && mounted && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-[150] overflow-y-auto bg-black/85 backdrop-blur-sm p-4 flex justify-center items-start md:items-center">
              <div className="w-full max-w-2xl bg-[#090d16] border border-shell-line shadow-2xl my-auto relative">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-shell-line p-5">
                  <h2 className="text-lg font-black uppercase italic tracking-wider text-white">
                    Create New Team
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
                <form action={createTeamAction} onSubmit={handleSubmit} className="p-6 space-y-6">
                  {/* Team Name */}
                  <div>
                    <label className="mb-1 block text-xs text-slate-355 uppercase tracking-wider font-semibold">
                      Team Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="e.g. Real Simracing Team"
                      className="w-full border border-shell-line bg-black/40 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-white/30 rounded-none transition-colors"
                    />
                  </div>

                  {/* Team Description */}
                  <div>
                    <label className="mb-1 block text-xs text-slate-355 uppercase tracking-wider font-semibold">
                      Short Description
                    </label>
                    <textarea
                      name="description"
                      rows={2}
                      placeholder="Tell us a bit about the team..."
                      className="w-full border border-shell-line bg-black/40 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-white/30 rounded-none transition-colors resize-none"
                    />
                  </div>

                  {/* Categories */}
                  <div>
                    <label className="mb-2 block text-xs text-slate-355 uppercase tracking-wider font-semibold">
                      Competing Categories
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {['GT3', 'LMP2', 'HYPERCAR'].map((tag) => {
                        const isSelected = selectedTags.includes(tag)
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleTagToggle(tag)}
                            className={`border px-4 py-1.5 text-xs font-bold tracking-wider uppercase transition-colors rounded-none cursor-pointer ${
                              isSelected
                                ? 'border-shell-accent bg-shell-accent/20 text-white'
                                : 'border-shell-line bg-white/5 hover:bg-white/10 text-slate-300'
                            }`}
                          >
                            {tag}
                          </button>
                        )
                      })}
                    </div>
                    <input type="hidden" name="classTags" value={selectedTags.join(',')} />
                  </div>

                  {/* Team Logo Picker */}
                  <div>
                    <ImagePicker
                      name="logoUrl"
                      defaultValue=""
                      label="Team Logo (PNG/JPG/WebP - Will be compressed automatically)"
                      hideGallery
                    />
                  </div>

                  {/* Team Identity & Customization */}
                  <div className="border border-white/5 bg-white/[0.02] p-4 space-y-4">
                    <h3 className="text-xs font-black uppercase italic tracking-wider text-slate-200 border-b border-white/10 pb-2">
                      Team Identity & Personalization
                    </h3>

                    {/* Slogan */}
                    <div>
                      <label className="mb-1 block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                        Team Slogan / Motto
                      </label>
                      <input
                        type="text"
                        name="slogan"
                        placeholder="e.g. Speed. Precision. Victory."
                        maxLength={85}
                        className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-white/30 rounded-none transition-colors"
                      />
                    </div>

                    {/* Accent Color Selection */}
                    <div>
                      <label className="mb-1.5 block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                        Team Accent Color
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { name: 'Neon Blue', hex: '#00f0ff', bg: 'bg-[#00f0ff]' },
                          { name: 'Neon Pink', hex: '#ff007f', bg: 'bg-[#ff007f]' },
                          { name: 'Electric Lime', hex: '#39ff14', bg: 'bg-[#39ff14]' },
                          { name: 'Fiery Orange', hex: '#ff5500', bg: 'bg-[#ff5500]' },
                          { name: 'Golden Yellow', hex: '#ffea00', bg: 'bg-[#ffea00]' },
                          { name: 'Acid Purple', hex: '#b026ff', bg: 'bg-[#b026ff]' },
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Discord Link */}
                      <div>
                        <label className="mb-1 block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                          Discord Invite Link
                        </label>
                        <input
                          type="url"
                          name="discordUrl"
                          placeholder="e.g. https://discord.gg/..."
                          className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-white/30 rounded-none transition-colors"
                        />
                      </div>

                      {/* YouTube Channel */}
                      <div>
                        <label className="mb-1 block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                          YouTube Channel Link
                        </label>
                        <input
                          type="url"
                          name="youtubeUrl"
                          placeholder="e.g. https://youtube.com/..."
                          className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-white/30 rounded-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Skins Downloader */}
                  <div className="space-y-2">
                    <label className="block text-xs text-slate-355 uppercase tracking-wider font-semibold">
                      Skin Download Links (Optional)
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Add external download links (like Google Drive, Mega, or Mediafire) associated with each corresponding league.
                    </p>
                    <TeamSkinConfigEditor
                      leagues={leagues}
                      initialProfiles={[]}
                    />
                  </div>

                  {/* Submit Buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-shell-line/50">
                    <button
                      type="button"
                      onClick={() => setIsCreateOpen(false)}
                      className="border border-shell-line bg-transparent hover:bg-white/5 px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-none transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-shell-accent hover:bg-red-700 disabled:bg-red-900/60 px-6 py-2 text-xs font-bold uppercase tracking-wider rounded-none transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      {isSubmitting ? 'Saving...' : 'Create Team'}
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
