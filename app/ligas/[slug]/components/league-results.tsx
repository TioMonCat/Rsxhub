'use client'

import { Trophy, FileText } from 'lucide-react'
import { ClassBadge } from '@/components/class-badge'
import type { LeagueEvent } from '@/types'

interface RecentResult {
  round: string
  [key: string]: any
}

interface LeagueResultsProps {
  isAdmin: boolean
  recentResults: RecentResult
  classTags?: string[]
  events?: any[]
  onOpenResultsModal: () => void
}

export function LeagueResults({
  isAdmin,
  recentResults,
  classTags = ['GT3', 'LMP2'],
  events = [],
  onOpenResultsModal,
}: LeagueResultsProps) {
  // Determine subtitle: title of round and circuit only
  const firstEvent = events[0]
  const roundSubtitle = firstEvent
    ? `${firstEvent.title} - ${firstEvent.circuitName}`
    : recentResults.round && recentResults.round !== 'No rounds completed yet'
    ? recentResults.round
    : '6 HOURS OF LE MANS - CIRCUIT DE LA SARTHE, LE MANS'

  // Default demo Top 3 podium data per class tag
  const defaultPodiums: Record<string, Array<{ pos: number; team: string; dorsal: number; time: string }>> = {
    GT3: [
      { pos: 1, team: 'Apex Latam Racing', dorsal: 8, time: '6:01:24.182' },
      { pos: 2, team: 'Red Bull Sim Racing', dorsal: 33, time: '+14.215s' },
      { pos: 3, team: 'Ferrari Esports', dorsal: 51, time: '+32.084s' },
    ],
    LMP2: [
      { pos: 1, team: 'Apex Latam Racing', dorsal: 45, time: '6:00:12.890' },
      { pos: 2, team: 'Apex Latam Racing', dorsal: 12, time: '+8.431s' },
      { pos: 3, team: 'Porsche Coanda Esports', dorsal: 91, time: '+21.650s' },
    ],
    HYPERCAR: [
      { pos: 1, team: 'Apex Latam Racing', dorsal: 1, time: '5:58:45.310' },
      { pos: 2, team: 'BMW M Team BS+COMPETITION', dorsal: 46, time: '+11.102s' },
      { pos: 3, team: 'Red Bull Sim Racing', dorsal: 33, time: '+25.940s' },
    ],
  }

  const tagsToDisplay = classTags.length > 0 ? classTags : ['GT3', 'LMP2']

  return (
    <section className="shell-panel p-4 md:p-5 rounded-none space-y-4">
      <div className="flex items-center justify-between border-b border-shell-line pb-3">
        <div>
          <h2 className="text-xl font-bold uppercase tracking-tight text-white flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" />
            Recent Race Results
          </h2>
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide mt-0.5">
            {roundSubtitle}
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

      <div className={`grid gap-4 grid-cols-1 ${tagsToDisplay.length > 1 ? 'md:grid-cols-2' : ''}`}>
        {tagsToDisplay.map((tag) => {
          const categoryResults = (recentResults[tag] && recentResults[tag].length > 0)
            ? recentResults[tag].slice(0, 3)
            : defaultPodiums[tag] || defaultPodiums['GT3']

          return (
            <div key={tag} className="space-y-2">
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                <ClassBadge classTag={tag} className="text-xs px-2.5 py-0.5 font-black" />
                <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">Top 3 Podium</span>
              </div>
              <div className="space-y-1.5">
                {categoryResults.slice(0, 3).map((r: any) => (
                  <div
                    key={r.pos}
                    className="flex items-center justify-between bg-black/40 border border-shell-line/30 px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`font-black w-5 text-center text-sm ${
                          r.pos === 1 ? 'text-amber-400' : r.pos === 2 ? 'text-slate-300' : 'text-amber-600'
                        }`}
                      >
                        {r.pos === 1 ? '🥇' : r.pos === 2 ? '🥈' : '🥉'}
                      </span>
                      <span className="font-bold text-slate-100 truncate">{r.team}</span>
                      {r.dorsal != null && (
                        <span className="text-[10px] font-mono font-black text-cyan-300 shrink-0">
                          #{r.dorsal}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-slate-300 font-bold text-xs shrink-0 ml-2">{r.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
