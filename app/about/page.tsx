import Link from 'next/link'
import { 
  Flag, 
  Users, 
  Server, 
  Globe, 
  Megaphone, 
  Radio, 
  Trophy, 
  Code, 
  Shield 
} from 'lucide-react'

export const metadata = {
  title: 'About - Real Sim Experience',
  description: 'Learn about RSX sim racing community, our history, services, partners and how to compete in our competitive leagues.',
}

export default function AboutPage() {
  return (
    <div className="space-y-16 text-white pb-16">
      {/* 1. Hero Section with Daytona background */}
      <section className="relative w-full overflow-hidden border border-white/10 bg-black/60 rounded-none h-[420px] flex items-center">
        {/* Background Image with overlay gradient */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 z-0"
          style={{ backgroundImage: "url('/circuits/daytona.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#060910] via-[#060910]/80 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060910] via-transparent to-transparent z-10" />
        
        {/* Hero Content */}
        <div className="relative z-20 max-w-3xl px-6 md:px-12 space-y-4">
          <span className="text-xs font-black uppercase tracking-widest text-[#1274de]">
            Who We Are
          </span>
          <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tight text-white">
            About <span className="text-[#1274de]">Real Sim Experience</span>
          </h1>
          <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-2xl font-medium">
            RSX is a sim racing community founded by virtual motorsport enthusiasts. 
            We run competitive leagues, provide professional services, and bring 
            together the best drivers from the Spanish and international sim racing 
            scene.
          </p>
        </div>
      </section>

      {/* 2. Our Story Section */}
      <section className="grid gap-12 lg:grid-cols-[1.2fr_1fr] items-start">
        {/* Left Column */}
        <div className="space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-widest text-[#1274de]">
              Our Story
            </span>
            <h2 className="text-3xl font-black uppercase italic tracking-tight text-white">
              Sim Racing <span className="text-[#1274de]">For Real</span>
            </h2>
          </div>
          
          <div className="space-y-4 text-sm text-slate-300 leading-relaxed font-medium">
            <p>
              RSX was born out of the need for a sim racing platform where competition is fair, 
              organised and at the level of seriousness that drivers deserve. What started as 
              a group of friends has grown into one of the leading virtual motorsport 
              communities in the Spanish-speaking world.
            </p>
            <p>
              We run leagues on the most demanding simulators available: <strong className="text-white">Assetto Corsa</strong>, and other top titles. Every championship features race direction, a stewards room and a detailed rulebook.
            </p>
            <p>
              Our management platform is entirely our own: registrations, results, penalties, 
              teams and communications — all in one place.
            </p>
          </div>
        </div>

        {/* Right Column Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Card 1 */}
          <div className="border border-white/5 bg-[#090d16]/30 p-5 space-y-3 rounded-none">
            <div className="h-9 w-9 bg-slate-900 border border-white/10 flex items-center justify-center text-[#1274de]">
              <Flag className="h-4 w-4" />
            </div>
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-white">
              Serious Competition
            </h3>
            <p className="text-xxs text-slate-400 leading-relaxed">
              Championships with clear regulations, race direction and a live stewards room.
            </p>
          </div>

          {/* Card 2 */}
          <div className="border border-white/5 bg-[#090d16]/30 p-5 space-y-3 rounded-none">
            <div className="h-9 w-9 bg-slate-900 border border-white/10 flex items-center justify-center text-[#1274de]">
              <Users className="h-4 w-4" />
            </div>
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-white">
              Community First
            </h3>
            <p className="text-xxs text-slate-400 leading-relaxed">
              We are passionate about virtual motorsport. Respect on and off track is non-negotiable.
            </p>
          </div>

          {/* Card 3 */}
          <div className="border border-white/5 bg-[#090d16]/30 p-5 space-y-3 rounded-none">
            <div className="h-9 w-9 bg-slate-900 border border-white/10 flex items-center justify-center text-[#1274de]">
              <Server className="h-4 w-4" />
            </div>
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-white">
              Own Infrastructure
            </h3>
            <p className="text-xxs text-slate-400 leading-relaxed">
              We have built our own platform: leagues, teams, results and penalties all in one place.
            </p>
          </div>

          {/* Card 4 */}
          <div className="border border-white/5 bg-[#090d16]/30 p-5 space-y-3 rounded-none">
            <div className="h-9 w-9 bg-slate-900 border border-white/10 flex items-center justify-center text-[#1274de]">
              <Globe className="h-4 w-4" />
            </div>
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-white">
              International Reach
            </h3>
            <p className="text-xxs text-slate-400 leading-relaxed">
              Drivers from across Europe and the Americas compete in our leagues on dedicated servers.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Our Services Section */}
      <section className="space-y-8">
        <div className="space-y-2">
          <span className="text-xs font-black uppercase tracking-widest text-[#1274de]">
            What We Offer
          </span>
          <h2 className="text-3xl font-black uppercase italic tracking-tight text-white">
            Our <span className="text-[#1274de]">Services</span>
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
            Beyond our own leagues, RSX offers professional services for brands, communities and sports 
            organisations looking to bring their project into the sim racing world.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Service 1 */}
          <div className="border border-white/5 bg-[#090d16]/30 p-6 space-y-3 rounded-none">
            <div className="h-10 w-10 bg-slate-900 border border-white/10 flex items-center justify-center text-[#1274de]">
              <Megaphone className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-white">
              Marketing
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              We design and execute communication campaigns for brands within the virtual motorsport 
              ecosystem: social media, sponsored content, branded content and digital strategy.
            </p>
          </div>

          {/* Service 2 */}
          <div className="border border-white/5 bg-[#090d16]/30 p-6 space-y-3 rounded-none">
            <div className="h-10 w-10 bg-slate-900 border border-white/10 flex items-center justify-center text-[#1274de]">
              <Radio className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-white">
              Broadcasting
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Live race production and broadcast with commentators, on-screen graphics and 
              multi-camera direction. Broadcast quality adapted to every budget.
            </p>
          </div>

          {/* Service 3 */}
          <div className="border border-white/5 bg-[#090d16]/30 p-6 space-y-3 rounded-none">
            <div className="h-10 w-10 bg-slate-900 border border-white/10 flex items-center justify-center text-[#1274de]">
              <Trophy className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-white">
              Virtual Competitions
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              We create virtual championships based on real-world competitions — for Formula, GT, 
              Endurance or Rally clients looking to bring their series into sim racing.
            </p>
          </div>

          {/* Service 4 */}
          <div className="border border-white/5 bg-[#090d16]/30 p-6 space-y-3 rounded-none">
            <div className="h-10 w-10 bg-slate-900 border border-white/10 flex items-center justify-center text-[#1274de]">
              <Code className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-white">
              Web Development
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Design and development of custom platforms and websites for communities, sports 
              organisations and brands: championship sites, management panels, real-time results.
            </p>
          </div>

          {/* Service 5 */}
          <div className="border border-white/5 bg-[#090d16]/30 p-6 space-y-3 rounded-none">
            <div className="h-10 w-10 bg-slate-900 border border-white/10 flex items-center justify-center text-[#1274de]">
              <Shield className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-white">
              Race Direction
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              External race direction service for other communities and leagues: incident management, 
              regulation enforcement, stewards decisions and official communications.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Our Partners Section */}
      <section className="space-y-6">
        <div className="space-y-2">
          <span className="text-xs font-black uppercase tracking-widest text-[#1274de]">
            Collaborators
          </span>
          <h2 className="text-3xl font-black uppercase italic tracking-tight text-white">
            Our <span className="text-[#1274de]">Partners</span>
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
            Companies and organisations that trust RSX. Every partnership is built on shared values 
            and a commitment to growing the virtual motorsport ecosystem.
          </p>
        </div>

        <div className="border border-white/5 bg-[#090d16]/30 p-12 text-center flex flex-col items-center justify-center gap-3 rounded-none">
          <Users className="h-8 w-8 text-slate-500" />
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-300">
            Coming Soon
          </h3>
          <p className="text-xs text-slate-500 italic">
            Partners will be announced shortly.
          </p>
        </div>
      </section>

      {/* 5. Call To Action Banner */}
      <section className="border border-white/10 bg-gradient-to-r from-[#0c1626] to-[#060a12] p-8 md:p-12 text-center space-y-6 rounded-none shadow-xl max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tight text-white">
          Ready to <span className="text-[#1274de]">Compete?</span>
        </h2>
        <p className="text-xs md:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
          Join our community, sign up for a league and prove your pace on track.
        </p>
        <div className="flex flex-wrap justify-center gap-4 pt-2">
          <Link
            href="/ligas"
            className="bg-[#1274de] hover:bg-[#0f62c0] text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-none transition-colors cursor-pointer"
          >
            View Leagues
          </Link>
          <Link
            href="/equipos"
            className="border border-white/20 bg-transparent hover:bg-white/5 text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-none transition-colors cursor-pointer"
          >
            Create Team
          </Link>
        </div>
      </section>
    </div>
  )
}
