'use client'

import { Trash, MessageSquare } from 'lucide-react'
import { ClassBadge } from '@/components/class-badge'
import { simulatorLabel } from '@/lib/utils'

export type Listing = {
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

export type ManagedTeam = {
  id: string
  name: string
  logoUrl: string | null
}

interface MarketDriverCardsProps {
  listings: Listing[]
  currentUserId?: string
  myTeams: ManagedTeam[]
  invites: Array<{ listingId: string; status: string; teamName: string }>
  onDeleteListing: (id: string) => void
  onInviteClick: (listingId: string) => void
}

export function MarketDriverCards({
  listings,
  currentUserId,
  myTeams,
  invites,
  onDeleteListing,
  onInviteClick,
}: MarketDriverCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {listings.map((item) => {
        const isOwner = currentUserId === item.user_id
        const classes = String(item.class_tag || '')
          .split(',')
          .map((t) => t.trim().toUpperCase())
          .filter(Boolean)
        const myTeamInvite = invites.find((inv) => inv.listingId === item.id)

        return (
          <div
            key={item.id}
            className="shell-panel p-4 rounded-none border border-shell-line flex flex-col justify-between hover:border-cyan-500/40 transition-colors"
          >
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-shell-line pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                    <img
                      src={
                        item.user_avatar ||
                        `https://placehold.co/40x40/0a1220/ffffff?text=${(item.user_name || 'D').slice(0, 2).toUpperCase()}`
                      }
                      alt={item.user_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white truncate max-w-[140px]">
                      {item.user_name}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">Driver</span>
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

              {myTeams.length > 0 && !isOwner && (
                <div>
                  {myTeamInvite ? (
                    <span className="text-[10px] font-bold uppercase text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-1">
                      Invited ({myTeamInvite.teamName})
                    </span>
                  ) : (
                    <button
                      onClick={() => onInviteClick(item.id)}
                      className="bg-cyan-500 hover:bg-cyan-400 text-black px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors"
                    >
                      Invite to Team
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
