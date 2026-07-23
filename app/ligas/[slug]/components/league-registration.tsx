'use client'

import { Plus, CheckCircle2, ShieldCheck } from 'lucide-react'
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
  const myRegisteredGroups = groupedRegistrations.filter((group) =>
    myManagedTeams.some((t) => t.id === group.teamId)
  )

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Show ONLY teams managed by the logged-in user in this status badge */}
      {myRegisteredGroups.map((group) => {
        const teamLogo =
          group.logoUrl ||
          `https://placehold.co/60x60/0a1220/ffffff?text=${group.teamName.slice(0, 3).toUpperCase()}`

        return (
          <div
            key={group.teamId}
            className="border-2 border-cyan-500/70 bg-gradient-to-r from-cyan-950/90 via-black/95 to-black/90 px-4 py-2.5 shadow-[0_0_25px_rgba(0,242,254,0.25)] flex items-center gap-3.5 relative rounded-none"
          >
            {/* Team Logo Badge */}
            <div className="h-12 w-12 md:h-14 md:w-14 border-2 border-cyan-400/50 bg-black flex items-center justify-center overflow-hidden shrink-0 shadow-md">
              <img
                src={teamLogo}
                alt={group.teamName}
                className="w-full h-full object-contain p-1"
                onError={(e) => {
                  ;(e.target as any).style.display = 'none'
                }}
              />
            </div>

            {/* Team Details */}
            <div className="space-y-1 text-left">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-cyan-400 shrink-0" />
                <span className="font-black text-white text-sm md:text-base uppercase tracking-wide leading-none">
                  {group.teamName}
                </span>
                <span className="text-[9px] md:text-[10px] font-mono font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 uppercase tracking-wider">
                  TU ESCUDERÍA - INSCRITO
                </span>
              </div>

              {/* Categories Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {group.categories.map((cat) => (
                  <div key={cat} className="flex items-center gap-1.5 bg-black/90 px-2 py-0.5 border border-white/20">
                    <ClassBadge classTag={cat} />
                    <button
                      onClick={() => onWithdrawTeam(group.teamId, cat)}
                      title={`Retirar ${cat}`}
                      className="ml-0.5 text-rose-400 hover:text-rose-300 font-bold hover:bg-rose-500/20 px-1 text-xs transition-colors cursor-pointer"
                    >
                      ×
                    </button>
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
          className="bg-cyan-500 hover:bg-cyan-400 text-black font-black px-4 py-3 text-xs md:text-sm uppercase tracking-wider rounded-none transition-colors flex items-center gap-2 shadow-[0_0_20px_rgba(0,242,254,0.35)] shrink-0 cursor-pointer"
        >
          <Plus className="h-5 w-5" />
          {registeredCarsCount > 0 ? 'Añadir Vehículos' : 'Inscribir Escudería'}
        </button>
      )}
    </div>
  )
}
