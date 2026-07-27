'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { League } from '@/types'
import { FormattedDate } from '@/components/formatted-date'
import { ClassBadge } from '@/components/class-badge'

function registrationClass(isOpen?: boolean) {
  if (isOpen) return 'border-emerald-400/50 bg-emerald-500/20 text-emerald-100'
  return 'border-rose-400/45 bg-rose-500/20 text-rose-100'
}

function leagueClasses(format: League['format']) {
  if (format === 'multiclass') return ['GT3', 'HYPERCAR']
  if (format === 'gt3' || format === 'endurance' || format === 'sprint') return ['GT3']
  if (format === 'prototype') return ['HYPERCAR']
  if (format === 'formula') return ['F1']
  return ['CLASE']
}

export function LeagueCard({
  league,
  registeredCount = 0,
  layout = 'vertical',
}: {
  league: League
  registeredCount?: number
  layout?: 'vertical' | 'horizontal'
}) {
  const [imgError, setImgError] = useState(false)
  
  const classes = (league.classTags?.length ? league.classTags : leagueClasses(league.format)).map((item) =>
    item.trim().toUpperCase(),
  )
  const uniqueClasses = Array.from(new Set(classes)).slice(0, 4)
  const simLogo = league.simulator === 'ac' ? '/branding/ACLogo.png' : '/branding/LMULogo.png'
  const simAlt = league.simulator === 'ac' ? 'Assetto Corsa' : 'Le Mans Ultimate'
  const badgeSrc = (league as any).logoUrl || simLogo
  const badgeAlt = (league as any).logoUrl ? league.title : simAlt
  const maxLabel = league.maxDrivers ? String(league.maxDrivers) : '-'

  const accentHex = league.accentColor || '#1274de'

  if (layout === 'horizontal') {
    return (
      <Link href={`/ligas/${league.slug}`} className="group block h-full">
        <article 
          className="relative overflow-hidden rounded-none border border-white/10 bg-[#070b12] shadow-soft transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(0,0,0,0.35)] h-full grid grid-cols-[1fr_auto] min-h-[200px]"
          style={{ 
            borderColor: imgError ? 'rgba(255,255,255,0.1)' : undefined,
          }}
        >

          {/* LEFT: Text content */}
          <div className="flex flex-col justify-between p-5 md:p-6 z-10">
            <div>
              <div className="flex flex-wrap items-center gap-1.5 mb-3">
                <span className="rounded-none border border-white/20 bg-black/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-300">
                  {league.format.toUpperCase()}
                </span>
                {uniqueClasses.map((classTag) => (
                  <ClassBadge key={classTag} classTag={classTag} />
                ))}
                {badgeSrc && (
                  <span className="flex items-center gap-1 rounded-none border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-200" style={{ borderColor: `${accentHex}66`, backgroundColor: `${accentHex}25` }}>
                    <img src={badgeSrc} alt={badgeAlt} className="h-3 w-auto object-contain" />
                    {league.simulator.toUpperCase()}
                  </span>
                )}
              </div>
              <h3 className="text-xl md:text-2xl font-black uppercase italic leading-[0.95] text-white drop-shadow-md [letter-spacing:-0.03em] group-hover:text-slate-200 transition-colors" style={{ '--tw-text-opacity': '1' } as any}>
                {league.title}
              </h3>
              {league.slogan && (
                <p className="text-[10px] font-black tracking-wider uppercase mt-1 italic" style={{ color: accentHex }}>
                  {league.slogan}
                </p>
              )}
              <p className="mt-1.5 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                {league.shortDescription}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-white/8 flex items-center gap-3 text-xs">
              <span className="font-extrabold uppercase tracking-wider" style={{ color: accentHex }}>
                <FormattedDate date={league.startsAt} />
              </span>
              <span className={`rounded-none border px-2 py-0.5 text-[9px] font-bold ${registrationClass(league.registrationOpen)}`}>
                {league.registrationOpen ? 'OPEN' : 'CLOSED'}
              </span>
            </div>
          </div>

          {/* RIGHT: Banner image column */}
          {league.bannerUrl && !imgError ? (
            <div className="relative w-[180px] md:w-[220px] overflow-hidden flex-shrink-0">
              {/* Fade from left to blend with card background */}
              <div
                className="absolute inset-y-0 left-0 w-16 z-10 pointer-events-none"
                style={{ background: 'linear-gradient(90deg, #070b12 0%, transparent 100%)' }}
              />
              <img
                src={league.bannerUrl}
                alt={league.title}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          ) : (
            <div className="w-[180px] md:w-[220px] flex-shrink-0 bg-gradient-to-br from-[#0d1526] to-[#1a283f]/60" />
          )}
        </article>
      </Link>
    )
  }

  // Layout vertical original
  return (
    <Link href={`/ligas/${league.slug}`} className="group block h-full">
      <article 
        className="relative overflow-hidden rounded-none border border-white/10 bg-[#0a0f18] shadow-soft transform-gpu will-change-transform transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(0,0,0,0.35)] h-full"
        style={{
          borderLeft: `2px solid ${accentHex}`
        }}
      >
        <div className="relative h-[260px] w-full overflow-hidden bg-[#080c14]">
          {league.bannerUrl && !imgError ? (
            <>
              <Image
                src={league.bannerUrl}
                alt={league.title}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-contain object-center transition-transform duration-300 group-hover:scale-[1.03]"
                onError={() => setImgError(true)}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#030509]" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#090d15] to-[#1a283f]/92" />
          )}
        </div>

        {/* Top-Left: Title & Next Race Date */}
        <div className="absolute left-4 top-4 z-10 max-w-[calc(100%-76px)]">
          <h3 className="text-2xl md:text-3xl font-black uppercase italic leading-[0.95] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] [letter-spacing:-0.03em]">
            {league.title}
          </h3>
          {league.slogan && (
            <p className="text-[10px] font-black tracking-wider uppercase mt-0.5 italic drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]" style={{ color: accentHex }}>
              {league.slogan}
            </p>
          )}
          <p className="mt-1 text-xs font-semibold text-slate-200 drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]">
            Next race <FormattedDate date={league.startsAt} />
          </p>
        </div>

        {/* Top-Right: Simulator Badge */}
        <div className="absolute right-3 top-3 z-10 bg-white border-t border-r border-b border-black/10 shadow-[0_4px_12px_rgba(0,0,0,0.4)] flex items-center justify-center" style={{width:'56px',height:'56px', borderLeft: `2.5px solid ${accentHex}`}}>
          <img
            src={badgeSrc}
            alt={badgeAlt}
            className="w-full h-full object-contain p-1.5"
          />
        </div>

        {/* Bottom Bar: Class badges & Registration Status */}
        <div className="absolute inset-x-0 bottom-0 p-4 z-10">
          <div className="flex items-end justify-between gap-3 border-t border-white/15 pt-3 text-xs font-bold">
            <div className="flex flex-wrap items-center gap-2">
              {uniqueClasses.map((classTag) => (
                <ClassBadge key={classTag} classTag={classTag} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-none border px-2 py-1 ${registrationClass(league.registrationOpen)}`}>
                REGISTRATION {league.registrationOpen ? 'OPEN' : 'CLOSED'}
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}
