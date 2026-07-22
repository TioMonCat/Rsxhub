'use client'

import { useState, useEffect, useMemo } from 'react'

export type League = {
  id: string
  title: string
  slug: string
  simulator: string
  format: string
  classTags?: string[]
  startsAt: string
  endsAt: string
  maxDrivers: number | null
  registrationOpen: boolean
  fullDescription: string
  status: string
  bannerUrl: string | null
  accentColor?: string | null
  slogan?: string | null
  discordUrl?: string | null
  youtubeUrl?: string | null
  rulebookUrl?: string | null
}

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
}

export type Registration = {
  id: string
  leagueId: string
  userId: string
  teamId: string | null
  displayName: string
  classTag: string | null
  assignedNumber: number | null
  status: string
}

export type ManagedTeam = {
  id: string
  name: string
  logoUrl: string | null
  members: Array<{ userId: string; displayName: string }>
}

export type LeagueCar = {
  id: string
  label: string
  model: string
}

export type EventConfirmation = {
  id: string
  eventId: string
  leagueId: string
  teamId: string
  classTag: string
  carNumber: number
  carModel: string
  status: string
}

export type TeamStanding = {
  id: string
  name: string
  points: number
  logoUrl: string
  drivers: string
  assignedNumber?: number | null
  carImageUrl?: string | null
}

