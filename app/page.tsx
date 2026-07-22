import Link from 'next/link'
import { HeroSection } from '@/components/hero-section'
import { LeagueCard } from '@/components/league-card'
import { NextEvent } from '@/components/next-event'
import { SectionTitle } from '@/components/section-title'
import { getLeagues, getLeagueEvents, getRegistrations } from '@/lib/platform-data'

export default async function HomePage() {
  const leagues = await getLeagues()
  const events = await getLeagueEvents()
  const registrations = await getRegistrations()

  // Calculate statistics
  const registeredByLeague: Record<string, number> = {}
  registrations.forEach((r) => {
    if (r.status !== 'rejected') {
      registeredByLeague[r.leagueId] = (registeredByLeague[r.leagueId] || 0) + 1
    }
  })

  // Get next upcoming event
  const now = new Date().toISOString()
  const upcomingEvents = events
    .filter((e) => e.startsAt >= now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
  
  const nextEvent = upcomingEvents[0] || events[0]
  const nextEventLeague = nextEvent ? leagues.find((l) => l.id === nextEvent.leagueId) : null

  // Total drivers count
  const uniqueDrivers = new Set(registrations.map((r) => r.userId)).size || 48
  const totalRaces = events.length || 12

  return (
    <div className="-mt-4 md:-mt-6 -mx-10 md:-mx-20 space-y-12 pb-12">
      {/* Hero Carousel Banner */}
      <HeroSection
        driversCount={Math.max(uniqueDrivers, 35)}
        leaguesCount={leagues.length}
        simulatorsCount={2}
        racesCount={totalRaces}
      />

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 space-y-12">
        {/* Next Event Banner if available */}
        {nextEvent && nextEventLeague && (
          <section className="space-y-3">
            <SectionTitle title="Next Scheduled Race" subtitle="Join the lobby or watch live on stream." />
            <NextEvent event={nextEvent} league={nextEventLeague} />
          </section>
        )}

        {/* Active Championships */}
        <section className="space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between border-b border-shell-line pb-4">
            <SectionTitle
              title="Featured Championships"
              subtitle="Assetto Corsa and Le Mans Ultimate official leagues."
            />
            <Link
              href="/ligas"
              className="inline-flex items-center justify-center bg-[#1274de] hover:bg-[#1f82ee] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors rounded-none w-fit"
            >
              View All Leagues ({leagues.length})
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {leagues.slice(0, 6).map((league) => (
              <LeagueCard
                key={league.id}
                league={league}
                registeredCount={registeredByLeague[league.id] || 0}
              />
            ))}
          </div>
        </section>

        {/* Platform Info & Call to Action */}
        <section className="shell-panel p-8 md:p-12 rounded-none relative overflow-hidden bg-gradient-to-r from-black via-zinc-950 to-[#09152b] border border-white/10">
          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="text-[11px] font-black uppercase tracking-[0.25em] text-[#1274de]">
              SIMRACING LEAGUE PLATFORM
            </span>
            <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tight text-white">
              Ready to hit the track?
            </h2>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed font-semibold">
              RSX features live stewarding, custom skins telemetry, automated standings, and multi-class championship support for Assetto Corsa & Le Mans Ultimate.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href="/ligas"
                className="bg-[#1274de] hover:bg-[#1f82ee] px-6 py-3 text-xs font-bold uppercase tracking-wider text-white transition-colors rounded-none"
              >
                Explore Leagues
              </Link>
              <Link
                href="/calendario"
                className="border border-white/20 bg-white/5 hover:bg-white/10 px-6 py-3 text-xs font-bold uppercase tracking-wider text-white transition-colors rounded-none"
              >
                Race Calendar
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
