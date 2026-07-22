'use client'

import { Calendar, Settings, Trash } from 'lucide-react'
import { FormattedDate } from '@/components/formatted-date'
import { simulatorLabel } from '@/lib/utils'
import { League } from '../hooks/use-league-state'

interface LeagueBannerProps {
  league: League
  accentHex: string
  isAdmin: boolean
  onEditSettings: () => void
  onDeleteLeague: () => void
  registrationElement?: React.ReactNode
}

export function LeagueBanner({
  league,
  accentHex,
  isAdmin,
  onEditSettings,
  onDeleteLeague,
  registrationElement,
}: LeagueBannerProps) {
  return (
    <section className="overflow-hidden border border-shell-line bg-[#0f1521] rounded-none relative">
      <div
        className="h-52 border-b border-shell-line bg-cover bg-center relative"
        style={{
          backgroundImage: league.bannerUrl
            ? `linear-gradient(to top, rgba(8,11,18,0.92), rgba(8,11,18,0.25)), url(${league.bannerUrl})`
            : 'linear-gradient(135deg, rgba(14,20,30,0.95), rgba(38,55,84,0.85))',
        }}
      >
        {/* Status Badge - Top Left */}
        <div
          className="absolute left-4 top-4 z-20 bg-[#1274de] border border-cyan-400/30 text-white font-black uppercase text-xs shadow-[0_4px_16px_rgba(0,0,0,0.45)] flex flex-col items-center justify-center p-2 rounded-none"
          style={{ width: '64px', height: '64px', borderRight: `3px solid ${accentHex}` }}
        >
          <span className="text-[9px] text-cyan-100 font-bold uppercase tracking-wider leading-none mb-1">STATUS</span>
          <span className="text-xs font-black tracking-wider leading-none text-white">{league.status.toUpperCase()}</span>
        </div>

        {/* Simulator Logo Badge - Top Right */}
        <div
          className="absolute right-4 top-4 z-20 bg-white border-t border-r border-b border-black/10 shadow-[0_4px_16px_rgba(0,0,0,0.45)] flex items-center justify-center"
          style={{ width: '64px', height: '64px', borderLeft: `3px solid ${accentHex}` }}
        >
          <img
            src={(league as any).logoUrl || (league.simulator === 'ac' ? '/branding/ACLogo.png' : '/branding/LMULogo.png')}
            alt={league.simulator}
            className="w-full h-full object-contain p-2"
          />
        </div>
      </div>

      <div className="space-y-4 p-4 md:p-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 items-center justify-between gap-4">
          {/* Left: Simulator & Format Pills */}
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="border border-rose-500/60 bg-rose-950/80 text-rose-300 font-black uppercase px-2.5 py-1 rounded-none tracking-wide shadow-sm">
              {simulatorLabel(league.simulator)}
            </span>
            <span className="border border-blue-500/60 bg-blue-950/80 text-blue-300 font-black uppercase px-2.5 py-1 rounded-none tracking-wide shadow-sm">
              {league.format}
            </span>
          </div>

          {/* Center: Team Registration Box */}
          <div className="flex justify-center items-center">
            {registrationElement}
          </div>

          {/* Right: Admin Action Buttons */}
          <div className="flex items-center justify-end gap-2">
            {isAdmin && (
              <>
                <button
                  onClick={onEditSettings}
                  className="border border-cyan-500/40 hover:bg-cyan-500/10 px-3 py-1.5 text-xs font-bold uppercase text-cyan-400 rounded-none transition-colors flex items-center gap-1.5"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Edit Settings
                </button>
                <button
                  onClick={onDeleteLeague}
                  className="border border-rose-500/40 hover:bg-rose-500/10 px-3 py-1.5 text-xs font-bold uppercase text-rose-400 rounded-none transition-colors flex items-center gap-1.5"
                >
                  <Trash className="h-3.5 w-3.5" />
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white md:text-4xl">
            {league.title}
          </h1>
          {league.slogan && (
            <p className="text-xs font-extrabold uppercase tracking-widest mt-0.5 italic" style={{ color: accentHex }}>
              {league.slogan}
            </p>
          )}

          {/* Static Date Bar */}
          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
            <div className="flex items-center gap-2 border border-shell-line bg-black/40 px-3 py-1.5 rounded-none font-semibold text-slate-200">
              <Calendar className="h-4 w-4 text-cyan-400 shrink-0" />
              <span className="text-slate-400 uppercase text-[10px] font-bold">Start Date:</span>
              <span className="text-white font-bold"><FormattedDate date={league.startsAt} mode="date" /></span>
            </div>
            <div className="flex items-center gap-2 border border-shell-line bg-black/40 px-3 py-1.5 rounded-none font-semibold text-slate-200">
              <Calendar className="h-4 w-4 text-cyan-400 shrink-0" />
              <span className="text-slate-400 uppercase text-[10px] font-bold">End Date:</span>
              <span className="text-white font-bold"><FormattedDate date={league.endsAt} mode="date" /></span>
            </div>
          </div>

          <p className="mt-3 max-w-4xl text-sm leading-relaxed text-slate-300">
            {league.fullDescription}
          </p>
        </div>
      </div>
    </section>
  )
}