export function useLeagueState({
  league,
  initialEvents,
  initialRegistrations,
  myManagedTeams,
  teamInfo = {},
  initialConfirmations = []
}: {
  league: League
  initialEvents: LeagueEvent[]
  initialRegistrations: Registration[]
  myManagedTeams: ManagedTeam[]
  teamInfo?: Record<string, { name: string; primaryColor: string | null; logoUrl: string | null }>
  initialConfirmations?: EventConfirmation[]
}) {
  const [events, setEvents] = useState<LeagueEvent[]>(initialEvents)
  const [confirmations, setConfirmations] = useState<EventConfirmation[]>(initialConfirmations)

  const classTags = useMemo(
    () => (league.classTags && league.classTags.length > 0 ? league.classTags : ['GT3']),
    [league.classTags]
  )

  const [standings, setStandings] = useState<Record<string, TeamStanding[]>>({})
  const [standingsIndices, setStandingsIndices] = useState<Record<string, number>>({})

  useEffect(() => {
    const initialStandings: Record<string, TeamStanding[]> = {}
    const initialIndices: Record<string, number> = {}

    classTags.forEach((tag) => {
      const uniqueKeys = new Set<string>()
      const list: TeamStanding[] = []

      initialRegistrations.forEach((reg) => {
        if (reg.classTag === tag && reg.teamId && reg.status !== 'rejected') {
          const teamDetails = teamInfo[reg.teamId] || myManagedTeams.find((t) => t.id === reg.teamId) || {
            name: reg.displayName,
            logoUrl: `https://placehold.co/40x40/0a1220/ffffff?text=${reg.displayName.slice(0, 3).toUpperCase()}`
          }

          const dorsal = reg.assignedNumber != null ? Number(reg.assignedNumber) : null
          const uniqueKey = `${reg.teamId}_${dorsal != null ? dorsal : ''}`

          if (!uniqueKeys.has(uniqueKey)) {
            uniqueKeys.add(uniqueKey)
            const teamName = teamDetails.name
            const logoUrl = teamDetails.logoUrl || `https://placehold.co/40x40/0a1220/ffffff?text=${teamName.slice(0, 3).toUpperCase()}`
            const carImageUrl = (teamDetails as any).carImageUrl || (teamDetails as any).lateralImageUrl || '/branding/lateral-car.png'

            list.push({
              id: uniqueKey,
              name: teamName,
              points: 0,
              logoUrl,
              drivers: '',
              assignedNumber: dorsal,
              carImageUrl,
            })
          }
        }
      })

      // Demo/Testing: Fill up to 5 teams if fewer than 5 exist in database
      const mockDemoTeams: TeamStanding[] = [
        {
          id: 'mock_t_redbull',
          name: 'Red Bull Sim Racing',
          points: 45,
          logoUrl: 'https://placehold.co/40x40/0a1220/ffffff?text=RBR',
          drivers: '',
          assignedNumber: 33,
          carImageUrl: '/branding/lateral-car.png',
        },
        {
          id: 'mock_t_ferrari',
          name: 'Ferrari Esports',
          points: 38,
          logoUrl: 'https://placehold.co/40x40/0a1220/ffffff?text=FER',
          drivers: '',
          assignedNumber: 51,
          carImageUrl: '/branding/lateral-car.png',
        },
        {
          id: 'mock_t_porsche',
          name: 'Porsche Coanda Esports',
          points: 29,
          logoUrl: 'https://placehold.co/40x40/0a1220/ffffff?text=POR',
          drivers: '',
          assignedNumber: 91,
          carImageUrl: '/branding/lateral-car.png',
        },
        {
          id: 'mock_t_bmw',
          name: 'BMW M Team BS+COMPETITION',
          points: 22,
          logoUrl: 'https://placehold.co/40x40/0a1220/ffffff?text=BMW',
          drivers: '',
          assignedNumber: 46,
          carImageUrl: '/branding/lateral-car.png',
        },
      ]

      mockDemoTeams.forEach((demoItem) => {
        if (!uniqueKeys.has(demoItem.id) && list.length < 5) {
          uniqueKeys.add(demoItem.id)
          list.push(demoItem)
        }
      })

      initialIndices[tag] = 0
      initialStandings[tag] = list
    })
    setStandings(initialStandings)
    setStandingsIndices(initialIndices)
  }, [initialRegistrations, classTags, myManagedTeams, teamInfo])

  // Custom car images per team
  const [customCarImages, setCustomCarImages] = useState<Record<string, string>>({})

  useEffect(() => {
    try {
      const saved = localStorage.getItem('team_car_images')
      if (saved) {
        setCustomCarImages(JSON.parse(saved))
      }
    } catch (e) {}
  }, [])

  const handleCarImageUpload = async (teamId: string, file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      if (result) {
        setCustomCarImages((prev) => {
          const next = { ...prev, [teamId]: result }
          try {
            const saved = JSON.parse(localStorage.getItem('team_car_images') || '{}')
            saved[teamId] = result
            localStorage.setItem('team_car_images', JSON.stringify(saved))
          } catch (err) {}
          return next
        })
      }
    }
    reader.readAsDataURL(file)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'car')
      const res = await fetch('/api/uploads', {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        const data = await res.json()
        if (data.url) {
          setCustomCarImages((prev) => {
            const next = { ...prev, [teamId]: data.url }
            try {
              const saved = JSON.parse(localStorage.getItem('team_car_images') || '{}')
              saved[teamId] = data.url
              localStorage.setItem('team_car_images', JSON.stringify(saved))
            } catch (err) {}
            return next
          })
        }
      }
    } catch (err) {
      console.error('Failed to upload car image:', err)
    }
  }

  // Scroll standings
  const scrollStandings = (tag: string, direction: 'up' | 'down') => {
    setStandingsIndices((prev) => {
      const current = prev[tag] || 0
      const total = (standings[tag] || []).length
      if (direction === 'up') {
        return { ...prev, [tag]: Math.max(0, current - 5) }
      } else {
        return { ...prev, [tag]: Math.min(Math.max(0, total - 5), current + 5) }
      }
    })
  }

  // Track registrations grouped by team & category
  const managedTeamIds = useMemo(() => new Set(myManagedTeams.map((t) => t.id)), [myManagedTeams])
  const registeredCars = useMemo(
    () => initialRegistrations.filter((r) => r.teamId && managedTeamIds.has(r.teamId) && r.status !== 'rejected'),
    [initialRegistrations, managedTeamIds]
  )

  const uniqueRegisteredCars = useMemo(
    () =>
      Array.from(
        registeredCars.reduce((acc, r) => {
          const key = `${r.teamId}_${r.classTag}_${r.assignedNumber}`
          if (!acc.has(key)) acc.set(key, r)
          return acc
        }, new Map<string, Registration>()).values()
      ),
    [registeredCars]
  )

  const groupedRegistrations = useMemo(() => {
    const map = new Map<string, { teamId: string; teamName: string; categories: string[] }>()
    
    uniqueRegisteredCars.forEach((car) => {
      if (!car.teamId) return
      const teamName = myManagedTeams.find((t) => t.id === car.teamId)?.name || 'Team'
      const tag = car.classTag || 'GENERAL'
      if (!map.has(car.teamId)) {
        map.set(car.teamId, { teamId: car.teamId, teamName, categories: [] })
      }
      const teamRecord = map.get(car.teamId)!
      if (!teamRecord.categories.includes(tag)) {
        teamRecord.categories.push(tag)
      }
    })

    return Array.from(map.values())
  }, [uniqueRegisteredCars, myManagedTeams])

  return {
    events,
    setEvents,
    confirmations,
    setConfirmations,
    classTags,
    standings,
    standingsIndices,
    customCarImages,
    handleCarImageUpload,
    scrollStandings,
    registeredCars,
    uniqueRegisteredCars,
    groupedRegistrations
  }
}
