'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Download, Users, ArrowRight } from 'lucide-react'
import { ClassBadge } from '@/components/class-badge'

type TeamShowcaseProps = {
  teamName: string
  teamLogoUrl?: string | null
  primaryColor?: string | null
  accentColor?: string | null
  slogan?: string | null
  competitionClasses?: string[]
  carSkinUrls?: string[]
  pilotNames: string[]
  profileHref?: string
  skins?: Array<{ skinUrl: string; leagueSlug: string; carNumber?: string | null }>
}

const isOptimizable = (url?: string | null) => {
  if (!url) return false
  return url.includes('supabase.co') || url.includes('steamstatic.com') || url.includes('unsplash.com') || url.startsWith('/')
}

export function TeamShowcase({
  teamName,
  teamLogoUrl,
  primaryColor,
  accentColor,
  slogan,
  competitionClasses = [],
  pilotNames = [],
  profileHref,
  skins = [],
}: TeamShowcaseProps) {
  const router = useRouter()
  const barColor = accentColor || primaryColor || '#ff3a3a'

  const goToProfile = (event: React.MouseEvent) => {
    // If user clicks a button/link inside, don't trigger the card click
    const target = event.target as HTMLElement
    if (target.closest('a') || target.closest('button')) return

    if (!profileHref) return
    router.push(profileHref)
  }

  return (
    <article
      onClick={goToProfile}
      className={`relative border border-shell-line bg-[#090d16]/90 p-5 shadow-xl transition-all duration-300 hover:shadow-[0_12px_24px_rgba(0,0,0,0.55)] flex flex-col justify-between min-h-[220px] rounded-none group ${
        profileHref ? 'cursor-pointer hover:border-red-650' : ''
      }`}
      style={{
        borderLeft: `3px solid ${barColor}`,
      }}
    >
      <div className="space-y-4">
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Logo container with accent border */}
            <div 
              className="flex h-16 w-16 shrink-0 items-center justify-center bg-black/45 border-l-2 shadow-inner p-1"
              style={{ borderLeftColor: barColor }}
            >
              {teamLogoUrl ? (
                <Image
                  src={teamLogoUrl}
                  alt={teamName}
                  width={56}
                  height={56}
                  unoptimized={!isOptimizable(teamLogoUrl)}
                  className="h-14 w-14 object-contain"
                />
              ) : (
                <Users className="h-6 w-6 text-slate-500" />
              )}
            </div>

            {/* Name and Categories */}
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-black uppercase italic tracking-wider text-white group-hover:text-red-450 transition-colors">
                {teamName}
              </h3>
              {slogan && (
                <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase italic truncate max-w-[200px]" title={slogan}>
                  "{slogan}"
                </p>
              )}
              <div className="flex flex-wrap gap-1 mt-1">
                {competitionClasses.map((cl, idx) => (
                  <ClassBadge key={idx} classTag={cl} />
                ))}
              </div>
            </div>
          </div>

          {profileHref && (
            <button
              onClick={() => router.push(profileHref)}
              className="text-slate-400 hover:text-white transition-colors p-1 cursor-pointer"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Pilots list */}
        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold block">
            Pilotos
          </span>
          <div className="flex flex-wrap gap-1.5">
            {pilotNames.length > 0 ? (
              pilotNames.map((name, idx) => (
                <span
                  key={idx}
                  className="bg-white/5 border border-white/10 px-2 py-0.5 text-[11px] font-medium text-slate-300 rounded-none"
                >
                  {name}
                </span>
              ))
            ) : (
              <span className="text-slate-500 text-xs italic">Sin pilotos registrados</span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Downloadable Skins Bar */}
      {skins.length > 0 && (
        <div className="mt-5 pt-4 border-t border-shell-line/50 space-y-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold block">
            Descarga de Skins
          </span>
          <div className="flex flex-wrap gap-2">
            {skins.map((skin, idx) => (
              <a
                key={idx}
                href={skin.skinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-300 transition-colors cursor-pointer"
              >
                <Download className="h-3 w-3" />
                <span>{skin.carNumber || 'Skin'}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}
