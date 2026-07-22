'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
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
import { simulatorLabel } from '@/lib/utils'
import { ClassBadge } from '@/components/class-badge'

type Listing = {
  id: string
  type: 'team_seeking_driver' | 'driver_seeking_team'
  user_id: string
  user_name: string
  user_avatar: string | null
  team_id: string | null
  team_name: string | null
  team_logo: string | null
  team_color?: string | null
  title: string
  description: string
  main_sim: 'ac' | 'lmu'
  class_tag: string
  contact_info: string
  created_at: string
}

type ManagedTeam = {
  id: string
  name: string
  logoUrl: string | null
}

type MarketApplication = {
  id: string
  listingId: string
  teamId: string
  userId: string
  userName: string
  userAvatar: string | null
  contactInfo: string
  status: 'pending' | 'accepted' | 'declined'
  createdAt: string
}

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
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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

  const [activeInviteListingId, setActiveInviteListingId] = useState<string | null>(null)

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
    if (confirm('¿Estás seguro de que deseas retirar tu solicitud?')) {
      try {
        await withdrawApplicationAction(listingId)
      } catch (err) {
        alert('Error al retirar la solicitud')
      }
    }
  }

  const handleHire = async (appId: string) => {
    try {
      await hireDriverFromApplicationAction(appId)
    } catch (err) {
      alert('Error hiring driver')
    }
  }

  const handleDeclineApp = async (appId: string) => {
    try {
      await declineApplicationAction(appId)
    } catch (err) {
      alert('Error declining application')
    }
  }

  const handleInvite = async (listingId: string, teamId: string) => {
    try {
      await inviteDriverFromListingAction(listingId, teamId)
      setActiveInviteListingId(null)
    } catch (err) {
      alert('Error sending invitation')
    }
  }

  const handleAcceptInvite = async (inviteId: string) => {
    try {
      await acceptInviteFromMarketAction(inviteId)
    } catch (err) {
      alert('Error accepting invitation')
    }
  }

  const handleDeclineInvite = async (inviteId: string) => {
    try {
      await declineInviteFromMarketAction(inviteId)
    } catch (err) {
      alert('Error declining invitation')
    }
  }

  return (
    <div className="space-y-6 text-white">
      {/* Header section */}
      <div className="shell-panel p-5 md:p-6 rounded-none">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold uppercase tracking-tight text-white">Driver Market</h1>
            <p className="mt-1 text-slate-400 text-sm">
              Teams looking for drivers and drivers looking for active teams.
            </p>
          </div>
          {currentUser ? (
            myTeams.length === 0 && belongsToTeam ? (
              <button
                disabled
                title="Drivers already in a team cannot post market listings."
                className="bg-slate-800 border border-slate-700 text-slate-500 px-5 py-2.5 text-sm font-bold tracking-wider uppercase rounded-none cursor-not-allowed"
              >
                Already in a Team
              </button>
            ) : (
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-shell-accent hover:bg-red-700 px-5 py-2.5 text-sm font-bold tracking-wider uppercase rounded-none transition-colors cursor-pointer"
              >
                Post a Listing
              </button>
            )
          ) : (
            <div className="border border-shell-line bg-black/40 px-4 py-3 text-sm text-slate-400 rounded-none">
              <a href="/api/auth/steam" className="text-cyan-400 underline font-semibold hover:text-cyan-300">
                Sign in with Steam
              </a>{' '}
              to post a listing.
            </div>
          )}
        </div>
      </div>

      {/* Tabs and filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Navigation Tabs */}
        <div className="flex border border-shell-line bg-black/20 p-1 rounded-none w-fit">
          <button
            onClick={() => setActiveTab('team')}
            className={`px-4 py-2 text-sm font-bold tracking-wide uppercase transition-colors rounded-none flex items-center gap-2 ${
              activeTab === 'team'
                ? 'bg-shell-accent text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Teams seeking driver</span>
            <span className={`px-1.5 py-0.5 text-xxs font-extrabold ${activeTab === 'team' ? 'bg-white text-black' : 'bg-black/60 text-slate-300'}`}>
              {teamsCount}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('driver')}
            className={`px-4 py-2 text-sm font-bold tracking-wide uppercase transition-colors rounded-none flex items-center gap-2 ${
              activeTab === 'driver'
                ? 'bg-shell-accent text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Drivers seeking team</span>
            <span className={`px-1.5 py-0.5 text-xxs font-extrabold ${activeTab === 'driver' ? 'bg-white text-black' : 'bg-black/60 text-slate-300'}`}>
              {driversCount}
            </span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Simulator:</span>
            <select
              value={simFilter}
              onChange={(e) => setSimFilter(e.target.value as any)}
              className="border border-shell-line bg-black/40 px-3 py-1.5 text-xs text-white outline-none rounded-none focus:border-white/30"
            >
              <option value="all">All Simulators</option>
              <option value="ac">Assetto Corsa</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Class Tag:</span>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="border border-shell-line bg-black/40 px-3 py-1.5 text-xs text-white outline-none rounded-none focus:border-cyan-400"
            >
              {CLASS_OPTIONS.map((tag) => (
                <option key={tag} value={tag}>
                  {tag === 'ALL' ? 'All Classes' : tag}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Listings List */}
      <div className="space-y-4">
        {filteredListings.length === 0 ? (
          <div className="shell-panel p-8 text-center border border-shell-line bg-black/10 rounded-none">
            <p className="text-slate-400 text-sm">
              {activeTab === 'team'
                ? 'No teams are looking for drivers right now.'
                : 'No drivers are looking for teams right now.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredListings.map((item) => {
              const isOwner = currentUser?.userId === item.user_id
              let createdDate = 'Recent'
              try {
                const d = new Date(item.created_at)
                if (!isNaN(d.getTime())) {
                  createdDate = d.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                }
              } catch (e) {
                console.error(e)
              }

              const barColor = item.type === 'team_seeking_driver'
                ? (item.team_color || '#1274de')
                : '#f59e0b' // Amber color for pilots

              return (
                <div
                  key={item.id}
                  className="relative border border-shell-line bg-[#090d16]/90 p-5 shadow-xl transition-all duration-300 hover:shadow-[0_12px_24px_rgba(0,0,0,0.55)] flex flex-col justify-between min-h-[220px] rounded-none group"
                  style={{
                    borderLeft: `3px solid ${barColor}`,
                  }}
                >
                  <div>
                    {/* Card Header info */}
                    <div className="flex items-center justify-between border-b border-shell-line/50 pb-3 mb-3">
                      <div className="flex items-center gap-3">
                        {item.type === 'team_seeking_driver' && item.team_name ? (
                          <>
                            <div className="h-14 w-14 bg-zinc-900/90 flex items-center justify-center p-1 overflow-hidden flex-shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.5)] border border-white/10 rounded-none">
                              {item.team_logo ? (
                                <img
                                  src={item.team_logo}
                                  alt={item.team_name}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-zinc-950 font-black text-lg uppercase text-slate-400 rounded-none">
                                  T
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-xxs uppercase tracking-wider text-cyan-400 font-extrabold">Team Post</p>
                              <h3 className="font-extrabold text-sm text-white leading-tight">{item.team_name}</h3>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="h-14 w-14 bg-zinc-900/90 flex items-center justify-center p-1 overflow-hidden flex-shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.5)] border border-white/10 rounded-none">
                              {item.user_avatar ? (
                                <img
                                  src={item.user_avatar}
                                  alt={item.user_name}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-zinc-950 font-black text-lg uppercase text-slate-400 rounded-none">
                                  D
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-xxs uppercase tracking-wider text-amber-400 font-extrabold">Driver Post</p>
                              <h3 className="font-extrabold text-sm text-white leading-tight">{item.user_name}</h3>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-xxs text-slate-500 font-bold uppercase">{createdDate}</span>
                      </div>
                    </div>

                    {/* Badge Filters */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="border border-cyan-400/30 bg-cyan-950/40 px-2.5 py-1 text-[10px] font-bold text-cyan-300 uppercase tracking-wider rounded-none">
                        {simulatorLabel(item.main_sim)}
                      </span>
                      {String(item.class_tag || 'ALL')
                        .split(',')
                        .map((tag) => tag.trim())
                        .filter(Boolean)
                        .map((tag) => (
                          <ClassBadge key={tag} classTag={tag} />
                        ))}
                    </div>

                    {/* Listing Title */}
                    <h2 className="text-base font-bold text-white mb-2 leading-snug">{item.title}</h2>

                    {/* Description */}
                    <p className="text-xs text-slate-300 mb-4 whitespace-pre-line leading-relaxed">
                      {item.description}
                    </p>

                    {/* Interactive Applications and Invites Section */}
                    {currentUser && activeInviteListingId === item.id && (
                      <div className="mt-4 pt-3 border-t border-shell-line/50 space-y-3">
                        {/* CASE B: Driver Seeking Team */}
                        {item.type === 'driver_seeking_team' && myTeams.length > 0 && (
                          <div className="bg-black/35 border border-shell-line p-3 space-y-2 animate-fade-in">
                            <p className="text-xxs text-slate-400 uppercase font-bold tracking-wider">Select Team to Invite:</p>
                            <div className="flex flex-col gap-1.5">
                              {myTeams.map(t => {
                                const alreadyInvited = invites.some(i => i.listingId === item.id && i.teamId === t.id && i.status === 'pending')
                                return (
                                  <button
                                    key={t.id}
                                    disabled={alreadyInvited}
                                    onClick={() => handleInvite(item.id, t.id)}
                                    className="w-full text-left border border-shell-line hover:bg-white/5 px-2.5 py-1.5 text-xs text-white disabled:opacity-40 disabled:hover:bg-transparent font-bold flex justify-between items-center rounded-none"
                                  >
                                    <span>{t.name}</span>
                                    {alreadyInvited && <span className="text-[10px] text-cyan-400 font-extrabold">ALREADY INVITED</span>}
                                  </button>
                                )
                              })}
                            </div>
                            <button
                              onClick={() => setActiveInviteListingId(null)}
                              className="text-xxs text-rose-400 hover:underline font-bold"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions / Contact bottom bar */}
                  <div className="border-t border-shell-line/50 pt-3 mt-auto flex items-center justify-between">
                    <div className="text-xs">
                      <span className="text-slate-400 block text-xxs uppercase tracking-wider">Contact Details</span>
                      <span className="font-mono font-bold text-slate-200">{item.contact_info}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isOwner ? (
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="border border-rose-500/40 hover:bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-355 transition-colors rounded-none"
                        >
                          Delete
                        </button>
                      ) : (
                        currentUser && (
                          <>
                            {/* CASE A: Team Seeking Driver (Apply Button) */}
                            {item.type === 'team_seeking_driver' && (
                              <div className="w-full flex flex-col items-end gap-2">
                                {(() => {
                                  const userApp = applications.find(a => a.listingId === item.id && a.userId === currentUser.userId)
                                  if (userApp) {
                                    if (userApp.status === 'accepted') {
                                      return (
                                        <span className="text-xxs text-emerald-400 font-extrabold flex items-center gap-1 bg-emerald-950/40 border border-emerald-500/50 px-2.5 py-1 uppercase rounded-none">
                                          ✓ Aceptado
                                        </span>
                                      )
                                    }
                                    return (
                                      <div className="flex items-center gap-2">
                                        <span className="text-xxs text-emerald-400 font-extrabold flex items-center gap-1 bg-emerald-950/25 border border-emerald-500/25 px-2.5 py-1 uppercase rounded-none">
                                          ✓ Applied
                                        </span>
                                        <button
                                          onClick={() => handleWithdrawApplication(item.id)}
                                          className="text-xxs text-rose-400 hover:text-rose-300 hover:underline font-bold transition-colors cursor-pointer"
                                        >
                                          Cancelar
                                        </button>
                                      </div>
                                    )
                                  }
                                  return null
                                })()}
                                {!applications.some(a => a.listingId === item.id && a.userId === currentUser.userId) && (
                                  applyingListingId === item.id ? (
                                    <div className="w-full max-w-[280px] space-y-2 mt-2 bg-zinc-950/80 p-2.5 border border-shell-line text-left">
                                      <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                                        Mensaje / Experiencia (opcional)
                                      </label>
                                      <textarea
                                        value={applyMessage}
                                        onChange={(e) => setApplyMessage(e.target.value)}
                                        placeholder="Breve descripción o experiencia..."
                                        className="w-full min-h-[60px] bg-zinc-900 border border-shell-line p-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 rounded-none placeholder:text-slate-600 resize-none"
                                        maxLength={300}
                                      />
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          onClick={() => {
                                            setApplyingListingId(null)
                                            setApplyMessage('')
                                          }}
                                          className="text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-wider px-2 py-1 rounded-none cursor-pointer"
                                        >
                                          Cancelar
                                        </button>
                                        <button
                                          onClick={() => handleApplySubmit(item.id)}
                                          className="bg-shell-accent hover:bg-red-700 text-white font-bold text-[10px] px-3 py-1 uppercase tracking-wider rounded-none cursor-pointer transition-colors"
                                        >
                                          Enviar
                                        </button>
                                      </div>
                                    </div>
                                  ) : belongsToTeam ? (
                                    <button
                                      disabled
                                      title="No puedes postularte a otros equipos si ya perteneces a uno."
                                      className="bg-zinc-800 border border-zinc-700 text-zinc-500 font-bold text-[10px] px-3 py-1.5 uppercase tracking-wider rounded-none cursor-not-allowed"
                                    >
                                      Ya en un equipo
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setApplyingListingId(item.id)
                                        setApplyMessage('')
                                      }}
                                      className="bg-shell-accent hover:bg-red-700 text-white font-bold text-[10px] px-3 py-1.5 uppercase tracking-wider rounded-none transition-colors cursor-pointer"
                                    >
                                      Apply to Team
                                    </button>
                                  )
                                )}
                              </div>
                            )}

                            {/* CASE B: Driver Seeking Team (Invite Button) */}
                            {item.type === 'driver_seeking_team' && myTeams.length > 0 && activeInviteListingId !== item.id && (
                              <button
                                onClick={() => {
                                  if (myTeams.length === 1) {
                                    handleInvite(item.id, myTeams[0].id)
                                  } else {
                                    setActiveInviteListingId(item.id)
                                  }
                                }}
                                className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-[10px] px-3 py-1.5 uppercase tracking-wider rounded-none transition-colors"
                              >
                                Invite to Team
                              </button>
                            )}
                          </>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* "Post a Listing" Modal dialog */}
      {isModalOpen && mounted && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-[150] overflow-y-auto bg-black/85 backdrop-blur-sm p-4 flex justify-center items-start md:items-center">
              <div className="w-full max-w-2xl bg-[#090d16] border border-shell-line shadow-2xl my-auto relative">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-shell-line p-5">
                  <h2 className="text-lg font-black uppercase italic tracking-wider text-white">
                    Create Market Listing
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
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

                  {/* Listing type selector */}
                  {myTeams.length > 0 && !belongsToTeam && (
                    <div>
                      <label className="mb-1 block text-xs text-slate-355 uppercase tracking-wider font-semibold">Post Type</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setFormType('team_seeking_driver')}
                          className={`py-2 text-xs font-bold uppercase tracking-wide transition-all border rounded-none cursor-pointer ${
                            formType === 'team_seeking_driver'
                              ? 'border-white/30 bg-white/5 text-white'
                              : 'border-shell-line bg-black/20 text-slate-400 hover:text-white'
                          }`}
                        >
                          Team Seeking Driver
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormType('driver_seeking_team')}
                          className={`py-2 text-xs font-bold uppercase tracking-wide transition-all border rounded-none cursor-pointer ${
                            formType === 'driver_seeking_team'
                              ? 'border-white/30 bg-white/5 text-white'
                              : 'border-shell-line bg-black/20 text-slate-400 hover:text-white'
                          }`}
                        >
                          Driver Seeking Team
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Team Selector */}
                  {formType === 'team_seeking_driver' && (
                    <div>
                      <label className="mb-1 block text-xs text-slate-355 uppercase tracking-wider font-semibold">Select Team</label>
                      {myTeams.length === 0 ? (
                        <div className="border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 rounded-none">
                          You do not own or manage any teams. You can only create "Driver Seeking Team" listings.
                        </div>
                      ) : (
                        <select
                          value={formTeamId}
                          onChange={(e) => setFormTeamId(e.target.value)}
                          className="w-full border border-shell-line bg-black/40 px-3 py-2 text-sm text-white outline-none rounded-none focus:border-white/30 cursor-pointer"
                        >
                          {myTeams.map((team) => (
                            <option key={team.id} value={team.id}>
                              {team.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {/* Title input */}
                  <div>
                    <label className="mb-1 block text-xs text-slate-355 uppercase tracking-wider font-semibold">Title</label>
                    <input
                      name="title"
                      type="text"
                      required
                      placeholder="e.g. Pro GT3 driver wanted for ALR Endurance Season 4"
                      className="w-full border border-shell-line bg-black/40 px-3 py-2 text-sm text-white outline-none rounded-none focus:border-white/30"
                    />
                  </div>

                  {/* Simulator & Class selection */}
                  <div className="space-y-6">
                    <div>
                      <label className="mb-1 block text-xs text-slate-355 uppercase tracking-wider font-semibold">Simulator</label>
                      <select
                        name="mainSim"
                        value={formSim}
                        onChange={(e) => setFormSim(e.target.value as any)}
                        className="w-full border border-shell-line bg-black/40 px-3 py-2 text-sm text-white outline-none rounded-none cursor-pointer focus:border-white/30"
                      >
                        <option value="ac">Assetto Corsa</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs text-slate-355 uppercase tracking-wider font-semibold">Category Class</label>
                      <div className="flex flex-wrap gap-3">
                        {['GT3', 'HYPERCAR', 'LMP2'].map((tag) => {
                          const isSelected = selectedClasses.includes(tag)
                          let activeClass = ''
                          if (isSelected) {
                            if (tag === 'GT3') {
                              activeClass = 'bg-[#009f00] text-white border-green-400/20 font-black italic'
                            } else if (tag === 'HYPERCAR') {
                              activeClass = 'bg-[#e10600] text-white border-red-500/20 font-black italic'
                            } else if (tag === 'LMP2') {
                              activeClass = 'bg-[#0072f0] text-white border-blue-400/20 font-black italic'
                            }
                          } else {
                            activeClass = 'border-shell-line bg-black/20 text-slate-400 hover:text-white'
                          }

                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => handleClassToggle(tag)}
                              className={`border px-4 py-1.5 text-xs tracking-wider uppercase transition-all rounded-none cursor-pointer ${activeClass}`}
                            >
                              {tag}
                            </button>
                          )
                        })}
                      </div>
                      <input type="hidden" name="classTag" value={selectedClasses.join(',')} />
                    </div>
                  </div>

                  {/* Description textarea */}
                  <div>
                    <label className="mb-1 block text-xs text-slate-355 uppercase tracking-wider font-semibold">Description</label>
                    <textarea
                      name="description"
                      required
                      rows={4}
                      placeholder="Provide expectations, pace requirements, schedules, etc."
                      className="w-full border border-shell-line bg-black/40 px-3 py-2 text-sm text-white outline-none rounded-none focus:border-white/30 resize-none"
                    />
                  </div>

                  {/* Contact details */}
                  <div>
                    <label className="mb-1 block text-xs text-slate-355 uppercase tracking-wider font-semibold">Contact Info</label>
                    <input
                      name="contactInfo"
                      type="text"
                      required
                      placeholder="e.g. Discord: @johndoe"
                      className="w-full border border-shell-line bg-black/40 px-3 py-2 text-sm text-white outline-none rounded-none focus:border-white/30"
                    />
                  </div>

                  {/* Actions submit/cancel */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-shell-line/50">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      disabled={isSubmitting}
                      className="border border-shell-line bg-transparent hover:bg-white/5 px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || (formType === 'team_seeking_driver' && myTeams.length === 0)}
                      className="bg-shell-accent hover:bg-red-700 disabled:opacity-50 px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-none transition-colors cursor-pointer"
                    >
                      {isSubmitting ? 'Posting...' : 'Create Post'}
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
