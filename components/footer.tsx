import Image from 'next/image'
import Link from 'next/link'
import { Mail } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#040711] py-12 text-slate-400">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 space-y-10">
        {/* Main Footer Columns */}
        <div className="grid gap-8 md:grid-cols-4">
          {/* Columna 1: Logo, Descripción y Email */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center">
              <Image src="/branding/rsx-logo.png" alt="RSX" width={110} height={30} className="h-auto w-[90px] md:w-[110px]" />
            </div>
            <p className="max-w-md text-xs md:text-sm leading-relaxed text-slate-400">
              Sim racing competition platform. Leagues, results and standings for the sim racing community.
            </p>
            <div className="pt-2">
              <a
                href="mailto:realsimxperience@gmail.com"
                className="inline-flex items-center gap-2 rounded-none border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
              >
                <Mail className="h-3.5 w-3.5 text-cyan-400" />
                realsimxperience@gmail.com
              </a>
            </div>
          </div>

          {/* Columna 2: Platform Links */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Platform</h4>
            <ul className="space-y-2.5 text-xs md:text-sm">
              <li>
                <Link href="/" className="hover:text-white transition-colors">Home</Link>
              </li>
              <li>
                <Link href="/calendario" className="hover:text-white transition-colors">Calendar</Link>
              </li>
              <li>
                <Link href="/ligas" className="hover:text-white transition-colors">Leagues</Link>
              </li>
              <li>
                <Link href="/equipos" className="hover:text-white transition-colors">Teams</Link>
              </li>
              <li>
                <Link href="/perfil" className="hover:text-white transition-colors">Drivers</Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">About</Link>
              </li>
            </ul>
          </div>

          {/* Columna 3: Community & Social Media Cards */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Community</h4>
            
            <div className="space-y-2">
              {/* Instagram */}
              <a
                href="https://www.instagram.com/rsx_liga"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 p-2 bg-[#090e1a] hover:bg-[#0f172a] border border-white/10 hover:border-pink-500/40 rounded-lg transition-all"
              >
                <div className="w-8 h-8 rounded-md bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 group-hover:scale-105 transition-transform shrink-0">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white group-hover:text-pink-400 transition-colors leading-none">Instagram</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate">@rsx_liga</div>
                </div>
              </a>

              {/* TikTok */}
              <a
                href="https://www.tiktok.com/@rsx_liga"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 p-2 bg-[#090e1a] hover:bg-[#0f172a] border border-white/10 hover:border-cyan-500/40 rounded-lg transition-all"
              >
                <div className="w-8 h-8 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform shrink-0">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.74-3.94-1.74-.22-.21-.42-.45-.6-.71-.11-.15-.22-.32-.33-.49V14.5c.02 2.13-.6 4.31-2.02 5.92-1.6 1.83-4.07 2.73-6.49 2.45-2.54-.3-4.88-2-5.91-4.39-1.21-2.82-.6-6.31 1.51-8.52 1.67-1.75 4.2-2.43 6.5-1.87V12.3c-1.2-.42-2.61-.1-3.52.82-.94.94-1.12 2.47-.46 3.56.66 1.1 2.06 1.66 3.28 1.34 1-.26 1.72-1.18 1.74-2.22-.01-3.66-.02-7.31-.02-10.97.08-1.53.63-3.09 1.75-4.17.2-.2.43-.37.66-.53z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors leading-none">TikTok</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate">@rsx_liga</div>
                </div>
              </a>

              {/* YouTube */}
              <a
                href="https://www.youtube.com/@RealSimXperience"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 p-2 bg-[#090e1a] hover:bg-[#0f172a] border border-white/10 hover:border-red-500/40 rounded-lg transition-all"
              >
                <div className="w-8 h-8 rounded-md bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 group-hover:scale-105 transition-transform shrink-0">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white group-hover:text-red-400 transition-colors leading-none">YouTube</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate">@RealSimXperience</div>
                </div>
              </a>

              {/* Twitch */}
              <a
                href="https://www.twitch.tv/sobranruedas_tv"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 p-2 bg-[#090e1a] hover:bg-[#0f172a] border border-white/10 hover:border-purple-500/40 rounded-lg transition-all"
              >
                <div className="w-8 h-8 rounded-md bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform shrink-0">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white group-hover:text-purple-400 transition-colors leading-none">Twitch</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate">sobranruedas_tv</div>
                </div>
              </a>

              {/* Discord */}
              <a
                href="https://discord.gg/rsx"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 p-2 bg-[#090e1a] hover:bg-[#0f172a] border border-white/10 hover:border-indigo-500/40 rounded-lg transition-all"
              >
                <div className="w-8 h-8 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform shrink-0">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0c-.172-.393-.412-.882-.63-1.25a.074.074 0 0 0-.078-.037 19.736 19.736 0 0 0-4.885 1.515.069.069 0 0 0-.032.027C.533 9.048-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.094 13.094 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors leading-none">Discord</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate">RSX Community</div>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Separador y barra inferior */}
        <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500 font-semibold">
          <div>
            © 2026 RSX Real Sim Experience. All rights reserved.
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center">
            <Link href="/privacidad" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
            <Link href="/aviso-legal" className="hover:text-slate-300 transition-colors">Legal Notice</Link>
            <Link href="/terminos" className="hover:text-slate-300 transition-colors">Terms & Conditions</Link>
            <Link href="/cookies" className="hover:text-slate-300 transition-colors">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
