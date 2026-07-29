export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getLeagues, getLeagueEvents, getAllRegisteredDrivers, getRegistrations } from '@/lib/platform-data'
import { getTeamsDashboard } from '@/lib/team-data'
import { HeroSection } from '@/components/hero-section'
import { LeagueCard } from '@/components/league-card'
import { SectionTitle } from '@/components/section-title'
import { FormattedDate } from '@/components/formatted-date'
import { Trophy, Calendar, Shield, Flag, Users, Zap, ArrowRight } from 'lucide-react'

export default async function HomePage() {
  // Fetch platform data
  const leagues = await getLeagues()
  const events = await getLeagueEvents()
  const drivers = await getAllRegisteredDrivers()
  const { teams } = await getTeamsDashboard()

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

  // Next upcoming race event
  const now = new Date().toISOString()
  const upcomingEvents = events
    .filter((ev) => ev.startsAt && ev.startsAt >= now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const nextEvent = upcomingEvents[0] || events[0] || null
  const nextEventLeague = nextEvent ? leagues.find((l) => l.id === nextEvent.leagueId) : null

  // Stats calculation
  const driversCount = Math.max(drivers.length, 12)
  const leaguesCount = leagues.length
  const simulatorsCount = 2
  const racesCount = events.length || 8

  // Featured leagues
  const featuredLeagues = leagues.slice(0, 6)

  return (
    <div className="space-y-12 text-white">
      {/* 1. Hero Carousel Banner */}
      <HeroSection
        driversCount={driversCount}
        leaguesCount={leaguesCount}
        simulatorsCount={simulatorsCount}
        racesCount={racesCount}
      />

      {/* 2. Upcoming Race Banner */}
      {nextEvent && (
        <section className="shell-panel relative overflow-hidden border border-cyan-500/30 bg-gradient-to-r from-black/80 via-[#070e1b] to-black/80 p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 bg-red-600/30 border border-red-500/40 text-red-300 text-[10px] font-black uppercase tracking-widest px-2.5 py-1">
                  <Zap className="h-3 w-3 text-red-400 animate-pulse" /> NEXT RACE ON PROGRAMME
                </span>
                {nextEventLeague && (
                  <span className="text-xs font-mono text-cyan-400 font-bold uppercase">
                    {nextEventLeague.title}
                  </span>
                )}
              </div>
              <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight text-white">
                {nextEvent.circuitName || nextEvent.title || 'Official Grand Prix Event'}
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 font-mono">
                <span className="flex items-center gap-1.5 text-slate-200">
                  <Calendar className="h-4 w-4 text-cyan-400" />
                  <FormattedDate date={nextEvent.startsAt} />
                </span>
                {nextEvent.circuitName && (
                  <span className="text-slate-400">
                    Circuit: <strong className="text-white">{nextEvent.circuitName}</strong>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/calendario?view=programme"
                className="bg-[#1274de] hover:bg-[#1f82ee] text-white px-6 py-3 text-xs font-black uppercase tracking-wider transition-colors rounded-none flex items-center gap-2 shadow-[0_0_15px_rgba(18,116,222,0.4)]"
              >
                View Full Calendar <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 3. Championships & Active Leagues */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-shell-line pb-4 gap-4">
          <SectionTitle
            title="ACTIVE CHAMPIONSHIPS"
            subtitle="Browse available leagues, choose your class, and sign up with your team or as an independent driver."
            icon={<Trophy className="h-7 w-7 text-cyan-400 shrink-0" />}
          />
          <Link
            href="/ligas"
            className="border border-white/20 bg-white/5 hover:bg-white/10 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors self-start md:self-auto shrink-0"
          >
            Explore All Leagues →
          </Link>
        </div>

        {featuredLeagues.length === 0 ? (
          <div className="shell-panel p-8 text-center border border-shell-line bg-zinc-950/40">
            <p className="text-slate-400 text-sm">No active leagues at the moment. Check back soon!</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {featuredLeagues.map((league) => (
              <LeagueCard
                key={league.id}
                league={league}
                registeredCount={registeredByLeague[league.id] || 0}
              />
            ))}
          </div>
        )}
      </section>

      {/* 4. Why RSX / Value Proposition */}
      <section className="space-y-6">
        <SectionTitle
          title="THE RSX ADVANTAGE"
          subtitle="Built by sim racers for sim racers. Everything you need for a professional league experience."
          icon={<Shield className="h-7 w-7 text-cyan-400 shrink-0" />}
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1 */}
          <div className="border border-white/10 bg-[#090d16]/60 p-6 space-y-3 rounded-none">
            <div className="h-10 w-10 bg-slate-900 border border-white/10 flex items-center justify-center text-cyan-400">
              <Trophy className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-white">
              Official Championships
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sprint & endurance series across GT3, LMP2, Hypercar, and multiclass categories.
            </p>
          </div>

          {/* Card 2 */}
          <div className="border border-white/10 bg-[#090d16]/60 p-6 space-y-3 rounded-none">
            <div className="h-10 w-10 bg-slate-900 border border-white/10 flex items-center justify-center text-cyan-400">
              <Shield className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-white">
              Stewards & Race Control
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Clean racing guaranteed with active stewards, clear rulebooks, and transparent penalty logs.
            </p>
          </div>

          {/* Card 3 */}
          <div className="border border-white/10 bg-[#090d16]/60 p-6 space-y-3 rounded-none">
            <div className="h-10 w-10 bg-slate-900 border border-white/10 flex items-center justify-center text-cyan-400">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-white">
              Teams & Drivers
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Register custom teams, assign car skin URLs, manage rosters, and recruit through the Driver Market.
            </p>
          </div>

          {/* Card 4 */}
          <div className="border border-white/10 bg-[#090d16]/60 p-6 space-y-3 rounded-none">
            <div className="h-10 w-10 bg-slate-900 border border-white/10 flex items-center justify-center text-cyan-400">
              <Flag className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-white">
              Live Standings
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automatic result tracking, points tables, and driver statistics updated right after every round.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Call To Action Banner */}
      <section className="border border-white/10 bg-gradient-to-r from-[#0a1424] via-[#070e1a] to-[#040810] p-8 md:p-12 text-center space-y-6 rounded-none shadow-2xl">
        <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tight text-white">
          Ready to <span className="text-[#1274de]">Take the Grid?</span>
        </h2>
        <p className="text-xs md:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
          Create your team profile, explore available championships, and join the competitive sim racing community.
        </p>
        <div className="flex flex-wrap justify-center gap-4 pt-2">
          <Link
            href="/ligas"
            className="bg-[#1274de] hover:bg-[#1f82ee] text-white px-7 py-3 text-xs font-bold uppercase tracking-wider rounded-none transition-colors cursor-pointer shadow-[0_0_15px_rgba(18,116,222,0.3)]"
          >
            Browse Leagues
          </Link>
          <Link
            href="/equipos"
            className="border border-white/20 bg-white/5 hover:bg-white/10 text-white px-7 py-3 text-xs font-bold uppercase tracking-wider rounded-none transition-colors cursor-pointer"
          >
            Manage Teams
          </Link>
          <Link
            href="/perfil"
            className="border border-white/20 bg-transparent hover:bg-white/5 text-slate-300 px-7 py-3 text-xs font-bold uppercase tracking-wider rounded-none transition-colors cursor-pointer"
          >
            Driver Profile
          </Link>
        </div>
      </section>
    </div>
  )
}
