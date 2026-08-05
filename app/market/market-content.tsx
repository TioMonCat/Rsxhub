'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Store, Send, Shield, User, Check, AlertCircle } from 'lucide-react'
import {
  createMarketListing,
  deleteMarketListing,
  applyToTeamListingAction,
  withdrawApplicationAction,
  inviteDriverFromListingAction,
} from './actions'
import { MarketDriverCards, Listing, ManagedTeam } from './components/market-driver-cards'
import { MarketTeamOffers, MarketApplication } from './components/market-team-offers'

type MarketInvite = {
  id: string
  listingId: string
  teamId: string
  teamName: string
  teamLogo: string | null
  invitedUserId: string
  invitedByUserId: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: string
}

type Props = {
  listings: Listing[]
  currentUser: {
    userId: string
    steamDisplayName: string
    avatarUrl: string | null
  } | null
  myTeams: ManagedTeam[]
  applications: MarketApplication[]
  invites: MarketInvite[]
  belongsToTeam?: boolean
}

const CLASS_OPTIONS = ['ALL', 'GT3', 'HYPERCAR', 'FORMULA', 'LMP2']

export default function MarketPageContent({
  listings,
  currentUser,
  myTeams,
  applications,
  invites,
  belongsToTeam = false
}: Props) {
  const [activeTab, setActiveTab] = useState<'team' | 'driver'>('team')
  const [simFilter, setSimFilter] = useState<'all' | 'ac' | 'lmu'>('all')
  const [classFilter, setClassFilter] = useState<string>('ALL')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const hasOwnedTeam = myTeams.length > 0

  // Form states
  const [formType, setFormType] = useState<'team_seeking_driver' | 'driver_seeking_team'>(
    hasOwnedTeam ? 'team_seeking_driver' : 'driver_seeking_team'
  )

  useEffect(() => {
    setFormType(hasOwnedTeam ? 'team_seeking_driver' : 'driver_seeking_team')
  }, [hasOwnedTeam])

  const [formSim, setFormSim] = useState<'ac' | 'lmu'>('ac')
  const [selectedClasses, setSelectedClasses] = useState<string[]>(['GT3'])
  const [formTeamId, setFormTeamId] = useState(myTeams[0]?.id || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Application & Invite modal states
  const [applyingListingId, setApplyingListingId] = useState<string | null>(null)
  const [applyMessage, setApplyMessage] = useState('')
  const [activeInviteListingId, setActiveInviteListingId] = useState<string | null>(null)
  const [inviteMessage, setInviteMessage] = useState('')

  const handleClassToggle = (tag: string) => {
    setSelectedClasses((prev) => {
      if (prev.includes(tag)) {
        if (prev.length === 1) return prev
        return prev.filter((t) => t !== tag)
      }
      return [...prev, tag]
    })
  }

  const filteredListings = listings.filter((item) => {
    const matchesTab =
      activeTab === 'team' ? item.type === 'team_seeking_driver' : item.type === 'driver_seeking_team'
    const matchesSim = simFilter === 'all' ? true : item.main_sim === simFilter
    const matchesClass =
      classFilter === 'ALL'
        ? true
        : String(item.class_tag || '')
            .toUpperCase()
            .split(',')
            .map((t) => t.trim())
            .includes(classFilter.toUpperCase())
    return matchesTab && matchesSim && matchesClass
  })

  const teamsCount = listings.filter((item) => item.type === 'team_seeking_driver').length
  const driversCount = listings.filter((item) => item.type === 'driver_seeking_team').length

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')

    const formData = new FormData(e.currentTarget)
    formData.set('type', formType)
    formData.set('mainSim', formSim)
    formData.set('classTag', selectedClasses.join(','))
    if (formType === 'team_seeking_driver') {
      formData.set('teamId', formTeamId || myTeams[0]?.id || '')
    }

    try {
      await createMarketListing(formData)
      setIsModalOpen(false)
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create listing')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this listing?')) {
      try {
        await deleteMarketListing(id)
      } catch (err) {
        alert('Failed to delete listing')
      }
    }
  }

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!applyingListingId) return
    setIsSubmitting(true)
    try {
      await applyToTeamListingAction(applyingListingId, applyMessage)
      setApplyingListingId(null)
      setApplyMessage('')
    } catch (err: any) {
      alert(err.message || 'Error applying to team')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeInviteListingId || myTeams.length === 0) return
    setIsSubmitting(true)
    try {
      await inviteDriverFromListingAction(activeInviteListingId, myTeams[0].id, inviteMessage)
      setActiveInviteListingId(null)
      setInviteMessage('')
    } catch (err: any) {
      alert(err.message || 'Error sending invite')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleWithdrawApplication = async (listingId: string) => {
    if (confirm('Are you sure you want to withdraw your application?')) {
      try {
        await withdrawApplicationAction(listingId)
      } catch (err) {
        alert('Error withdrawing application')
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Main Page Title Header */}
      <div className="border-b border-shell-line pb-4">
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white italic flex items-center gap-3">
          <Store className="h-7 w-7 text-cyan-400" />
          Driver & Team Market
        </h1>
        <p className="text-xs md:text-sm text-slate-400 mt-1">
          Connect with teams looking for drivers or find open driver positions for active championships.
        </p>
      </div>

      {/* Top Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-shell-line pb-4">
        {/* Tabs */}
        <div className="flex items-center gap-2 border border-shell-line bg-black/40 p-1">
          <button
            onClick={() => setActiveTab('team')}
            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors rounded-none ${
              activeTab === 'team'
                ? 'bg-cyan-500 text-black font-extrabold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Teams Looking for Drivers ({teamsCount})
          </button>
          <button
            onClick={() => setActiveTab('driver')}
            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors rounded-none ${
              activeTab === 'driver'
                ? 'bg-cyan-500 text-black font-extrabold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Drivers Looking for Team ({driversCount})
          </button>
        </div>

        {/* Action Button based on User Role */}
        {currentUser && (
          belongsToTeam && !hasOwnedTeam ? (
            <button
              disabled
              title="You cannot create market listings while belonging to a team as a driver."
              className="bg-slate-800 border border-slate-700 text-slate-400 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-none cursor-not-allowed"
            >
              Already in a Team
            </button>
          ) : (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-shell-accent hover:bg-red-700 text-white px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-none transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              {hasOwnedTeam ? 'Post Team Listing' : 'Post Driver Listing'}
            </button>
          )
        )}
      </div>

      {/* Class & Sim Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-black/20 border border-shell-line p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2">Category:</span>
          {CLASS_OPTIONS.map((cls) => {
            const isSelected = classFilter === cls
            let pillStyle = 'bg-black/40 text-slate-400 border-white/10 hover:text-white'

            if (cls === 'ALL') {
              pillStyle = isSelected
                ? 'bg-white text-black font-black shadow-sm'
                : 'bg-black/40 text-slate-400 border-white/10 hover:text-white'
            } else if (isSelected) {
              if (cls === 'GT3') pillStyle = 'bg-[#009f00] text-white border-green-400 font-black italic shadow-[0_0_12px_rgba(0,159,0,0.35)]'
              else if (cls === 'HYPERCAR') pillStyle = 'bg-[#e10600] text-white border-red-500 font-black italic shadow-[0_0_12px_rgba(225,6,0,0.35)]'
              else if (cls === 'FORMULA') pillStyle = 'bg-[#9333ea] text-white border-purple-400 font-black italic shadow-[0_0_12px_rgba(147,51,234,0.35)]'
              else if (cls === 'LMP2') pillStyle = 'bg-[#0072f0] text-white border-blue-400 font-black italic shadow-[0_0_12px_rgba(0,114,240,0.35)]'
            } else {
              if (cls === 'GT3') pillStyle = 'bg-black/50 text-slate-400 border-emerald-500/30 hover:border-emerald-500 hover:text-emerald-400'
              else if (cls === 'HYPERCAR') pillStyle = 'bg-black/50 text-slate-400 border-red-500/30 hover:border-red-500 hover:text-red-400'
              else if (cls === 'FORMULA') pillStyle = 'bg-black/50 text-slate-400 border-purple-500/30 hover:border-purple-500 hover:text-purple-400'
              else if (cls === 'LMP2') pillStyle = 'bg-black/50 text-slate-400 border-blue-500/30 hover:border-blue-500 hover:text-blue-400'
            }

            return (
              <button
                key={cls}
                onClick={() => setClassFilter(cls)}
                className={`px-3 py-1 text-[11px] font-extrabold uppercase transition-all rounded-none border ${pillStyle}`}
              >
                {cls}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2">Sim:</span>
          {(['all', 'ac', 'lmu'] as const).map((sim) => (
            <button
              key={sim}
              onClick={() => setSimFilter(sim)}
              className={`px-3 py-1 text-[11px] font-extrabold uppercase transition-all rounded-none ${
                simFilter === sim
                  ? 'bg-cyan-500 text-black'
                  : 'bg-black/40 text-slate-400 hover:text-white border border-white/10'
              }`}
            >
              {sim === 'all' ? 'All' : sim.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Main Listings Grid */}
      {filteredListings.length === 0 ? (
        <div className="shell-panel p-8 text-center border border-dashed border-shell-line">
          <p className="text-sm text-slate-400">No active market listings match your current filters.</p>
        </div>
      ) : activeTab === 'team' ? (
        <MarketTeamOffers
          listings={filteredListings}
          currentUserId={currentUser?.userId}
          applications={applications}
          belongsToTeam={belongsToTeam || hasOwnedTeam}
          onDeleteListing={handleDelete}
          onApplyClick={(id) => setApplyingListingId(id)}
          onWithdrawApplication={handleWithdrawApplication}
        />
      ) : (
        <MarketDriverCards
          listings={filteredListings}
          currentUserId={currentUser?.userId}
          myTeams={myTeams}
          invites={invites}
          onDeleteListing={handleDelete}
          onInviteClick={(id) => setActiveInviteListingId(id)}
        />
      )}

      {/* Create Listing Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-fade-in">
          <div className="shell-panel border border-shell-line bg-[#090d16] max-w-lg w-full p-6 text-white rounded-none relative shadow-2xl">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer">
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 border-b border-shell-line pb-3 mb-4">
              {hasOwnedTeam ? (
                <Shield className="h-5 w-5 text-cyan-400" />
              ) : (
                <User className="h-5 w-5 text-cyan-400" />
              )}
              <h2 className="text-lg font-black uppercase italic tracking-tight text-white">
                {hasOwnedTeam ? 'Post Team Offer' : 'Post Driver Application'}
              </h2>
            </div>

            {errorMessage && (
              <div className="mb-4 bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {hasOwnedTeam && myTeams.length > 0 && (
                <div>
                  <label className="mb-1 block text-xs text-slate-300 uppercase font-bold">Managing Team</label>
                  <select
                    value={formTeamId}
                    onChange={(e) => setFormTeamId(e.target.value)}
                    className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none font-bold"
                  >
                    {myTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs text-slate-300 uppercase font-bold">Listing Title</label>
                <input
                  type="text"
                  name="title"
                  required
                  placeholder={
                    hasOwnedTeam
                      ? 'e.g. Seeking GT3 Driver for 6 Hours of Le Mans'
                      : 'e.g. GT3 Driver seeking competitive team'
                  }
                  className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-slate-300 uppercase font-bold tracking-wider">
                  Primary Simulator
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setFormSim('ac')}
                    className={`flex flex-col items-center justify-center p-3 border text-center transition-all cursor-pointer rounded-none ${
                      formSim === 'ac'
                        ? 'border-cyan-400 bg-cyan-950/40 text-white shadow-[0_0_15px_rgba(34,211,238,0.25)]'
                        : 'border-white/10 bg-black/40 text-slate-400 hover:text-white hover:border-slate-400'
                    }`}
                  >
                    <span className="text-xs font-black tracking-wide uppercase">Assetto Corsa</span>
                    <span className="mt-0.5 text-[10px] text-slate-400">AC / ACC Racing</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormSim('lmu')}
                    className={`flex flex-col items-center justify-center p-3 border text-center transition-all cursor-pointer rounded-none ${
                      formSim === 'lmu'
                        ? 'border-cyan-400 bg-cyan-950/40 text-white shadow-[0_0_15px_rgba(34,211,238,0.25)]'
                        : 'border-white/10 bg-black/40 text-slate-400 hover:text-white hover:border-slate-400'
                    }`}
                  >
                    <span className="text-xs font-black tracking-wide uppercase">Le Mans Ultimate</span>
                    <span className="mt-0.5 text-[10px] text-slate-400">LMU WEC Official</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300 uppercase font-bold">Categories</label>
                <div className="flex flex-wrap gap-1.5">
                  {['GT3', 'HYPERCAR', 'FORMULA', 'LMP2'].map((tag) => {
                    const isSelected = selectedClasses.includes(tag)
                    let style = 'bg-black/40 text-slate-400 border-white/10 hover:text-white'
                    
                    if (isSelected) {
                      if (tag === 'GT3') style = 'bg-[#009f00] text-white border-green-400 font-extrabold italic shadow-[0_0_12px_rgba(0,159,0,0.35)]'
                      else if (tag === 'HYPERCAR') style = 'bg-[#e10600] text-white border-red-500 font-extrabold italic shadow-[0_0_12px_rgba(225,6,0,0.35)]'
                      else if (tag === 'FORMULA') style = 'bg-[#9333ea] text-white border-purple-400 font-extrabold italic shadow-[0_0_12px_rgba(147,51,234,0.35)]'
                      else if (tag === 'LMP2') style = 'bg-[#0072f0] text-white border-blue-400 font-extrabold italic shadow-[0_0_12px_rgba(0,114,240,0.35)]'
                    } else {
                      if (tag === 'GT3') style = 'bg-black/50 text-slate-400 border-emerald-500/30 hover:border-emerald-500 hover:text-emerald-400'
                      else if (tag === 'HYPERCAR') style = 'bg-black/50 text-slate-400 border-red-500/30 hover:border-red-500 hover:text-red-400'
                      else if (tag === 'FORMULA') style = 'bg-black/50 text-slate-400 border-purple-500/30 hover:border-purple-500 hover:text-purple-400'
                      else if (tag === 'LMP2') style = 'bg-black/50 text-slate-400 border-blue-500/30 hover:border-blue-500 hover:text-blue-400'
                    }

                    return (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => handleClassToggle(tag)}
                        className={`px-3.5 py-1.5 text-xs uppercase tracking-wider transition-all cursor-pointer border ${style}`}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300 uppercase font-bold">Bio / Description</label>
                <textarea
                  name="description"
                  required
                  rows={3}
                  placeholder={
                    hasOwnedTeam
                      ? 'Describe team requirements, target pace, availability and goals...'
                      : 'Describe your experience, pace, availability and expectations...'
                  }
                  className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300 uppercase font-bold">
                  Discord Tag / Contact {!hasOwnedTeam && <span className="text-cyan-400 font-extrabold">* (Required)</span>}
                </label>
                <input
                  type="text"
                  name="contactInfo"
                  required
                  placeholder="e.g. Discord: @discord_username"
                  className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none font-mono focus:border-cyan-400"
                />
                {!hasOwnedTeam && (
                  <p className="mt-1 text-[10px] text-amber-400 font-medium">
                    * Discord contact info is required for drivers to ensure direct contact with teams.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-shell-line/50">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="border border-shell-line px-4 py-2 text-xs font-bold uppercase hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold px-5 py-2 text-xs uppercase transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'Posting...' : 'Post Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Apply Modal */}
      {applyingListingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-fade-in">
          <div className="shell-panel border border-shell-line bg-[#090d16] max-w-md w-full p-5 text-white rounded-none relative shadow-2xl space-y-4">
            <button onClick={() => setApplyingListingId(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer">
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-black uppercase italic text-white flex items-center gap-2">
              <Send className="h-4 w-4 text-cyan-400" />
              Apply to Team Offer
            </h3>

            <form onSubmit={handleApplySubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-slate-300 uppercase font-bold">Message for Team Owner</label>
                <textarea
                  value={applyMessage}
                  onChange={(e) => setApplyMessage(e.target.value)}
                  rows={3}
                  placeholder="Write a message introducing yourself, your pace and availability..."
                  className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-shell-line/50">
                <button
                  type="button"
                  onClick={() => setApplyingListingId(null)}
                  className="border border-shell-line px-3 py-1.5 text-xs font-bold uppercase hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold px-4 py-1.5 text-xs uppercase cursor-pointer"
                >
                  {isSubmitting ? 'Sending...' : 'Send Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {activeInviteListingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-fade-in">
          <div className="shell-panel border border-shell-line bg-[#090d16] max-w-md w-full p-5 text-white rounded-none relative shadow-2xl space-y-4">
            <button onClick={() => setActiveInviteListingId(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer">
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-black uppercase italic text-white flex items-center gap-2">
              <Shield className="h-4 w-4 text-cyan-400" />
              Invite Driver to Your Team
            </h3>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-slate-300 uppercase font-bold">Invitation Message</label>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  rows={3}
                  placeholder="Write a message inviting the driver to join your team..."
                  className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-shell-line/50">
                <button
                  type="button"
                  onClick={() => setActiveInviteListingId(null)}
                  className="border border-shell-line px-3 py-1.5 text-xs font-bold uppercase hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold px-4 py-1.5 text-xs uppercase cursor-pointer"
                >
                  {isSubmitting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
