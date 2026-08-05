import { FormattedDate } from '@/components/formatted-date'
import type { LeagueParticipation, RecentResult } from '../team-utils'

type TeamLeaguesSectionProps = {
  leagueParticipation: LeagueParticipation[]
  recentResults: RecentResult[]
  accentHard: string
}

export function TeamLeaguesSection({ leagueParticipation, recentResults, accentHard }: TeamLeaguesSectionProps) {
  return (
    <>
      <section className="shell-panel p-4 md:p-5 rounded-none">
        <h2 className="text-2xl font-black uppercase italic text-white">Team Leagues</h2>
        <div className="mt-2 h-1 w-52 rounded-none" style={{ background: `linear-gradient(90deg, ${accentHard}, transparent)` }} />
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {leagueParticipation.length === 0 ? (
            <p className="text-sm text-slate-300">This team does not have any registered participation in any leagues yet.</p>
          ) : (
            leagueParticipation.map((league) => (
              <article key={league.leagueId} className="border border-shell-line bg-[#0a101a] p-3 rounded-none">
                <h3 className="text-xl font-black uppercase italic text-white">{league.title}</h3>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">{league.simulator}</p>
                <div className="mt-3 grid grid-cols-1 gap-2 max-w-[140px]">
                  <div className="border border-shell-line bg-black/20 p-2 text-center rounded-none">
                    <p className="text-[10px] uppercase text-slate-400">Drivers</p>
                    <p className="text-lg font-black text-white">{league.teamDriversInLeague}</p>
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate-300">{league.nextEventAt ? <FormattedDate date={league.nextEventAt} /> : 'No scheduled races.'}</p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="shell-panel p-4 md:p-5 rounded-none">
        <h2 className="text-2xl font-black uppercase italic text-white">Latest Results</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {recentResults.length === 0 ? (
            <p className="text-sm text-slate-300">No results loaded yet. Once race positions are recorded, they will appear here.</p>
          ) : (
            recentResults.map((result) => (
              <div key={result.id} className="border border-shell-line bg-black/20 p-4 rounded-none flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 truncate">
                    {result.leagueTitle}
                  </p>
                  <p className="mt-0.5 text-base font-black uppercase italic text-white truncate">
                    {result.eventTitle}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="text-[9px] uppercase tracking-wider text-slate-400">Position</p>
                    <p className="text-lg font-black italic text-cyan-400 leading-none">P{result.position}</p>
                  </div>
                  <div className="text-right border-l border-white/10 pl-4">
                    <p className="text-[9px] uppercase tracking-wider text-slate-400">Points</p>
                    <p className="text-lg font-black italic text-emerald-400 leading-none">{result.points ?? '0'} pts</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  )
}
