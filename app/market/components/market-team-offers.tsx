'use client'

import { Trash, MessageSquare, Users } from 'lucide-react'
import { ClassBadge } from '@/components/class-badge'
import { simulatorLabel } from '@/lib/utils'
import { Listing } from './market-driver-cards'

export type MarketApplication = {
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

interface MarketTeamOffersProps {
  listings: Listing[]
  currentUserId?: string
  applications: MarketApplication[]
  onDeleteListing: (id: string) => void
  onApplyClick: (listingId: string) => void
  onWithdrawApplication: (listingId: string) => void
}

export function MarketTeamOffers({
  listings,
  currentUserId,
  applications,
  onDeleteListing,
  onApplyClick,
  onWithdrawApplication,
}: MarketTeamOffersProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {listings.map((item) => {
        const isOwner = currentUserId === item.user_id
        const classes = String(item.class_tag || '')
          .split(',')
          .map((t) => t.trim().toUpperCase())
          .filter(Boolean)
        const myApplication = applications.find((app) => app.listingId === item.id)

        return (
          <div
            key={item.id}
            className="shell-panel p-4 rounded-none border border-shell-line flex flex-col justify-between hover:border-cyan-500/40 transition-colors"
          >
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-shell-line pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-none bg-slate-900 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                    {item.team_logo ? (
                      <img src={item.team_logo} alt={item.team_name || ''} className="w-full h-full object-contain" />
                    ) : (
                      <Users className="h-4 w-4 text-cyan-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white truncate max-w-[140px]">
                      {item.team_name || 'Team Offer'}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">By {item.user_name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 border border-shell-line bg-black/40 px-2 py-0.5">
                    {simulatorLabel(item.main_sim)}
                  </span>
                  {isOwner && (
                    <button
                      onClick={() => onDeleteListing(item.id)}
                      className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Delete Listing"
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Title & Info */}
              <div>
                <h3 className="text-sm font-extrabold uppercase italic text-white tracking-tight">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-300 mt-1 line-clamp-3 leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Class Badges */}
              <div className="flex flex-wrap gap-1 pt-1">
                {classes.map((cls) => (
                  <ClassBadge key={cls} classTag={cls} className="text-[9px]" />
                ))}
              </div>
            </div>

            {/* Contact & Actions */}
            <div className="border-t border-shell-line/40 pt-3 mt-3 flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-400 font-mono text-[10px] truncate max-w-[130px]" title={item.contact_info}>
                <MessageSquare className="h-3 w-3 inline mr-1 text-cyan-400" />
                {item.contact_info}
              </span>

              {!isOwner && currentUserId && (
                <div>
                  {myApplication ? (
                    myApplication.status === 'pending' ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-1">
                          Applied
                        </span>
                        <button
                          onClick={() => onWithdrawApplication(item.id)}
                          className="text-[10px] font-bold text-rose-400 hover:text-rose-300 underline"
                        >
                          Withdraw
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold uppercase text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-1">
                        {myApplication.status}
                      </span>
                    )
                  ) : (
                    <button
                      onClick={() => onApplyClick(item.id)}
                      className="bg-shell-accent hover:bg-red-700 text-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors"
                    >
                      Apply Now
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
