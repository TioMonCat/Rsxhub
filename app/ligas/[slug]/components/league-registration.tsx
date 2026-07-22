'use client'

import { Plus, Users } from 'lucide-react'
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
  const isLeader = myManagedTeams.length > 0

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* List of registered teams in this league */}
      {groupedRegistrations.map((group) => {
        const canManageThisTeam = myManagedTeams.some((t) => t.id === group.teamId)
        return (
          <div
            key={group.teamId}
            className="border border-cyan-500/40 bg-cyan-950/40 px-2.5 py-1 text-xs flex items-center gap-2"
          >
            <span className="font-extrabold text-white text-xs flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-cyan-400" />
              {group.teamName}
            </span>
            <div className="flex items-center gap-1">
              {group.categories.map((cat) => (
                <div key={cat} className="flex items-center gap-1 bg-black/80 px-1.5 py-0.5 border border-white/10">
                  <ClassBadge classTag={cat} className="scale-90" />
                  {canManageThisTeam && (
                    <button
                      onClick={() => onWithdrawTeam(group.teamId, cat)}
                      title={`Withdraw ${cat}`}
                      className="ml-0.5 text-rose-400 hover:text-rose-300 font-bold hover:bg-rose-500/20 px-1 rounded-none transition-colors"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Button for Team Leaders */}
      {isLeader && league.registrationOpen && league.status === 'open' && (
        <button
          onClick={onOpenRegisterModal}
          className="bg-shell-accent hover:bg-red-700 px-3 py-1.5 text-xs font-bold uppercase text-white rounded-none transition-colors flex items-center gap-1 shadow-md"
        >
          <Plus className="h-3.5 w-3.5" />
          {registeredCarsCount > 0 ? 'Add Vehicles' : 'Register Team'}
        </button>
      )}
    </div>
  )
}
