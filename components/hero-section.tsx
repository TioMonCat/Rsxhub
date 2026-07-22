'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

const SLIDES = [
  {
    image: '/carousel/slide1.jpg',
    subtitle: "Spain's most demanding sim racing platform. Real leagues, race control, and professional broadcast."
  },
  {
    image: '/carousel/slide2.jpg',
    subtitle: "Championships with active stewards, full regulations, and live broadcasts."
  },
  {
    image: '/carousel/slide3.jpg',
    subtitle: "Short sprints, endurance races, and the highest on-track rivalry."
  },
  {
    image: '/carousel/slide4.jpg',
    subtitle: "Assetto Corsa and Le Mans Ultimate. Real competition, not arcade."
  },
  {
    image: '/carousel/slide5.jpg',
    subtitle: "Join the greatest sim racing experience in Spain and show your pace."
  }
]

interface HeroSectionProps {
  driversCount: number
  leaguesCount: number
  simulatorsCount: number
  racesCount: number
}

export function HeroSection({ driversCount, leaguesCount, simulatorsCount, racesCount }: HeroSectionProps) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % SLIDES.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  const prevSlide = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrent((prev) => (prev - 1 + SLIDES.length) % SLIDES.length)
  }

  const nextSlide = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrent((prev) => (prev + 1) % SLIDES.length)
  }

  return (
    <div className="w-full">
      {/* Banner de Hero Carousel - Altura completa del Viewport */}
      <section className="relative h-[calc(100vh-76px)] min-h-[620px] w-full overflow-hidden">
        {/* Contenedor de las Slides (Efecto de Cross-fade) */}
        <div className="absolute inset-0">
          {SLIDES.map((slide, index) => (
            <div
              key={index}
              className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
              style={{ opacity: index === current ? 1 : 0, zIndex: index === current ? 1 : 0 }}
            >
              <Image
                src={slide.image}
                alt="Simracing Backdrop"
                fill
                priority={index === 0}
                sizes="100vw"
                className="object-cover object-center"
              />
            </div>
          ))}
        </div>

        {/* Gradiente Oscuro continuo que se funde en la base con #030508 */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-[#030508]" style={{ zIndex: 2 }} />

        {/* Flechas de Navegación del Carousel */}
        <button
          onClick={prevSlide}
          className="absolute left-6 top-1/2 -translate-y-1/2 bg-black/40 p-2.5 text-white hover:bg-black/60 transition-colors rounded-none"
          style={{ zIndex: 10 }}
          aria-label="Previous slide"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-6 top-1/2 -translate-y-1/2 bg-black/40 p-2.5 text-white hover:bg-black/60 transition-colors rounded-none"
          style={{ zIndex: 10 }}
          aria-label="Next slide"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Contenido Superpuesto en el Banner - Flexbox vertical para ubicar textos en el centro y stats en la base */}
        <div className="relative mx-auto flex flex-col justify-between h-full max-w-[1400px] px-6 md:px-12 pt-20 pb-14 md:pb-20" style={{ zIndex: 5 }}>
          {/* Sección de Textos y CTA (Centrado Verticalmente en el espacio superior/medio disponible) */}
          <div className="my-auto max-w-2xl text-left space-y-6 md:space-y-8">
            <div className="w-fit">
              <Image src="/branding/rsx-logo.png" alt="RSX Logo" width={440} height={130} priority className="h-auto w-[260px] md:w-[360px]" />
            </div>
            
            <p className="text-lg md:text-xl text-slate-150 leading-relaxed font-semibold transition-all duration-500 max-w-xl">
              {SLIDES[current].subtitle}
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <Link href="/ligas" className="inline-flex bg-[#1274de] hover:bg-[#1f82ee] px-7 py-3 text-xs md:text-sm font-bold uppercase tracking-wider text-white transition-colors rounded-none">
                View leagues
              </Link>
              <Link href="#about" className="inline-flex border border-white/20 bg-white/5 hover:bg-white/10 px-7 py-3 text-xs md:text-sm font-bold uppercase tracking-wider text-white transition-colors rounded-none">
                About RSX
              </Link>
            </div>
          </div>

          {/* Sección de Indicadores (Dots) y Barra de Estadísticas - Fijos en el fondo del Viewport */}
          <div className="w-full space-y-6">
            {/* Puntos del carrusel */}
            <div className="flex justify-center gap-2">
              {SLIDES.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrent(index)}
                  className={`h-1 transition-all duration-300 rounded-none ${index === current ? 'w-10 bg-[#1274de]' : 'w-5 bg-slate-650 hover:bg-slate-500'}`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>

            {/* Columnas de Estadísticas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="space-y-1 relative after:hidden md:after:block after:absolute after:right-0 after:top-1/4 after:h-1/2 after:w-[1px] after:bg-white/15">
                <div className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">{driversCount}</div>
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-350">Drivers</div>
              </div>
              <div className="space-y-1 relative after:hidden md:after:block after:absolute after:right-0 after:top-1/4 after:h-1/2 after:w-[1px] after:bg-white/15">
                <div className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">{leaguesCount}</div>
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-350">Leagues</div>
              </div>
              <div className="space-y-1 relative after:hidden md:after:block after:absolute after:right-0 after:top-1/4 after:h-1/2 after:w-[1px] after:bg-white/15">
                <div className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">{simulatorsCount}</div>
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-350">Simulators</div>
              </div>
              <div className="space-y-1">
                <div className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">{racesCount}</div>
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-350">Races</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
