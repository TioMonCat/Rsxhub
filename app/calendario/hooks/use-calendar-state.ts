'use client'

import { useState, useEffect } from 'react'

export type LeagueEvent = {
  id: string
  leagueId: string
  circuitId: string | null
  title: string | null
  circuitName: string
  circuitImageUrl: string | null
  serverLink?: string | null
  startsAt: string
  endsAt: string
  status: string
  eventType?: 'race' | 'qualifying' | 'time_attack' | null
  countryCode?: string | null
}

export type League = {
  id: string
  title: string
  slug: string
  simulator?: string
  registrationOpen?: boolean
}

export function useCalendarState({
  initialEvents,
  leagues
}: {
  initialEvents: LeagueEvent[]
  leagues: League[]
}) {
  const [events, setEvents] = useState<LeagueEvent[]>(initialEvents)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [editingEvent, setEditingEvent] = useState<LeagueEvent | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [programmeFilter, setProgrammeFilter] = useState<'all' | 'race' | 'qualifying' | 'time_attack'>('all')

  useEffect(() => {
    setEvents(initialEvents)
  }, [initialEvents])

  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    import('@/lib/firebase-client').then(({ getFirebaseClientDb }) => {
      const db = getFirebaseClientDb()
      if (!db) return

      import('firebase/firestore').then(({ collection, onSnapshot }) => {
        unsubscribe = onSnapshot(
          collection(db, 'league_events'),
          (snapshot) => {
            const fetchedEvents: LeagueEvent[] = []
            snapshot.forEach((doc) => {
              const data = doc.data()
              let startsAt = ''
              if (data.starts_at) {
                startsAt = typeof data.starts_at.toDate === 'function' ? data.starts_at.toDate().toISOString() : String(data.starts_at)
              } else if (data.startsAt) {
                startsAt = String(data.startsAt)
              }

              let endsAt = ''
              if (data.ends_at) {
                endsAt = typeof data.ends_at.toDate === 'function' ? data.ends_at.toDate().toISOString() : String(data.ends_at)
              } else if (data.endsAt) {
                endsAt = String(data.endsAt)
              }

              fetchedEvents.push({
                id: doc.id,
                leagueId: data.league_id || data.leagueId || '',
                circuitId: data.circuit_id || data.circuitId || null,
                title: data.title || null,
                circuitName: data.circuit_name || data.circuitName || '',
                circuitImageUrl: data.circuit_image_url || data.circuitImageUrl || null,
                serverLink: data.server_link || data.serverLink || null,
                startsAt,
                endsAt,
                status: data.status || 'scheduled',
              })
            })

            fetchedEvents.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
            setEvents(fetchedEvents)
          },
          (error) => {
            console.error('Firestore onSnapshot error:', error)
          }
        )
      })
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  const leagueById = new Map(leagues.map((l) => [l.id, l]))

  function getLeagueGradient(leagueTitle?: string, leagueSlug?: string) {
    const title = String(leagueTitle || '').toUpperCase()
    const slug = String(leagueSlug || '').toLowerCase()

    if (slug.includes('erc-ng') || slug.includes('nextgen') || title.includes('NEXT GEN') || title.includes('NG')) {
      return 'linear-gradient(to right, #ea384d 0%, #f96332 55%, #ff8c42 100%)'
    }
    if (slug.includes('erc') || title.includes('ERC') || title.includes('ENDURANCE REAL')) {
      return 'linear-gradient(to right, #1d4ed8 0%, #2563eb 55%, #38bdf8 100%)'
    }
    return 'linear-gradient(to right, #0f766e 0%, #0d9488 55%, #2dd4bf 100%)'
  }

  return {
    events,
    setEvents,
    selectedDate,
    setSelectedDate,
    editingEvent,
    setEditingEvent,
    isModalOpen,
    setIsModalOpen,
    programmeFilter,
    setProgrammeFilter,
    leagueById,
    getLeagueGradient
  }
}
