import Link from 'next/link'
import { Trophy, Tv, Users, Flag } from 'lucide-react'
import { HeroSection } from '@/components/hero-section'
import { LeagueCard } from '@/components/league-card'
import { SteamLoginButton } from '@/components/steam-login-button'
import { getLeagues, getLeagueEvents, getRegistrations } from '@/lib/platform-data'

export default async function HomePage() {
  const leagues = await getLeagues()
  const events = await getLeagueEvents()
  const registrations = await getRegistrations()

  // Calculate stats
  const registeredByLeague: Record<string, number> = {}
  registrations.forEach((r) => {
    if (r.status !== 'rejected') {
      registeredByLeague[r.leagueId] = (registeredByLeague[r.leagueId] || 0) + 1
    }
  })

  const uniqueDrivers = new Set(registrations.map((r) => r.userId)).size || 2
  const activeLeagues = leagues.filter((l) => l.status === 'open' || l.status === 'ongoing' || l.status === 'upcoming')
  const displayedLeagues = activeLeagues.length > 0 ? activeLeagues : leagues

  return (
    <div className="-mt-4 md:-mt-6 -mx-10 md:-mx-20 space-y-20 pb-16">
      {/* 1. Hero Carousel Banner */}
      <HeroSection
        driversCount={uniqueDrivers || 2}
        leaguesCount={leagues.length || 2}
        simulatorsCount={1}
        racesCount={events.length || 0}
      />

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 space-y-24">
        {/* 2. REAL COMPETITION, NOT ARCADE */}
        <section className="space-y-8">
          <div>
            <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tight text-white">
              REAL COMPETITION, <span className="text-[#1274de]">NOT ARCADE.</span>
            </h2>
            <p className="mt-3 text-sm md:text-base text-slate-400 font-semibold max-w-2xl">
              Every RSX detail is built to replicate professional motorsport inside the simulator.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 pt-4">
            {/* Feature 1 */}
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center bg-[#09152b] border border-[#1274de]/30 text-[#1274de]">
                <Trophy className="h-6 w-6" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                PROFESSIONAL LEAGUES
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Detailed regulations, active stewards, and official standings in every championship.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center bg-[#09152b] border border-[#1274de]/30 text-[#1274de]">
                <Tv className="h-6 w-6" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                LIVE BROADCAST
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Live broadcast of every race with commentators, graphics, and multicam production.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center bg-[#09152b] border border-[#1274de]/30 text-[#1274de]">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                TEAMS & DRIVERS
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Team, transfers, and contracts system inspired by real motorsport.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center bg-[#09152b] border border-[#1274de]/30 text-[#1274de]">
                <Flag className="h-6 w-6" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                RACE CONTROL
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Steward panel with incident management, penalties, and live notices.
              </p>
            </div>
          </div>
        </section>

        {/* 3. ACTIVE LEAGUES */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight text-white">
              ACTIVE LEAGUES
            </h2>
            <Link
              href="/ligas"
              className="text-xs font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-1 uppercase tracking-wider"
            >
              View all &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {displayedLeagues.slice(0, 4).map((league) => (
              <LeagueCard
                key={league.id}
                league={league}
                registeredCount={registeredByLeague[league.id] || 0}
                layout="horizontal"
              />
            ))}
          </div>
        </section>

        {/* 4. JOIN REAL SIM EXPERIENCE */}
        <section className="space-y-6 pt-6">
          <div>
            <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tight text-white">
              JOIN <span className="text-[#1274de]">REAL SIM EXPERIENCE</span>
            </h2>
            <p className="mt-3 text-sm md:text-base text-slate-400 font-semibold max-w-2xl">
              Create your profile, join a team, and start racing. No pay-to-win, no shortcuts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <SteamLoginButton className="inline-flex items-center gap-2 bg-[#1274de] hover:bg-[#1f82ee] px-6 py-3 text-xs font-bold uppercase tracking-wider text-white transition-colors rounded-none cursor-pointer">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.283 2.69 7.935 6.49 9.35l.937-2.868c-.144-.065-.28-.152-.405-.257-.958-.8-1.572-2.003-1.572-3.348 0-2.457 1.998-4.455 4.455-4.455h.023l2.846 4.19c.774.07 1.492.42 2.015.992l-.001.002c.49.537.785 1.25.785 2.037 0 1.688-1.374 3.063-3.063 3.063-.807 0-1.536-.312-2.079-.82l-2.85 2.85C10.233 21.895 11.096 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm1.905 15.688c0-.992-.808-1.802-1.802-1.802s-1.802.81-1.802 1.802.808 1.802 1.802 1.802 1.802-.81 1.802-1.802z"/>
              </svg>
              SIGN IN WITH STEAM
            </SteamLoginButton>

            <Link
              href="/ligas"
              className="inline-flex bg-[#0b0e14] border border-white/20 hover:bg-white/10 px-6 py-3 text-xs font-bold uppercase tracking-wider text-white transition-colors rounded-none"
            >
              VIEW LEAGUES
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
