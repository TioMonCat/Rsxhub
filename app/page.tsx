export const dynamic = 'force-dynamic'

import Image from 'next/image'
import Link from 'next/link'
import { getLeagues, getLeagueEvents, getAllRegisteredDrivers, getRegistrations } from '@/lib/platform-data'
import { LeagueCard } from '@/components/league-card'
import { SteamLoginButton } from '@/components/steam-login-button'
import { Trophy, Radio, Users, Flag, ArrowRight } from 'lucide-react'
import { HeroSection } from '@/components/hero-section'

export default async function HomePage() {
  // Fetch platform data
  const leagues = await getLeagues()
  const events = await getLeagueEvents()
  const drivers = await getAllRegisteredDrivers()

  // Compute registered counts for leagues
  const regsPromises = leagues.map((league) => getRegistrations(league.id))
  const regsLists = await Promise.all(regsPromises)
  const allRegistrations = regsLists.flat()

  const registeredByLeague: Record<string, number> = {}
  const countedKeysByLeague = new Map<string, Set<string>>()

  for (const registration of allRegistrations) {
    if (registration.status === 'rejected') continue
    const leagueId = registration.leagueId
    if (!countedKeysByLeague.has(leagueId)) {
      countedKeysByLeague.set(leagueId, new Set<string>())
    }
    const countedKeys = countedKeysByLeague.get(leagueId)!
    const key = `${registration.teamId || registration.userId}_${registration.classTag || 'default'}`
    if (!countedKeys.has(key)) {
      countedKeys.add(key)
      registeredByLeague[leagueId] = (registeredByLeague[leagueId] || 0) + 1
    }
  }

  // Stats calculation
  const driversCount = drivers.length
  const leaguesCount = leagues.length
  const simulatorsCount = 2
  const racesCount = events.length

  // Active leagues for preview
  const activeLeagues = leagues.filter((l) => l.status === 'open' || l.status === 'ongoing').slice(0, 3)
  const displayLeagues = activeLeagues.length > 0 ? activeLeagues : leagues.slice(0, 3)

  return (
    <div className="space-y-20 text-white pb-12">
      {/* 1. Hero Banner Carousel & Stats Section */}
      <HeroSection
        driversCount={driversCount}
        leaguesCount={leaguesCount}
        simulatorsCount={simulatorsCount}
        racesCount={racesCount}
      />

      {/* 2. "Real competition, not arcade." Value Proposition Section */}
      <section className="space-y-10 max-w-[1400px] mx-auto px-4 md:px-6">
        <div className="space-y-3">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white italic uppercase">
            Real competition, <span className="text-[#1274de]">not arcade.</span>
          </h2>
          <p className="text-sm md:text-base text-slate-400 font-medium max-w-2xl">
            Every RSX detail is built to replicate professional motorsport inside the simulator.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Professional Leagues */}
          <div className="border border-white/10 bg-[#070b14]/80 p-6 space-y-4 rounded-none hover:border-[#1274de]/50 transition-colors">
            <div className="text-[#1274de]">
              <Trophy className="h-6 w-6" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-white">
              Professional Leagues
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Detailed regulations, active stewards, and official standings in every championship.
            </p>
          </div>

          {/* Card 2: Live Broadcast */}
          <div className="border border-white/10 bg-[#070b14]/80 p-6 space-y-4 rounded-none hover:border-[#1274de]/50 transition-colors">
            <div className="text-[#1274de]">
              <Radio className="h-6 w-6" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-white">
              Live Broadcast
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Live broadcast of every race with commentators, graphics, and multicam production.
            </p>
          </div>

          {/* Card 3: Teams & Drivers */}
          <div className="border border-white/10 bg-[#070b14]/80 p-6 space-y-4 rounded-none hover:border-[#1274de]/50 transition-colors">
            <div className="text-[#1274de]">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-white">
              Teams & Drivers
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Team, transfers, and contracts system inspired by real motorsport.
            </p>
          </div>

          {/* Card 4: Race Control */}
          <div className="border border-white/10 bg-[#070b14]/80 p-6 space-y-4 rounded-none hover:border-[#1274de]/50 transition-colors">
            <div className="text-[#1274de]">
              <Flag className="h-6 w-6" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-white">
              Race Control
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Steward panel with incident management, penalties, and live notices.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Active Leagues Section */}
      <section className="space-y-6 max-w-[1400px] mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight text-white">
            Active leagues
          </h2>
          <Link
            href="/ligas"
            className="text-xs font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-1 uppercase tracking-wider"
          >
            View all →
          </Link>
        </div>

        {displayLeagues.length === 0 ? (
          <div className="border border-white/10 bg-[#070b14] p-8 text-center text-slate-400 text-sm">
            No active leagues available. Check back soon!
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {displayLeagues.map((league) => (
              <LeagueCard
                key={league.id}
                league={league}
                registeredCount={registeredByLeague[league.id] || 0}
              />
            ))}
          </div>
        )}
      </section>

      {/* 4. JOIN RSX CTA Section */}
      <section className="max-w-[1400px] mx-auto px-4 md:px-6">
        <div className="border border-white/10 bg-gradient-to-r from-[#040814] via-[#070e1e] to-[#040814] p-10 md:p-16 space-y-6 rounded-none shadow-2xl">
          <div className="space-y-3 max-w-xl">
            <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tight text-white">
              JOIN <br />
              <span className="text-[#1274de]">RSX</span>
            </h2>
            <p className="text-sm md:text-base text-slate-400 font-medium leading-relaxed">
              Create your profile, join a team, and start racing. No pay-to-win, no shortcuts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <SteamLoginButton className="inline-flex bg-[#1274de] hover:bg-[#1f82ee] text-white px-7 py-3 text-xs md:text-sm font-bold uppercase tracking-wider rounded-none transition-colors cursor-pointer">
              Sign in with Steam
            </SteamLoginButton>
            <Link
              href="/ligas"
              className="inline-flex border border-white/20 bg-white/5 hover:bg-white/10 text-white px-7 py-3 text-xs md:text-sm font-bold uppercase tracking-wider rounded-none transition-colors"
            >
              View leagues
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
