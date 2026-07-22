'use client'

import { Plus, CheckCircle2 } from 'lucide-react'
import { ClassBadge } from '@/components/class-badge'
import { League, ManagedTeam } from '../hooks/use-league-state'

interface LeagueRegistrationProps {
  league: League
  session: any
  myManagedTeams: ManagedTeam[]
  groupedRegistrations: Array<{ teamId: string; teamName: string; logoUrl: string | null; categories: string[] }>
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
    <div className="flex flex-wrap items-center gap-3">
      {/* List of registered teams in this league */}
      {groupedRegistrations.map((group) => {
        const canManageThisTeam = myManagedTeams.some((t) => t.id === group.teamId)
        const teamLogo =
          group.logoUrl ||
          `https://placehold.co/40x40/0a1220/ffffff?text=${group.teamName.slice(0, 3).toUpperCase()}`

        return (
          <div
            key={group.teamId}
            className="border-2 border-cyan-500/60 bg-gradient-to-r from-cyan-950/90 via-black/95 to-black/90 px-3 py-1.5 shadow-[0_0_20px_rgba(0,242,254,0.2)] flex items-center gap-2.5 relative"
          >
            {/* Team Logo Badge */}
            <div className="h-8 w-8 border border-cyan-400/40 bg-black flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
              <img
                src={teamLogo}
                alt={group.teamName}
                className="w-full h-full object-contain p-0.5"
                onError={(e) => {
                  ;(e.target as any).style.display = 'none'
                }}
              />
            </div>

            {/* Team Details */}
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span className="font-extrabold text-white text-xs uppercase tracking-wide leading-none">
                  {group.teamName}
                </span>
                <span className="text-[8px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1 py-0.2 uppercase">
                  INSCRIPTO
                </span>
              </div>

              {/* Categories Pills */}
              <div className="flex items-center gap-1">
                {group.categories.map((cat) => (
                  <div key={cat} className="flex items-center gap-1 bg-black/90 px-1.5 py-0.5 border border-white/20">
                    <ClassBadge classTag={cat} className="scale-90" />
                    {canManageThisTeam && (
                      <button
                        onClick={() => onWithdrawTeam(group.teamId, cat)}
                        title={`Retirar ${cat}`}
                        className="ml-0.5 text-rose-400 hover:text-rose-300 font-bold hover:bg-rose-500/20 px-1 transition-colors"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })}

      {/* Action Button for Team Leaders */}
      {isLeader && league.registrationOpen && league.status === 'open' && (
        <button
          onClick={onOpenRegisterModal}
          className="bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold px-3 py-2 text-xs uppercase tracking-wider rounded-none transition-colors flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,242,254,0.3)] shrink-0"
        >
          <Plus className="h-4 w-4" />
          {registeredCarsCount > 0 ? 'Añadir Vehículos' : 'Inscribir Escudería'}
        </button>
      )}
    </div>
  )
}
