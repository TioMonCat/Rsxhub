'use client'

import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import {
  createMarketListing,
  deleteMarketListing,
  applyToTeamListingAction,
  withdrawApplicationAction,
  hireDriverFromApplicationAction,
  declineApplicationAction,
  inviteDriverFromListingAction,
  acceptInviteFromMarketAction,
  declineInviteFromMarketAction
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

  // Form states
  const [formType, setFormType] = useState<'team_seeking_driver' | 'driver_seeking_team'>(
    myTeams.length > 0 ? 'team_seeking_driver' : 'driver_seeking_team'
  )
  const [formSim, setFormSim] = useState<'ac' | 'lmu'>('ac')
  const [selectedClasses, setSelectedClasses] = useState<string[]>(['GT3'])
  const [formTeamId, setFormTeamId] = useState(myTeams[0]?.id || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [applyingListingId, setApplyingListingId] = useState<string | null>(null)
  const [applyMessage, setApplyMessage] = useState('')
  const [activeInviteListingId, setActiveInviteListingId] = useState<string | null>(null)

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
      formData.set('teamId', formTeamId)
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

  const handleApplySubmit = async (listingId: string) => {
    try {
      await applyToTeamListingAction(listingId, applyMessage)
      setApplyingListingId(null)
      setApplyMessage('')
    } catch (err) {
      alert('Error applying to team')
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

        {/* Action Button */}
        {currentUser && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-shell-accent hover:bg-red-700 text-white px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-none transition-colors flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Create Market Listing
          </button>
        )}
      </div>

      {/* Class & Sim Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-black/20 border border-shell-line p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2">Category:</span>
          {CLASS_OPTIONS.map((cls) => (
            <button
              key={cls}
              onClick={() => setClassFilter(cls)}
              className={`px-3 py-1 text-[11px] font-extrabold uppercase transition-all rounded-none ${
                classFilter === cls
                  ? 'bg-white text-black'
                  : 'bg-black/40 text-slate-400 hover:text-white border border-white/10'
              }`}
            >
              {cls}
            </button>
          ))}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fade-in">
          <div className="shell-panel border border-shell-line bg-zinc-950 max-w-lg w-full p-5 text-white rounded-none relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-xl font-bold uppercase tracking-tight text-white mb-2">Create Market Listing</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">Listing Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as any)}
                  className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none font-bold"
                >
                  {myTeams.length > 0 && <option value="team_seeking_driver">Team Seeking Driver</option>}
                  <option value="driver_seeking_team">Driver Seeking Team</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">Title</label>
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="e.g. Looking for GT3 Driver for 24h Endurance"
                  className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">Description</label>
                <textarea
                  name="description"
                  required
                  rows={3}
                  placeholder="Describe your requirements, pace, or schedule expectations..."
                  className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300 uppercase font-semibold">Contact Info (Discord / Email)</label>
                <input
                  type="text"
                  name="contactInfo"
                  required
                  placeholder="e.g. Discord: driver#1234"
                  className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-shell-line/50">
                <button type="button" onClick={() => setIsModalOpen(false)} className="border border-shell-line px-4 py-2 text-xs font-bold uppercase">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="bg-shell-accent px-5 py-2 text-xs font-bold uppercase text-white">
                  {isSubmitting ? 'Posting...' : 'Post Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
