'use client'

import { AlertCircle, Plus } from 'lucide-react'
import { ClassBadge } from '@/components/class-badge'
import { League, ManagedTeam } from '../hooks/use-league-state'

interface LeagueRegistrationProps {
  league: League
  session: any
  myManagedTeams: ManagedTeam[]
  groupedRegistrations: Array<{ teamId: string; teamName: string; categories: string[] }>
  registeredCarsCount: number
  onOpenRegisterModal: () => void
  onWithdrawTeam: (teamId: string, classTag: string) => void
}

export function LeagueRegistration({
  league,
  session,
  myManagedTeams,
  groupedRegistrations,
  registeredCarsCount,
  onOpenRegisterModal,
  onWithdrawTeam,
}: LeagueRegistrationProps) {
  return (
    <div className="border border-shell-line bg-black/40 p-2.5 rounded-none max-w-md space-y-2">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1">
        <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Team Registration</p>
        {groupedRegistrations.length > 0 && (
          <span className="text-[10px] font-mono text-cyan-400">
            {groupedRegistrations.length} team{groupedRegistrations.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {!session ? (
        <p className="text-xs text-slate-400 italic">Please sign in to register.</p>
      ) : myManagedTeams.length === 0 ? (
        <p className="text-xs text-amber-400 font-semibold flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          Only Team Leaders can sign up.
        </p>
      ) : (
        <div className="space-y-1.5 w-full">
          {groupedRegistrations.map((group) => (
            <div
              key={group.teamId}
              className="border border-slate-700 bg-black/60 px-2 py-1 text-xxs flex items-center justify-between gap-2"
            >
              <span className="font-bold text-slate-200 text-xs truncate">{group.teamName}</span>
              <div className="flex flex-wrap items-center gap-1">
                {group.categories.map((cat) => (
                  <div key={cat} className="flex items-center gap-1 bg-black/80 px-1.5 py-0.5 border border-white/10">
                    <ClassBadge classTag={cat} className="scale-90" />
                    <button
                      onClick={() => onWithdrawTeam(group.teamId, cat)}
                      title={`Withdraw ${cat}`}
                      className="ml-0.5 text-rose-400 hover:text-rose-300 font-bold hover:bg-rose-500/20 px-1 rounded-none transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {league.registrationOpen && league.status === 'open' && (
            <button
              onClick={onOpenRegisterModal}
              className="bg-shell-accent hover:bg-red-700 px-3 py-1.5 text-xs font-bold uppercase text-white rounded-none transition-colors w-full flex items-center justify-center gap-1 mt-1"
            >
              <Plus className="h-3.5 w-3.5" />
              {registeredCarsCount > 0 ? 'Add New Vehicles' : 'Register Team'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
