'use client'

import { Trophy, FileText } from 'lucide-react'
import { ClassBadge } from '@/components/class-badge'

interface RecentResult {
  round: string
  GT3: Array<{ pos: number; team: string; dorsal?: number | null; time: string; gap: string; points: number }>
  HYPERCAR: Array<{ pos: number; team: string; dorsal?: number | null; time: string; gap: string; points: number }>
}

interface LeagueResultsProps {
  isAdmin: boolean
  recentResults: RecentResult
  onOpenResultsModal: () => void
}

export function LeagueResults({
  isAdmin,
  recentResults,
  onOpenResultsModal,
}: LeagueResultsProps) {
  return (
    <section className="shell-panel p-4 md:p-5 rounded-none space-y-4">
      <div className="flex items-center justify-between border-b border-shell-line pb-3">
        <div>
          <h2 className="text-xl font-bold uppercase tracking-tight text-white flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" />
            Recent Race Results
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Top finishers from {recentResults.round}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={onOpenResultsModal}
            className="border border-cyan-500/40 hover:bg-cyan-500/10 px-3 py-1.5 text-xs font-bold uppercase text-cyan-400 rounded-none transition-colors flex items-center gap-1.5"
          >
            <FileText className="h-3.5 w-3.5" />
            Import AC JSON Results
          </button>
        )}
      </div>

      {recentResults.GT3.length === 0 && recentResults.HYPERCAR.length === 0 ? (
        <div className="border border-dashed border-shell-line p-8 text-center">
          <p className="text-sm text-slate-400">No race results imported yet.</p>
          {isAdmin && (
            <button
              onClick={onOpenResultsModal}
              className="mt-3 text-xs text-cyan-400 font-bold uppercase hover:underline"
            >
              + Upload Assetto Corsa JSON Result
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {recentResults.GT3.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-white/10 pb-1">
                <ClassBadge classTag="GT3" className="text-[10px]" />
                <span className="text-[10px] text-slate-400 uppercase font-mono">Top 3 Podium</span>
              </div>
              <div className="space-y-1">
                {recentResults.GT3.slice(0, 3).map((r) => (
                  <div
                    key={r.pos}
                    className="flex items-center justify-between bg-black/40 border border-shell-line/30 px-3 py-1.5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-black text-amber-400 w-4">#{r.pos}</span>
                      <span className="font-bold text-slate-200">{r.team}</span>
                      {r.dorsal != null && (
                        <span className="text-[10px] font-mono font-bold text-cyan-300">#{r.dorsal}</span>
                      )}
                    </div>
                    <span className="font-mono text-slate-400 text-[11px]">{r.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recentResults.HYPERCAR.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-white/10 pb-1">
                <ClassBadge classTag="HYPERCAR" className="text-[10px]" />
                <span className="text-[10px] text-slate-400 uppercase font-mono">Top 3 Podium</span>
              </div>
              <div className="space-y-1">
                {recentResults.HYPERCAR.slice(0, 3).map((r) => (
                  <div
                    key={r.pos}
                    className="flex items-center justify-between bg-black/40 border border-shell-line/30 px-3 py-1.5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-black text-amber-400 w-4">#{r.pos}</span>
                      <span className="font-bold text-slate-200">{r.team}</span>
                      {r.dorsal != null && (
                        <span className="text-[10px] font-mono font-bold text-cyan-300">#{r.dorsal}</span>
                      )}
                    </div>
                    <span className="font-mono text-slate-400 text-[11px]">{r.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
