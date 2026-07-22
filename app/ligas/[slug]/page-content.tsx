'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  Trophy,
  Users,
  Settings,
  AlertCircle,
  X,
  FileText,
  Trash,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Award
} from 'lucide-react'
import { updateLeagueDetailsAction, deleteLeagueAction, registerTeamAction, unregisterTeamAction, confirmAttendanceAction, cancelAttendanceAction } from '../actions'
import { ClassBadge } from '@/components/class-badge'
import { ImagePicker } from '@/components/image-picker'
import { saveCalendarEvent, deleteCalendarEvent } from '@/app/calendario/actions'
import { simulatorLabel, formatDate, formatDateTime } from '@/lib/utils'
import { FormattedDate } from '@/components/formatted-date'

type League = {
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

type LeagueEvent = {
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

type Registration = {
  id: string
  leagueId: string
  userId: string
  teamId: string | null
  displayName: string
  classTag: string | null
  assignedNumber: number | null
  status: string
}

type ManagedTeam = {
  id: string
  name: string
  logoUrl: string | null
  members: Array<{ userId: string; displayName: string }>
}

type LeagueCar = {
  id: string
  label: string
  model: string
}

type EventConfirmation = {
  id: string
  eventId: string
  leagueId: string
  teamId: string
  classTag: string
  carNumber: number
  carModel: string
  status: string
}

type Props = {
  league: League
  initialEvents: LeagueEvent[]
  isAdmin: boolean
  session: any
  initialRegistrations: Registration[]
  myManagedTeams: ManagedTeam[]
  leagueCars: LeagueCar[]
  teamInfo?: Record<string, { name: string; primaryColor: string | null; logoUrl: string | null }>
  initialConfirmations?: EventConfirmation[]
}

type TeamStanding = {
  id: string
  name: string
  points: number
  logoUrl: string
  drivers: string
  assignedNumber?: number | null
  carImageUrl?: string | null
}

export default function LeagueDetailPageContent({
  league,
  initialEvents,
  isAdmin,
  session,
  initialRegistrations,
  myManagedTeams,
  leagueCars,
  teamInfo = {},
  initialConfirmations = []
}: Props) {
  const router = useRouter()
  // Timeline events state
  const [events, setEvents] = useState<LeagueEvent[]>(initialEvents)
  const [confirmations, setConfirmations] = useState<EventConfirmation[]>(initialConfirmations)

  // Standings state
  const classTags = league.classTags && league.classTags.length > 0 ? league.classTags : ['GT3']
  const [standings, setStandings] = useState<Record<string, TeamStanding[]>>({})
  const [standingsIndices, setStandingsIndices] = useState<Record<string, number>>({})
  const [activeShowcaseTeamId, setActiveShowcaseTeamId] = useState<Record<string, string>>({})

  // Recent results state (Top 3 on page, full list in sheet modal)
  const [recentResults, setRecentResults] = useState<{
    round: string
    GT3: Array<{ pos: number; team: string; dorsal?: number | null; time: string; gap: string; points: number }>
    HYPERCAR: Array<{ pos: number; team: string; dorsal?: number | null; time: string; gap: string; points: number }>
  }>({
    round: 'No rounds completed yet',
    GT3: [],
    HYPERCAR: []
  })

  useEffect(() => {
    const initialStandings: Record<string, TeamStanding[]> = {}
    const initialIndices: Record<string, number> = {}

    classTags.forEach((tag) => {
      const uniqueKeys = new Set<string>()
      const list: TeamStanding[] = []

      initialRegistrations.forEach((reg) => {
        if (reg.classTag === tag && reg.teamId && reg.status !== 'rejected') {
          // Check if team exists in system
          const teamDetails = teamInfo[reg.teamId] || myManagedTeams.find((t) => t.id === reg.teamId)
          if (!teamDetails) {
            // Skip registrations of deleted teams
            return
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

      initialIndices[tag] = 0
      initialStandings[tag] = list
    })
    setStandings(initialStandings)
    setStandingsIndices(initialIndices)
  }, [initialRegistrations, league.classTags, myManagedTeams, teamInfo])

  // Modals visibility
  const [isEditLeagueOpen, setIsEditLeagueOpen] = useState(false)
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [isResultsOpen, setIsResultsOpen] = useState(false)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [isPublishOpen, setIsPublishOpen] = useState(false)

  // Event form states
  const [editingEvent, setEditingEvent] = useState<LeagueEvent | null>(null)
  const [formEventTitle, setFormEventTitle] = useState('')
  const [formEventCircuit, setFormEventCircuit] = useState('')
  const [formEventDate, setFormEventDate] = useState('')
  const [formEventStartsTime, setFormEventStartsTime] = useState('20:00')
  const [formEventEndsTime, setFormEventEndsTime] = useState('21:30')
  const [formEventImageUrl, setFormEventImageUrl] = useState('')
  const [formEventServerLink, setFormEventServerLink] = useState('')
  const [eventErrorMessage, setEventErrorMessage] = useState('')
  const [isEventSubmitting, setIsEventSubmitting] = useState(false)

  // League Form states
  const [formStartsAt, setFormStartsAt] = useState(league.startsAt.slice(0, 10))
  const [formEndsAt, setFormEndsAt] = useState(league.endsAt.slice(0, 10))
  const [formMaxDrivers, setFormMaxDrivers] = useState(league.maxDrivers || 30)
  const [formClassLimits, setFormClassLimits] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    classTags.forEach(tag => {
      initial[tag] = (league as any).classLimits?.[tag] ?? 30
    })
    return initial
  })
  const [formRegistrationOpen, setFormRegistrationOpen] = useState(league.registrationOpen)
  const [formAccentColor, setFormAccentColor] = useState(league.accentColor || '#1274de')
  const [formSlogan, setFormSlogan] = useState(league.slogan || '')
  const [formDiscordUrl, setFormDiscordUrl] = useState(league.discordUrl || '')
  const [formYoutubeUrl, setFormYoutubeUrl] = useState(league.youtubeUrl || '')
  const [formRulebookUrl, setFormRulebookUrl] = useState(league.rulebookUrl || '')
  const [isLeagueSubmitting, setIsLeagueSubmitting] = useState(false)

  // Registration Form states
  const [selectedTeamId, setSelectedTeamId] = useState(myManagedTeams[0]?.id || '')
  const [selectedClass, setSelectedClass] = useState(classTags[0] || 'GT3')
  const [selectedCarModel, setSelectedCarModel] = useState(leagueCars[0]?.model || '')
  const [inputCarNumber, setInputCarNumber] = useState('')
  const [selectedDriverUserIds, setSelectedDriverUserIds] = useState<string[]>([])
  const [regErrorMessage, setRegErrorMessage] = useState('')
  const [isRegSubmitting, setIsRegSubmitting] = useState(false)

  // Publish Results input states
  const [publishingEvent, setPublishingEvent] = useState<LeagueEvent | null>(null)
  const [inputResults, setInputResults] = useState<Record<string, Record<string, { pos: number; time: string; gap: string; points: number }>>>({})

  const pad = (v: number) => String(v).padStart(2, '0')

  // Scroll index inside standings list
  const scrollStandings = (tag: string, direction: 'up' | 'down') => {
    const currentIndex = standingsIndices[tag] || 0
    const listLength = (standings[tag] || []).length
    if (direction === 'up' && currentIndex > 0) {
      setStandingsIndices(prev => ({ ...prev, [tag]: currentIndex - 1 }))
    } else if (direction === 'down' && currentIndex < listLength - 3) {
      setStandingsIndices(prev => ({ ...prev, [tag]: currentIndex + 1 }))
    }
  }

  // Live duplicate check
  const numberToCheck = Number(inputCarNumber)
  const isNumberTaken =
    inputCarNumber !== '' &&
    initialRegistrations.some(
      (r) =>
        r.classTag === selectedClass &&
        r.assignedNumber === numberToCheck &&
        r.status !== 'rejected'
    )

  // Find selected team members
  const activeTeamObject = myManagedTeams.find((t) => t.id === selectedTeamId)
  const activeTeamMembers = useMemo(() => {
    return activeTeamObject?.members || []
  }, [activeTeamObject])

  // Calculate new unregistered vehicles and total matching vehicles for the selected team
  const { newVehiclesCount, totalMatchingVehicles, alreadyRegisteredCount } = useMemo(() => {
    const teamCars = (activeTeamObject as any)?.cars || []
    const leagueClassTags = league.classTags || []
    const matching = teamCars.filter((car: any) => {
      if (!car.category) return false
      const c1 = car.category.toUpperCase()
      return leagueClassTags.some((tag: any) => {
        const c2 = tag.toUpperCase()
        return c1 === c2 || (c1.startsWith('LMP') && c2.startsWith('LMP'))
      })
    })

    const unregistered = matching.filter((car: any) => {
      const carClassTag = String(car.category || '').toUpperCase()
      const carDorsalStr = String(car.dorsal || '').replace(/[^0-9]/g, '')
      const carDorsal = carDorsalStr ? Number(carDorsalStr) : 0

      return !initialRegistrations.some((r) => {
        if (r.teamId !== selectedTeamId || r.status === 'rejected') return false
        const rc = String(r.classTag || '').toUpperCase()
        const isClassMatch = rc === carClassTag || (rc.startsWith('LMP') && carClassTag.startsWith('LMP'))
        const rNum = r.assignedNumber != null ? Number(r.assignedNumber) : 0
        return isClassMatch && rNum === carDorsal
      })
    })

    return {
      newVehiclesCount: unregistered.length,
      totalMatchingVehicles: matching.length,
      alreadyRegisteredCount: matching.length - unregistered.length
    }
  }, [activeTeamObject, league.classTags, initialRegistrations, selectedTeamId])

  // Find available classes for the team (only classes that the league supports and where the team has a registered car)
  const availableClasses = useMemo(() => {
    const teamCarCategories = new Set(
      (activeTeamObject as any)?.cars?.map((c: any) => String(c.category || '').toUpperCase()) || []
    )
    const matching = (league.classTags || []).filter((tag) =>
      teamCarCategories.has(tag.toUpperCase())
    )
    if (matching.length === 0) {
      return league.classTags || []
    }
    return matching
  }, [activeTeamObject, league.classTags])

  // Find matching car dorsal for the selected category
  const matchingCar = (activeTeamObject as any)?.cars?.find(
    (c: any) => String(c.category || '').toUpperCase() === selectedClass.toUpperCase()
  )
  const dorsal = matchingCar ? matchingCar.dorsal : ''

  // Automatically select the first available class
  useEffect(() => {
    if (availableClasses.length > 0) {
      if (!availableClasses.includes(selectedClass)) {
        setSelectedClass(availableClasses[0])
      }
    } else {
      setSelectedClass('')
    }
  }, [selectedTeamId, availableClasses])

  // Automatically select all active team members' userIds
  useEffect(() => {
    if (activeTeamMembers && activeTeamMembers.length > 0) {
      setSelectedDriverUserIds(activeTeamMembers.map((m) => m.userId))
    } else {
      setSelectedDriverUserIds([])
    }
  }, [selectedTeamId, activeTeamMembers])

  // Track if any managed team is registered
  const managedTeamIds = new Set(myManagedTeams.map((t) => t.id))
  const registeredCars = initialRegistrations.filter(
    (r) => r.teamId && managedTeamIds.has(r.teamId) && r.status !== 'rejected'
  )

  // Unique list of registered team cards
  const uniqueRegisteredCars = Array.from(
    registeredCars.reduce((acc, r) => {
      const key = `${r.teamId}_${r.classTag}_${r.assignedNumber}`
      if (!acc.has(key)) {
        acc.set(key, r)
      }
      return acc
    }, new Map<string, Registration>()).values()
  )

  const handleRegisterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isNumberTaken) return
    if (selectedDriverUserIds.length === 0) {
      setRegErrorMessage('You must select at least one driver.')
      return
    }

    setIsRegSubmitting(true)
    setRegErrorMessage('')

    const formData = new FormData()
    formData.set('slug', league.slug)
    formData.set('leagueId', league.id)
    formData.set('teamId', selectedTeamId)
    formData.set('classTag', selectedClass || 'GENERAL')
    formData.set('carModel', selectedCarModel)
    formData.set('carNumber', dorsal || '0')
    selectedDriverUserIds.forEach((userId) => {
      formData.append('driverUserIds', userId)
    })

    try {
      await registerTeamAction(formData)
      router.refresh()
      setIsRegisterOpen(false)
      setInputCarNumber('')
      setSelectedDriverUserIds([])
    } catch (err: any) {
      setRegErrorMessage(err.message || 'Failed to register.')
    } finally {
      setIsRegSubmitting(false)
    }
  }

  const handleWithdrawTeam = async (teamId: string, classTag: string) => {
    if (confirm('Are you sure you want to withdraw this team entry?')) {
      const formData = new FormData()
      formData.set('slug', league.slug)
      formData.set('leagueId', league.id)
      formData.set('teamId', teamId)
      formData.set('classTag', classTag)

      try {
        await unregisterTeamAction(formData)
        router.refresh()
      } catch (err: any) {
        alert(err.message || 'Failed to withdraw.')
      }
    }
  }

  const openEventModal = (event?: LeagueEvent) => {
    setEventErrorMessage('')
    if (event) {
      setEditingEvent(event)
      setFormEventTitle(event.title || '')
      setFormEventCircuit(event.circuitName)
      
      const parseDateSafely = (str: string | null | undefined): Date => {
        if (!str) return new Date()
        let d = new Date(str)
        if (!isNaN(d.getTime())) return d
        d = new Date(str.replace(' ', 'T'))
        if (!isNaN(d.getTime())) return d
        return new Date()
      }

      const startDate = parseDateSafely(event.startsAt)
      const endDate = parseDateSafely(event.endsAt)
      const localDateStr = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`
      setFormEventDate(localDateStr)
      setFormEventStartsTime(`${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`)
      setFormEventEndsTime(`${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`)
      setFormEventImageUrl(event.circuitImageUrl || '')
      setFormEventServerLink(event.serverLink || '')
    } else {
      setEditingEvent(null)
      setFormEventTitle('')
      setFormEventCircuit('')
      setFormEventDate(league.startsAt.slice(0, 10))
      setFormEventStartsTime('20:00')
      setFormEventEndsTime('21:30')
      setFormEventImageUrl('')
      setFormEventServerLink('')
    }
    setIsEventModalOpen(true)
  }

  const handleEventSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsEventSubmitting(true)
    setEventErrorMessage('')

    const nativeFormData = new FormData(e.currentTarget)
    const uploadedImageUrl = String(nativeFormData.get('circuitImageUrl') || '').trim()
    const serverLinkUrl = String(nativeFormData.get('serverLink') || '').trim()

    let startsIso = ''
    let endsIso = ''
    try {
      const [year, month, day] = formEventDate.split('-').map(Number)
      const [sHour, sMin] = formEventStartsTime.split(':').map(Number)
      const [eHour, eMin] = formEventEndsTime.split(':').map(Number)
      const localStartsDate = new Date(year, month - 1, day, sHour, sMin)
      const localEndsDate = new Date(year, month - 1, day, eHour, eMin)
      
      if (isNaN(localStartsDate.getTime()) || isNaN(localEndsDate.getTime())) {
        throw new Error('Invalid Date input')
      }
      startsIso = localStartsDate.toISOString()
      endsIso = localEndsDate.toISOString()
    } catch (err) {
      setEventErrorMessage('Invalid date or time parameters.')
      setIsEventSubmitting(false)
      return
    }

    const formData = new FormData()
    if (editingEvent) {
      formData.set('eventId', editingEvent.id)
    }
    formData.set('leagueId', league.id)
    formData.set('title', formEventTitle)
    formData.set('circuitName', formEventCircuit)
    formData.set('date', formEventDate)
    formData.set('startsAt', startsIso)
    formData.set('endsAt', endsIso)
    formData.set('circuitImageUrl', uploadedImageUrl)
    formData.set('serverLink', serverLinkUrl)

    try {
      const res = await saveCalendarEvent(formData)
      if (res && !res.success) {
        setEventErrorMessage(res.error || 'Failed to save event.')
        setIsEventSubmitting(false)
        return
      }

      // Update local events array
      if (editingEvent) {
        setEvents(prev => prev.map(ev => ev.id === editingEvent.id ? {
          ...ev,
          title: formEventTitle || null,
          circuitName: formEventCircuit,
          startsAt: startsIso,
          endsAt: endsIso,
          circuitImageUrl: uploadedImageUrl || null,
          serverLink: serverLinkUrl || null,
        } : ev))
      } else {
        // Refetch/reload simulation - we can push a simulated new event
        const newEv: LeagueEvent = {
          id: `mock_ev_${Date.now()}`,
          leagueId: league.id,
          circuitId: null,
          title: formEventTitle || null,
          circuitName: formEventCircuit,
          circuitImageUrl: uploadedImageUrl || null,
          serverLink: serverLinkUrl || null,
          startsAt: startsIso,
          endsAt: endsIso,
          status: 'scheduled'
        }
        setEvents(prev => [...prev, newEv].sort((a, b) => a.startsAt.localeCompare(b.startsAt)))
      }
      setIsEventModalOpen(false)
    } catch (err: any) {
      setEventErrorMessage(err.message || 'Failed to save event.')
    } finally {
      setIsEventSubmitting(false)
    }
  }

  const handleEventDelete = async (eventId: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        const res = await deleteCalendarEvent(eventId)
        if (res && !res.success) {
          setEventErrorMessage(res.error || 'Failed to delete event.')
          return
        }
        setEvents(prev => prev.filter(ev => ev.id !== eventId))
      } catch (err: any) {
        setEventErrorMessage(err.message || 'Failed to delete event.')
      }
    }
  }

  const handleLeagueUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLeagueSubmitting(true)

    const formData = new FormData(e.currentTarget)
    formData.set('leagueId', league.id)
    formData.set('slug', league.slug)
    formData.set('startsAt', formStartsAt)
    formData.set('endsAt', formEndsAt)
    formData.set('maxDrivers', '9999')
    formData.set('registrationOpen', formRegistrationOpen ? 'true' : 'false')
    
    // Set category limits
    classTags.forEach((tag) => {
      formData.set(`max_cars_${tag}`, String(formClassLimits[tag] ?? 30))
    })
    formData.set('accentColor', formAccentColor)
    formData.set('slogan', formSlogan)
    formData.set('discordUrl', formDiscordUrl)
    formData.set('youtubeUrl', formYoutubeUrl)
    formData.set('rulebookUrl', formRulebookUrl)

    try {
      await updateLeagueDetailsAction(formData)
      router.refresh()
      setIsEditLeagueOpen(false)
    } catch (err: any) {
      alert(err.message || 'Failed to update league details.')
    } finally {
      setIsLeagueSubmitting(false)
    }
  }

  const handleLeagueDelete = async () => {
    if (confirm('CRITICAL WARNING: Are you sure you want to delete this league entirely? This action is irreversible.')) {
      try {
        await deleteLeagueAction(league.id, league.slug)
      } catch (err: any) {
        alert(err.message || 'Failed to delete league.')
      }
    }
  }

  const toggleDriverSelection = (userId: string) => {
    setSelectedDriverUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  // Open Results Publisher
  const openPublishModal = (event: LeagueEvent) => {
    setPublishingEvent(event)
    
    // Seed point templates and results scale
    const initialInput: any = {}
    const pointsScale = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]
    
    classTags.forEach(tag => {
      initialInput[tag] = {}
      const list = standings[tag] || []
      list.forEach((team, idx) => {
        initialInput[tag][team.id] = {
          pos: idx + 1,
          time: idx === 0 ? '1:42:15.502' : `1:42:${15 + idx * 3}.204`,
          gap: idx === 0 ? 'Leader' : `+${idx * 3.124}.042s`,
          points: pointsScale[idx] || 0
        }
      })
    })

    setInputResults(initialInput)
    setIsPublishOpen(true)
  }

  // Handle Results Publisher Submission
  const handlePublishResultsSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!publishingEvent) return

    const newGT3Results: any[] = []
    const newHCResults: any[] = []

    // Update overall standings points and collect race results
    const updatedStandings: Record<string, TeamStanding[]> = {}
    
    classTags.forEach(tag => {
      const teamList = standings[tag] || []
      const classInput = inputResults[tag] || {}

      const updatedList = teamList.map(team => {
        const teamInput = classInput[team.id] || { pos: 99, time: '', gap: '', points: 0 }
        
        const resultRow = {
          pos: Number(teamInput.pos),
          team: team.name,
          dorsal: team.assignedNumber,
          time: teamInput.time,
          gap: teamInput.gap,
          points: Number(teamInput.points)
        }

        if (tag === 'HYPERCAR' || tag === 'LMP2') {
          newHCResults.push(resultRow)
        } else {
          newGT3Results.push(resultRow)
        }

        return {
          ...team,
          points: team.points + Number(teamInput.points)
        }
      })

      // Sort standings list by points descending
      updatedList.sort((a, b) => b.points - a.points)
      updatedStandings[tag] = updatedList
    })

    // Sort race results by pos ascending
    newGT3Results.sort((a, b) => a.pos - b.pos)
    newHCResults.sort((a, b) => a.pos - b.pos)

    // Update state
    setStandings(updatedStandings)
    setRecentResults({
      round: publishingEvent.title || `Round - ${publishingEvent.circuitName}`,
      GT3: newGT3Results,
      HYPERCAR: newHCResults
    })

    // Mark round as finished on the timeline
    setEvents(prev => prev.map(ev => ev.id === publishingEvent.id ? { ...ev, status: 'finished' } : ev))
    
    setIsPublishOpen(false)
    alert(`Results published successfully! Standings and recent results have been recalculated.`)
  }

  // Format milliseconds to h:mm:ss.ms or m:ss.ms
  const formatTimeMs = (ms: number): string => {
    if (!ms || isNaN(ms)) return ''
    const totalSeconds = ms / 1000
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = Math.floor(totalSeconds % 60)
    const milliseconds = Math.round((totalSeconds % 1) * 1000)
    const msStr = String(milliseconds).padStart(3, '0')

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${msStr}`
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}.${msStr}`
  }

  // Smart team name matching helper
  const isTeamMatch = (dbName: string, jsonDriverName: string, jsonTeamName: string): boolean => {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '').trim()
    const nDb = normalize(dbName)
    const nJsonDriver = normalize(jsonDriverName)
    const nJsonTeam = normalize(jsonTeamName)

    if (!nDb) return false

    // 1. Direct or partial match
    if (nJsonTeam.includes(nDb) || nDb.includes(nJsonTeam)) return true
    if (nJsonDriver.includes(nDb) || nDb.includes(nJsonDriver)) return true

    // 2. Acronym match (e.g. TMRT -> The Mission Racing Team)
    const getAcronym = (wordsStr: string) => {
      const words = wordsStr.toUpperCase().replace(/[^A-Z0-9\s]/g, '').split(/\s+/).filter(Boolean)
      if (words.length <= 1) return ''
      return words.map(w => w[0]).join('').toLowerCase()
    }

    const dbAcronym = getAcronym(dbName)
    if (dbAcronym && (nJsonDriver.startsWith(dbAcronym) || nJsonTeam.startsWith(dbAcronym))) {
      return true
    }

    // 3. Common words match (e.g. "Apex" matches "Apex Latam Racing")
    const dbWords = dbName.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3)
    if (dbWords.length > 0) {
      const matchWord = dbWords.find(word => nJsonDriver.includes(word) || nJsonTeam.includes(word))
      if (matchWord) return true
    }

    return false
  }

  // Handle Assetto Corsa JSON upload/import
  const handleAcJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)
        
        // Extract result array
        let rawResults: any[] = []
        if (Array.isArray(json.Result)) rawResults = json.Result
        else if (Array.isArray(json.result)) rawResults = json.result
        else if (Array.isArray(json.results)) rawResults = json.results
        else if (Array.isArray(json.Cars)) rawResults = json.Cars
        else if (Array.isArray(json.cars)) rawResults = json.cars

        if (!rawResults || rawResults.length === 0) {
          alert("Could not find any results/cars data array in this JSON file.")
          return
        }

        const pointsScale = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]
        const updatedInput = { ...inputResults }

        // Process tag by tag (GT3, HYPERCAR, etc.)
        classTags.forEach(tag => {
          if (!updatedInput[tag]) updatedInput[tag] = {}
          const list = standings[tag] || []

          // Filter json results that match this category cars or models
          // (Usually LMH/LMP2/GT3 are split by ClassID or Model name, but we match by registered team details)
          const matchedResults: Array<{ teamId: string; pos: number; totalTime: number; laps: number; bestLap: number; rawRow: any }> = []

          list.forEach(team => {
            // Find best matching row in json results based on team name and dorsal
            let bestRow: any = null
            let bestScore = 0

            rawResults.forEach(row => {
              const driverName = row.DriverName || row.Driver?.Name || ''
              const teamName = row.Team || row.Driver?.Team || ''
              
              if (isTeamMatch(team.name, driverName, teamName)) {
                let score = 5 // default match score for matching team name
                
                // Try to find the car number from the row
                const rawNum = row.CarNumber ?? row.carNumber ?? row.Number ?? row.Car?.CarNumber ?? row.Driver?.CarNumber ?? row.Driver?.Number ?? row.car?.number
                const rowNum = rawNum != null ? Number(rawNum) : null
                
                if (team.assignedNumber != null && rowNum != null) {
                  if (team.assignedNumber === rowNum) {
                    score = 10 // perfect match on both name and dorsal!
                  } else {
                    score = 1 // penalized because dorsals don't match (different car of same team)
                  }
                }
                
                if (score > bestScore) {
                  bestScore = score
                  bestRow = row
                }
              }
            })

            if (bestRow && bestScore >= 2) {
              matchedResults.push({
                teamId: team.id,
                pos: 99, // Will compute relative position below
                totalTime: bestRow.TotalTime || 0,
                laps: bestRow.NumLaps || bestRow.LapsCount || 0,
                bestLap: bestRow.BestLap || 0,
                rawRow: bestRow
              })
            }
          })

          // Sort matched teams in this category by laps (desc) then totalTime (asc) to get correct category standings
          matchedResults.sort((a, b) => {
            if (b.laps !== a.laps) return b.laps - a.laps
            return a.totalTime - b.totalTime
          })

          const leaderTime = matchedResults[0]?.totalTime || 0
          const leaderLaps = matchedResults[0]?.laps || 0

          // Update inputResults with relative values
          matchedResults.forEach((res, index) => {
            const pos = index + 1
            const timeStr = formatTimeMs(res.totalTime)
            
            let gapStr = ''
            if (index === 0) {
              gapStr = 'Leader'
            } else if (res.laps < leaderLaps) {
              const diff = leaderLaps - res.laps
              gapStr = `+${diff} Lap${diff > 1 ? 's' : ''}`
            } else {
              const diffMs = res.totalTime - leaderTime
              gapStr = `+${(diffMs / 1000).toFixed(3)}s`
            }

            const points = pointsScale[index] || 0

            updatedInput[tag][res.teamId] = {
              pos,
              time: timeStr,
              gap: gapStr,
              points
            }
          })
        })

        setInputResults(updatedInput)
        alert("Results successfully imported from Assetto Corsa JSON! Review the positions, times, and points below.")
      } catch (err: any) {
        alert("Error parsing JSON file: " + err.message)
      }
    }
    reader.readAsText(file)
  }

  const toggleEventFieldResult = (tag: string, teamId: string, field: 'pos' | 'time' | 'gap' | 'points', val: any) => {
    setInputResults(prev => {
      const copy = { ...prev }
      if (!copy[tag]) copy[tag] = {}
      if (!copy[tag][teamId]) copy[tag][teamId] = { pos: 1, time: '', gap: '', points: 0 }
      
      if (field === 'pos' || field === 'points') {
        copy[tag][teamId][field] = Number(val)
      } else {
        copy[tag][teamId][field] = String(val)
      }
      return copy
    })
  }

  const visibleEvents = events.filter(e => e.status !== 'cancelled')
  const accentHex = league.accentColor || '#1274de'

  return (
    <div 
      className="league-custom-theme space-y-4 text-white"
      style={{
        '--rsx-accent': accentHex,
        '--rsx-accent-strong': accentHex,
      } as React.CSSProperties}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .league-custom-theme .text-cyan-400 {
          color: ${accentHex} !important;
        }
        .league-custom-theme .text-cyan-300 {
          color: ${accentHex} !important;
        }
        .league-custom-theme .bg-cyan-500 {
          background-color: ${accentHex} !important;
        }
        .league-custom-theme .bg-cyan-950 {
          background-color: ${accentHex}1a !important;
        }
        .league-custom-theme .border-cyan-500 {
          border-color: ${accentHex} !important;
        }
        .league-custom-theme .border-cyan-500\\/40 {
          border-color: ${accentHex}66 !important;
        }
        .league-custom-theme .border-cyan-500\\/30 {
          border-color: ${accentHex}4d !important;
        }
        .league-custom-theme .border-cyan-500\\/10 {
          border-color: ${accentHex}1a !important;
        }
        .league-custom-theme .border-cyan-800\\/50 {
          border-color: ${accentHex}4d !important;
        }
        .league-custom-theme .border-cyan-800\\/30 {
          border-color: ${accentHex}33 !important;
        }
        .league-custom-theme .hover\\:bg-cyan-500\\/10:hover {
          background-color: ${accentHex}1a !important;
        }
        .league-custom-theme .hover\\:bg-cyan-500\\/15:hover {
          background-color: ${accentHex}26 !important;
        }
        .league-custom-theme .hover\\:text-cyan-400:hover {
          color: ${accentHex} !important;
        }
        .league-custom-theme .focus\\:border-cyan-400:focus {
          border-color: ${accentHex} !important;
        }
        .league-custom-theme svg.text-cyan-400 {
          color: ${accentHex} !important;
        }
        .league-custom-theme .bg-shell-accent {
          background-color: ${accentHex} !important;
        }
        .league-custom-theme .text-shell-accent {
          color: ${accentHex} !important;
        }
        .league-custom-theme .border-l-2.border-cyan-500 {
          border-left-color: ${accentHex} !important;
        }
        .league-custom-theme .bg-cyan-950\\/20 {
          background-color: ${accentHex}1a !important;
        }
        .league-custom-theme .text-cyan-300 {
          color: ${accentHex} !important;
        }
        .league-custom-theme .border-cyan-800\\/20 {
          border-color: ${accentHex}1a !important;
        }
      ` }} />
      {/* 1. Main League Card Banner */}
      <section className="overflow-hidden border border-shell-line bg-[#0f1521] rounded-none relative">
        <div
          className="h-52 border-b border-shell-line bg-cover bg-center relative"
          style={{
            backgroundImage: league.bannerUrl
              ? `linear-gradient(to top, rgba(8,11,18,0.92), rgba(8,11,18,0.25)), url(${league.bannerUrl})`
              : 'linear-gradient(135deg, rgba(14,20,30,0.95), rgba(38,55,84,0.85))',
          }}
        >
          {/* Simulator Logo Badge */}
          <div className="absolute right-4 top-4 z-20 bg-white border-t border-r border-b border-black/10 shadow-[0_4px_16px_rgba(0,0,0,0.45)] flex items-center justify-center" style={{width:'64px',height:'64px', borderLeft: `3px solid ${accentHex}`}}>
            <img
              src={(league as any).logoUrl || (league.simulator === 'ac' ? '/branding/ACLogo.png' : '/branding/LMULogo.png')}
              alt={league.simulator}
              className="w-full h-full object-contain p-2"
            />
          </div>
        </div>

        <div className="space-y-4 p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="border px-2 py-1 font-semibold uppercase rounded-none" style={{ borderColor: `${accentHex}66`, backgroundColor: `${accentHex}20`, color: accentHex }}>
                {league.status.toUpperCase()}
              </span>
              <span className="border border-shell-line bg-black/20 px-2 py-1 text-slate-200 rounded-none">
                {simulatorLabel(league.simulator)}
              </span>
              <span className="border border-shell-line bg-black/20 px-2 py-1 text-slate-200 rounded-none font-bold uppercase">
                {league.format}
              </span>
              <span className="border border-shell-line bg-black/20 px-2 py-1 text-slate-200 rounded-none">
                {league.registrationOpen ? 'Registration Open' : 'Registration Closed'}
              </span>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditLeagueOpen(true)}
                  className="border border-cyan-500/40 hover:bg-cyan-500/10 px-3 py-1.5 text-xs font-bold uppercase text-cyan-400 rounded-none transition-colors flex items-center gap-1.5"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Edit Settings
                </button>
                <button
                  onClick={handleLeagueDelete}
                  className="border border-rose-500/40 hover:bg-rose-500/10 px-3 py-1.5 text-xs font-bold uppercase text-rose-400 rounded-none transition-colors flex items-center gap-1.5"
                >
                  <Trash className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            )}
          </div>

          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white md:text-4xl">
              {league.title}
            </h1>
            {league.slogan && (
              <p className="text-xs font-extrabold uppercase tracking-widest mt-0.5 italic" style={{ color: accentHex }}>
                {league.slogan}
              </p>
            )}
            <p className="mt-2 max-w-4xl text-sm leading-relaxed text-slate-300">
              {league.fullDescription}
            </p>
          </div>

          {/* Start, End, Grid Details Box */}
          <div className="grid gap-3 md:grid-cols-3">
            <div className="border border-shell-line bg-black/20 p-3 rounded-none relative">
              <p className="text-[11px] uppercase tracking-wider text-slate-400">Start Date</p>
              <p className="mt-1 text-white font-bold"><FormattedDate date={league.startsAt} mode="date" /></p>
            </div>
            <div className="border border-shell-line bg-black/20 p-3 rounded-none relative">
              <p className="text-[11px] uppercase tracking-wider text-slate-400">End Date</p>
              <p className="mt-1 text-white font-bold"><FormattedDate date={league.endsAt} mode="date" /></p>
            </div>

            {/* Registration Box - Restricted to Team Leaders */}
            <div className="border border-shell-line bg-black/20 p-3 rounded-none flex flex-col justify-center min-h-[70px]">
              <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Team Registration</p>
              
              {!session ? (
                <p className="text-xs text-slate-400 italic">Please sign in to register.</p>
              ) : myManagedTeams.length === 0 ? (
                <p className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  Only Team Leaders can sign up.
                </p>
              ) : (
                <div className="space-y-2 w-full">
                  {uniqueRegisteredCars.map((car) => {
                    const teamName = myManagedTeams.find((t) => t.id === car.teamId)?.name || 'Team'
                    return (
                      <div key={car.id} className="flex items-center justify-between gap-2 border border-slate-700 bg-black/40 p-1.5 text-xxs">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="truncate text-slate-200">{teamName}</span>
                          <ClassBadge classTag={car.classTag || ''} className="scale-90" />
                        </div>
                        <button
                          onClick={() => handleWithdrawTeam(car.teamId || '', car.classTag || '')}
                          className="text-rose-400 hover:text-rose-300 font-black uppercase text-[9px] border border-rose-500/20 px-1 py-0.5 hover:bg-rose-500/10"
                        >
                          Withdraw
                        </button>
                      </div>
                    )
                  })}

                  {league.registrationOpen && league.status === 'open' && (
                    <button
                      onClick={() => setIsRegisterOpen(true)}
                      className="bg-shell-accent hover:bg-red-700 px-3 py-1.5 text-xs font-bold uppercase text-white rounded-none transition-colors w-full flex items-center justify-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {registeredCars.length > 0 ? 'Add New Vehicles' : 'Register Team'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Main content area: Schedule & Teams */}
      <section className="grid gap-4 md:grid-cols-[1.6fr_1.4fr]">
        
        {/* Left Side: League Schedule / Rounds */}
        <div className="shell-panel p-4 md:p-5 rounded-none space-y-4">
          <div className="flex items-center justify-between border-b border-shell-line pb-3">
            <div>
              <h2 className="text-xl font-bold uppercase tracking-tight text-white">League Schedule</h2>
              <p className="text-xs text-slate-400 mt-0.5">Timeline of rounds and race sessions.</p>
            </div>
            {isAdmin && (
              <button
                onClick={() => openEventModal()}
                className="bg-shell-accent hover:bg-red-700 px-3 py-1.5 text-xs font-bold uppercase text-white rounded-none transition-colors flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Round
              </button>
            )}
          </div>

          <div className="space-y-3">
            {visibleEvents.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No rounds scheduled for this league.</p>
            ) : (
              visibleEvents.map((ev, idx) => {
                const raceTitle = ev.title?.trim() || `Round ${idx + 1}`
                const isFinished = ev.status === 'finished'

                return (
                  <div
                    key={ev.id}
                    className="overflow-hidden border border-shell-line bg-black/30 p-4 rounded-none space-y-3 hover:border-slate-500 transition-colors"
                  >
                    {/* Top Row: Details & Actions */}
                    <div className="relative flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      {ev.circuitImageUrl && (
                        <div
                          className="absolute right-0 top-0 bottom-0 w-1/3 opacity-15 pointer-events-none bg-cover bg-center bg-no-repeat"
                          style={{ backgroundImage: `url(${ev.circuitImageUrl})` }}
                        />
                      )}

                      <div className="space-y-1 z-10">
                        <div className="flex items-center gap-2">
                          <span className="bg-shell-accent px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-white rounded-none">
                            R{idx + 1}
                          </span>
                          <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">{ev.circuitName}</p>
                          
                          {/* Finished badge indicator */}
                          {isFinished && (
                            <span className="border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[9px] font-extrabold px-1.5 py-0.5 uppercase tracking-wider">
                              Completed
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-extrabold uppercase italic leading-tight text-white">
                          {raceTitle}
                        </h3>
                        <p className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-cyan-400" />
                          <FormattedDate date={ev.startsAt} />
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 z-10 sm:justify-end">
                        {/* Publish / Edit Results Action Button for Admins */}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => openPublishModal(ev)}
                            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-none flex items-center gap-1.5 border transition-all ${
                              isFinished
                                ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10'
                                : 'border-cyan-500/30 text-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10'
                            }`}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {isFinished ? 'Edit Results' : 'Complete Round'}
                          </button>
                        )}

                        {isAdmin && (
                          <div className="flex items-center gap-1 bg-black/40 border border-slate-700">
                            <button
                              type="button"
                              onClick={() => openEventModal(ev)}
                              title="Edit Round Parameters"
                              className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-white/5 transition-colors rounded-none"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEventDelete(ev.id)}
                              title="Delete Round"
                              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-white/5 transition-colors rounded-none"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Grid Occupancy Meter */}
                    <div className="flex flex-wrap gap-3 border-t border-shell-line/20 pt-3 z-10 w-full">
                      {classTags.map((tag) => {
                        const limit = (league as any).classLimits?.[tag] ?? 30
                        const confirmedCount = confirmations.filter(
                          (c) => c.eventId === ev.id && c.classTag === tag && c.status === 'confirmed'
                        ).length
                        const pct = Math.min(100, (confirmedCount / limit) * 100)

                        return (
                          <div key={tag} className="flex-1 min-w-[120px] bg-black/40 border border-shell-line/40 p-2 space-y-1">
                            <div className="flex justify-between items-center text-[10px]">
                              <ClassBadge classTag={tag} className="text-[9px] font-extrabold" />
                              <span className="font-mono font-bold text-slate-300">
                                {confirmedCount} / {limit} cars
                              </span>
                            </div>
                            <div className="w-full bg-slate-800 h-1.5 overflow-hidden">
                              <div 
                                className="h-full bg-cyan-500 transition-all duration-300"
                                style={{ 
                                  width: `${pct}%`,
                                  backgroundColor: pct >= 100 ? '#f43f5e' : (league.accentColor || '#1274de')
                                }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Team Confirmations */}
                    {(() => {
                      const myRegisteredTeams = myManagedTeams.filter(t => 
                        initialRegistrations.some(r => r.teamId === t.id)
                      )
                      if (myRegisteredTeams.length === 0) return null

                      return myRegisteredTeams.map((team) => {
                        const teamCars = initialRegistrations.filter(r => r.teamId === team.id && r.classTag && r.assignedNumber)
                        if (teamCars.length === 0) return null

                        return (
                          <div key={team.id} className="bg-slate-900/40 border border-cyan-500/10 p-3 z-10 space-y-2 mt-2">
                            <p className="text-[11px] uppercase tracking-wider font-extrabold text-cyan-400 flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5" />
                              Confirm Attendance: {team.name}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {teamCars.map((car) => {
                                const tag = car.classTag!
                                const num = car.assignedNumber!
                                const limit = (league as any).classLimits?.[tag] ?? 30
                                const isConfirmed = confirmations.some(
                                  (c) => c.eventId === ev.id && c.teamId === team.id && c.classTag === tag && c.carNumber === num && c.status === 'confirmed'
                                )
                                const confirmedCount = confirmations.filter(
                                  (c) => c.eventId === ev.id && c.classTag === tag && c.status === 'confirmed'
                                ).length
                                const isGridFull = !isConfirmed && (confirmedCount >= limit)

                                return (
                                  <div key={`${tag}_${num}`} className="flex items-center justify-between gap-2 bg-black/40 border border-shell-line/30 px-3 py-1.5">
                                    <div className="flex items-center gap-2">
                                      <ClassBadge classTag={tag} className="text-[9px]" />
                                      <span className="font-mono text-xs font-bold text-slate-200">#{num}</span>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={async () => {
                                        try {
                                          const fd = new FormData()
                                          fd.set('eventId', ev.id)
                                          fd.set('leagueId', league.id)
                                          fd.set('teamId', team.id)
                                          fd.set('classTag', tag)
                                          fd.set('carNumber', String(num))
                                          fd.set('carModel', '')
                                          fd.set('slug', league.slug)

                                          if (isConfirmed) {
                                            await cancelAttendanceAction(fd)
                                            setConfirmations(prev => prev.filter(c => !(c.eventId === ev.id && c.teamId === team.id && c.classTag === tag && c.carNumber === num)))
                                          } else {
                                            await confirmAttendanceAction(fd)
                                            setConfirmations(prev => [...prev, {
                                              id: `${ev.id}_${team.id}_${tag}_${num}`,
                                              eventId: ev.id,
                                              leagueId: league.id,
                                              teamId: team.id,
                                              classTag: tag,
                                              carNumber: num,
                                              carModel: '',
                                              status: 'confirmed'
                                            }])
                                          }
                                          router.refresh()
                                        } catch (err: any) {
                                          alert(err.message || 'Error updating attendance.')
                                        }
                                      }}
                                      disabled={isGridFull}
                                      className={`px-2 py-1 text-[10px] font-bold uppercase transition-colors rounded-none border ${
                                        isConfirmed
                                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25'
                                          : isGridFull
                                          ? 'bg-rose-500/5 border-rose-500/20 text-rose-400/50 cursor-not-allowed'
                                          : 'bg-cyan-500/5 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/15'
                                      }`}
                                    >
                                      {isConfirmed ? 'Confirmed' : isGridFull ? 'Grid Full' : 'Confirm'}
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })
                    })()}
                  </div> )
              })
            )}
          </div>
        </div>

        {/* Right Side: Teams Standings - Scrollable 3 entries at a time */}
        <aside className="shell-panel p-4 md:p-5 rounded-none space-y-4 flex flex-col justify-between">
          <div>
            <div className="border-b border-shell-line pb-3 mb-4">
              <h2 className="text-xl font-bold uppercase tracking-tight text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-cyan-400" />
                Teams Standings
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Championship standings. Use scroll arrows to navigate.
              </p>
            </div>

            <div className="space-y-6">
              {classTags.map((tag) => {
                const teamList = standings[tag] || []
                const startIndex = standingsIndices[tag] || 0
                const visibleTeams = teamList.slice(startIndex, startIndex + 3)

                // Selected or leader team for showcase
                const activeId = activeShowcaseTeamId[tag]
                const featuredTeam = teamList.find((t) => t.id === activeId) || teamList[0]

                return (
                  <div key={tag} className="space-y-3">
                    <div className="flex items-center justify-between border-b border-shell-line/20 pb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-300">Category:</span>
                        <ClassBadge classTag={tag} className="text-[10px]" />
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => scrollStandings(tag, 'up')}
                          disabled={startIndex === 0}
                          className="border border-slate-700 bg-black/30 hover:bg-slate-800 hover:text-cyan-400 p-1 rounded-none disabled:opacity-30 disabled:hover:bg-black/30 disabled:hover:text-white transition-colors"
                          title="Scroll Up"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-[10px] text-slate-400 px-1 font-mono uppercase">
                          {startIndex + 1}-{Math.min(startIndex + 3, teamList.length)} of {teamList.length}
                        </span>
                        <button
                          onClick={() => scrollStandings(tag, 'down')}
                          disabled={startIndex >= teamList.length - 3}
                          className="border border-slate-700 bg-black/30 hover:bg-slate-800 hover:text-cyan-400 p-1 rounded-none disabled:opacity-30 disabled:hover:bg-black/30 disabled:hover:text-white transition-colors"
                          title="Scroll Down"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* FEATURED LATERAL VEHICLE SHOWCASE CARD */}
                    <div className="relative overflow-hidden border border-white/10 bg-gradient-to-br from-[#0c1322] via-[#111c30] to-[#080d18] p-3.5 rounded-none shadow-[0_4px_25px_rgba(0,0,0,0.6)] group">
                      {/* Motorsport background grid texture */}
                      <div className="absolute inset-0 bg-[radial-gradient(#1274de_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.07] pointer-events-none" />
                      
                      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="space-y-1.5 w-full sm:w-1/2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-950/80 px-2 py-0.5 border border-cyan-500/30">
                              FEATURED LIVERY
                            </span>
                            <ClassBadge classTag={tag} className="text-[9px]" />
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {featuredTeam?.logoUrl && (
                              <img
                                src={featuredTeam.logoUrl}
                                alt={featuredTeam.name}
                                className="w-6 h-6 object-cover border border-white/20 shrink-0"
                              />
                            )}
                            <h3 className="text-sm font-black uppercase italic tracking-tight text-white truncate">
                              {featuredTeam ? featuredTeam.name : 'NO TEAM REGISTERED'}
                            </h3>
                          </div>

                          <div className="flex items-center gap-2 text-xxs font-bold text-slate-300">
                            {featuredTeam?.assignedNumber != null && (
                              <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.5 border border-amber-500/40 font-mono">
                                #{featuredTeam.assignedNumber}
                              </span>
                            )}
                            <span className="text-slate-400 font-mono">
                              {featuredTeam ? `${featuredTeam.points} PTS · POS #${(teamList.findIndex(t => t.id === featuredTeam.id) + 1) || 1}` : ''}
                            </span>
                          </div>
                        </div>

                        {/* Lateral Vehicle Graphic */}
                        <div className="relative w-full sm:w-1/2 h-20 sm:h-24 flex items-center justify-center pointer-events-none">
                          <img
                            src={featuredTeam?.carImageUrl || '/branding/lateral-car.png'}
                            alt="Lateral Vehicle"
                            className="max-h-full max-w-full object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.85)] group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {visibleTeams.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No teams registered in this class.</p>
                      ) : (
                        visibleTeams.map((team) => {
                          const originalIdx = teamList.findIndex(t => t.id === team.id)
                          const isSelected = featuredTeam?.id === team.id
                          return (
                            <div
                              key={team.id}
                              onClick={() => setActiveShowcaseTeamId(prev => ({ ...prev, [tag]: team.id }))}
                              className={`border p-2.5 rounded-none flex items-center justify-between gap-3 cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-cyan-500 bg-cyan-950/40 shadow-[0_0_15px_rgba(18,116,222,0.25)]'
                                  : 'border-shell-line bg-black/20 hover:border-slate-500 hover:bg-white/5'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className={`w-5 text-center text-xs font-black ${originalIdx === 0 ? 'text-amber-400' : originalIdx === 1 ? 'text-slate-300' : originalIdx === 2 ? 'text-amber-600' : 'text-slate-400'}`}>
                                  {originalIdx === 0 ? '🥇' : originalIdx === 1 ? '🥈' : originalIdx === 2 ? '🥉' : originalIdx + 1}
                                </span>
                                <img
                                  src={team.logoUrl}
                                  alt={team.name}
                                  className="w-8 h-8 object-cover border border-slate-700 rounded-none shrink-0"
                                />
                                <div className="min-w-0">
                                  <h4 className="text-xs font-black uppercase text-white truncate leading-tight flex items-center gap-1.5 flex-wrap">
                                    <span>{team.name}</span>
                                    {team.assignedNumber != null && (
                                      <span className="text-[10px] bg-cyan-950 text-cyan-400 font-extrabold px-1.5 py-0.5 border border-cyan-800/50 rounded-none whitespace-nowrap">
                                        #{team.assignedNumber}
                                      </span>
                                    )}
                                  </h4>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-xs font-bold text-slate-200 bg-black/40 px-2 py-0.5 border border-shell-line">
                                  {team.points} pts
                                </span>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <p className="text-[10px] text-slate-500 font-semibold uppercase text-center mt-4">
            Positions updated automatically after each round
          </p>
        </aside>
      </section>

      {/* 3. Recent Race Results Section - Shows Top 3 only */}
      <section className="shell-panel p-4 md:p-5 rounded-none space-y-4">
        <div className="flex items-center justify-between border-b border-shell-line pb-3">
          <div>
            <h2 className="text-xl font-bold uppercase tracking-tight text-white flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-400" />
              Recent Race Results (Top 3): {recentResults.round}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Top 3 finishers of the most recent round.</p>
          </div>
          <button
            onClick={() => setIsResultsOpen(true)}
            className="border border-shell-line bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-bold uppercase text-white rounded-none transition-colors flex items-center gap-1.5"
          >
            <FileText className="h-3.5 w-3.5 text-cyan-400" />
            View Full Race sheet
          </button>
        </div>

        {/* Top 3 display grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {classTags.map((tag) => {
            const list = recentResults[tag as 'GT3' | 'HYPERCAR'] || recentResults.GT3
            const top3 = list.slice(0, 3)

            return (
              <div key={tag} className="border border-shell-line bg-black/20 p-4 rounded-none space-y-3">
                <div className="flex items-center gap-2 border-b border-shell-line/30 pb-2 mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-350">Category:</span>
                  <ClassBadge classTag={tag} className="text-[10px]" />
                </div>

                <div className="space-y-2">
                  {top3.map((res, index) => {
                    const medal = index === 0 ? '🏆 1st' : index === 1 ? '🥈 2nd' : '🥉 3rd'
                    const medalColor = index === 0 ? 'text-amber-400' : index === 1 ? 'text-slate-300' : 'text-amber-600'
                    return (
                      <div key={res.pos} className="flex items-center justify-between p-2 border border-shell-line/40 bg-black/10 rounded-none text-xs">
                        <div className="flex items-center gap-3">
                          <span className={`font-black ${medalColor} w-10 uppercase`}>
                            {medal}
                          </span>
                          <div>
                            <span className="font-extrabold text-white block flex items-center gap-1.5 flex-wrap">
                              <span>{res.team}</span>
                              {res.dorsal != null && (
                                <span className="text-[9px] bg-cyan-950 text-cyan-400 font-extrabold px-1.5 py-0.5 border border-cyan-800/50 rounded-none whitespace-nowrap">
                                  #{res.dorsal}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono block text-white font-semibold">{res.time}</span>
                          <span className="text-[10px] text-slate-400 block">{res.gap}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* MODALS */}

      {/* A. Edit League Details Modal */}
      {isAdmin && isEditLeagueOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fade-in">
          <div className="shell-panel border border-shell-line bg-zinc-950 max-w-4xl w-full p-5 md:p-6 text-white rounded-none shadow-[0_0_50px_rgba(0,0,0,0.8)] relative">
            <button
              onClick={() => setIsEditLeagueOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-xl font-bold uppercase tracking-tight text-white mb-2">Edit League Details</h2>
            <p className="text-xs text-slate-400 mb-4">Modify the schedule boundaries and grid parameters.</p>

            <form onSubmit={handleLeagueUpdate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Basic Parameters */}
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">Start Date</label>
                    <input
                      type="date"
                      value={formStartsAt}
                      onChange={(e) => setFormStartsAt(e.target.value)}
                      required
                      className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">End Date</label>
                    <input
                      type="date"
                      value={formEndsAt}
                      onChange={(e) => setFormEndsAt(e.target.value)}
                      required
                      className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">Registered Teams Limit</label>
                    <div className="w-full border border-shell-line bg-black/60 px-3 py-2 text-xs text-slate-300 font-bold uppercase rounded-none">
                      Infinite / Unlimited
                    </div>
                  </div>

                  {/* Category Car Limits */}
                  <div className="space-y-3 border-t border-shell-line/30 pt-3">
                    <label className="block text-xs text-slate-300 uppercase tracking-wider font-semibold">Max Cars per Category</label>
                    <div className="space-y-2">
                      {classTags.map((tag) => (
                        <div key={tag} className="flex items-center justify-between gap-3 bg-black/20 p-2 border border-white/5">
                          <ClassBadge classTag={tag} className="text-xs font-bold" />
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 uppercase font-bold">Limit:</span>
                            <input
                              type="number"
                              value={formClassLimits[tag] ?? 30}
                              onChange={(e) => {
                                const val = Number(e.target.value)
                                setFormClassLimits(prev => ({ ...prev, [tag]: val }))
                              }}
                              min={1}
                              max={150}
                              required
                              className="w-20 border border-shell-line bg-black/60 px-2 py-1 text-xs text-white outline-none rounded-none focus:border-cyan-400"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">Registration Status</label>
                    <select
                      value={formRegistrationOpen ? 'true' : 'false'}
                      onChange={(e) => setFormRegistrationOpen(e.target.value === 'true')}
                      className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400 font-bold"
                    >
                      <option value="true">Open</option>
                      <option value="false">Closed</option>
                    </select>
                  </div>

                  {/* Slogan & Accent Color */}
                  <div>
                    <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">League Slogan</label>
                    <input
                      type="text"
                      value={formSlogan}
                      onChange={(e) => setFormSlogan(e.target.value)}
                      placeholder="e.g. The Ultimate Endurance Challenge"
                      className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs text-slate-300 uppercase tracking-wider font-semibold">League Accent Color</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { name: 'Neon Blue', hex: '#1274de', bg: 'bg-[#1274de]' },
                        { name: 'Neon Pink', hex: '#ec4899', bg: 'bg-[#ec4899]' },
                        { name: 'Electric Lime', hex: '#84cc16', bg: 'bg-[#84cc16]' },
                        { name: 'Fire Orange', hex: '#f97316', bg: 'bg-[#f97316]' },
                        { name: 'Gold Yellow', hex: '#eab308', bg: 'bg-[#eab308]' },
                        { name: 'Acid Purple', hex: '#a855f7', bg: 'bg-[#a855f7]' },
                        { name: 'Electric Blue', hex: '#3b82f6', bg: 'bg-[#3b82f6]' },
                        { name: 'Emerald Green', hex: '#22c55e', bg: 'bg-[#22c55e]' },
                      ].map((color) => {
                        const isSelected = formAccentColor === color.hex
                        return (
                          <button
                            key={color.hex}
                            type="button"
                            onClick={() => setFormAccentColor(color.hex)}
                            className={`flex items-center gap-1.5 border px-2.5 py-1.5 text-[11px] font-bold tracking-wider uppercase transition-all rounded-none cursor-pointer ${
                              isSelected
                                ? 'border-white bg-white/10 text-white'
                                : 'border-white/10 bg-black/40 hover:bg-white/5 text-slate-400'
                            }`}
                          >
                            <span className={`h-2.5 w-2.5 rounded-full ${color.bg}`} />
                            {color.name}
                          </button>
                        )
                      })}
                    </div>
                    <input type="hidden" name="accentColor" value={formAccentColor} />
                  </div>
                </div>

                {/* Right Column: Media Pickers */}
                <div className="space-y-4">
                  <ImagePicker name="bannerUrl" defaultValue={league.bannerUrl || ''} label="League Banner Image" />
                  <ImagePicker name="logoUrl" defaultValue={(league as any).logoUrl || ''} label="League Logo (top-right badge)" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-shell-line/50">
                <button
                  type="button"
                  onClick={() => setIsEditLeagueOpen(false)}
                  className="border border-shell-line bg-transparent hover:bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLeagueSubmitting}
                  className="bg-shell-accent hover:bg-red-700 px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-none transition-colors"
                >
                  {isLeagueSubmitting ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* B. Add / Edit Event (Round) Modal */}
      {isAdmin && isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fade-in">
          <div className="shell-panel border border-shell-line bg-zinc-950 max-w-xl w-full p-5 md:p-6 text-white rounded-none shadow-[0_0_50px_rgba(0,0,0,0.8)] relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsEventModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-xl font-bold uppercase tracking-tight text-white mb-2">
              {editingEvent ? 'Edit Event' : 'Add Event'}
            </h2>
            <p className="text-xs text-slate-400 mb-4 font-semibold uppercase tracking-wider">
              {formEventDate ? new Date(formEventDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <form onSubmit={handleEventSubmit} className="space-y-4">
              {eventErrorMessage && (
                <div className="border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-300 rounded-none">
                  {eventErrorMessage}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">Select League</label>
                <select
                  disabled
                  className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none opacity-80"
                >
                  <option>{league.title}</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">Event Title / Session</label>
                <input
                  type="text"
                  value={formEventTitle}
                  onChange={(e) => setFormEventTitle(e.target.value)}
                  placeholder="e.g. Round 1, Incident Review, Briefing (Optional)"
                  className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400"
                />
              </div>

              {/* Session Type (circuitName database field) */}
              <div>
                <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">Session Type</label>
                <select
                  value={formEventCircuit}
                  onChange={(e) => setFormEventCircuit(e.target.value)}
                  required
                  className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400"
                >
                  <option value="" disabled>-- Select Session Type --</option>
                  <option value="Practice">Practice</option>
                  <option value="Qualifying">Qualifying</option>
                  <option value="Race">Race</option>
                  <option value="Time attack">Time attack</option>
                  {formEventCircuit && !['Practice', 'Qualifying', 'Race', 'Time attack'].includes(formEventCircuit) && (
                    <option value={formEventCircuit}>{formEventCircuit}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">Date</label>
                <input
                  type="date"
                  value={formEventDate}
                  onChange={(e) => setFormEventDate(e.target.value)}
                  required
                  className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">Starts At (Local Time)</label>
                  <input
                    type="time"
                    value={formEventStartsTime}
                    onChange={(e) => setFormEventStartsTime(e.target.value)}
                    required
                    className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">Ends At (Local Time)</label>
                  <input
                    type="time"
                    value={formEventEndsTime}
                    onChange={(e) => setFormEventEndsTime(e.target.value)}
                    required
                    className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Circuit Image Upload */}
              <div>
                <ImagePicker
                  name="circuitImageUrl"
                  defaultValue={formEventImageUrl}
                  label="Circuit Banner Image (PNG/JPG/WebP - compressed automatically)"
                />
              </div>

              {/* Server Entry Link */}
              <div>
                <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">Server Entry Link (Direct Connection)</label>
                <input
                  type="text"
                  name="serverLink"
                  value={formEventServerLink}
                  onChange={(e) => setFormEventServerLink(e.target.value)}
                  placeholder="e.g. steam://connect/12.34.56.78:27015 or direct web link"
                  className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-shell-line/50">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="border border-shell-line bg-transparent hover:bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEventSubmitting}
                  className="bg-shell-accent hover:bg-red-700 px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-none transition-colors"
                >
                  {isEventSubmitting ? 'Saving...' : editingEvent ? 'Save Changes' : 'Create Round'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* C. Full Race Results Sheet Modal */}
      {isResultsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fade-in">
          <div className="shell-panel border border-shell-line bg-zinc-950 max-w-2xl w-full p-5 md:p-6 text-white rounded-none shadow-[0_0_50px_rgba(0,0,0,0.8)] relative">
            <button
              onClick={() => setIsResultsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-xl font-bold uppercase tracking-tight text-white mb-1">
              Full Results Sheet
            </h2>
            <p className="text-xs text-slate-400 mb-4">{recentResults.round}</p>

            <div className="space-y-6 max-h-[400px] overflow-y-auto pr-1">
              {classTags.map((tag) => {
                const list = recentResults[tag as 'GT3' | 'HYPERCAR'] || recentResults.GT3
                return (
                  <div key={tag} className="space-y-2">
                    <div className="flex items-center gap-2 border-l-2 border-cyan-500 pl-2">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-300">Category:</span>
                      <ClassBadge classTag={tag} className="text-[10px]" />
                    </div>
                    <div className="overflow-x-auto border border-shell-line bg-black/20">
                      <table className="min-w-full text-left text-xs">
                        <thead className="bg-black/40 text-[10px] uppercase tracking-wider text-slate-400">
                          <tr>
                            <th className="px-3 py-2 w-12">Pos</th>
                            <th className="px-3 py-2">Team</th>
                            <th className="px-3 py-2">Total Time</th>
                            <th className="px-3 py-2">Gap</th>
                            <th className="px-3 py-2 text-right">Points</th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.map((row) => (
                            <tr key={`${row.team}_${row.dorsal || ''}`} className="border-t border-shell-line/40 text-slate-100">
                              <td className="px-3 py-2 font-black">{row.pos}</td>
                              <td className="px-3 py-2 font-bold">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span>{row.team}</span>
                                  {row.dorsal != null && (
                                    <span className="text-[10px] bg-cyan-950 text-cyan-400 font-black px-1.5 py-0.5 border border-cyan-800/50">
                                      #{row.dorsal}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2 font-mono">{row.time}</td>
                              <td className="px-3 py-2 text-slate-400 font-mono">{row.gap}</td>
                              <td className="px-3 py-2 text-right font-bold text-cyan-400">{row.points}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-end pt-4 border-t border-shell-line/50 mt-4">
              <button
                onClick={() => setIsResultsOpen(false)}
                className="border border-slate-600 hover:bg-white/5 px-6 py-2 text-xs font-bold uppercase tracking-wider rounded-none text-center"
              >
                Close Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* D. Team Registration Modal (Boss Only) */}
      {isRegisterOpen && myManagedTeams.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fade-in">
          <div className="shell-panel border border-shell-line bg-zinc-950 max-w-md w-full p-5 md:p-6 text-white rounded-none shadow-[0_0_50px_rgba(0,0,0,0.8)] relative">
            <button
              onClick={() => setIsRegisterOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-xl font-bold uppercase tracking-tight text-white mb-2">Register Team Entry</h2>
            <p className="text-xs text-slate-400 mb-4">Complete your escuderia profile registration.</p>

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {regErrorMessage && (
                <div className="border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-300 rounded-none">
                  {regErrorMessage}
                </div>
              )}

              {/* Team Selector */}
              <div>
                <label className="mb-1 block text-xs text-slate-300 uppercase tracking-wider font-semibold">Select Team</label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => {
                    setSelectedTeamId(e.target.value)
                    setSelectedDriverUserIds([])
                  }}
                  required
                  className="w-full border border-shell-line bg-black/40 px-3 py-2 text-xs text-white outline-none rounded-none focus:border-cyan-400"
                >
                  {myManagedTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
              {/* Info Section / Full Team Auto-Enrollment */}
              <div className="bg-cyan-950/20 border border-cyan-800/30 p-3.5 space-y-2">
                <p className="text-xs text-cyan-300 font-medium">
                  <strong>Team Registration:</strong> All vehicles and categories configured in your workshop that match this league ({league.classTags?.join(', ')}) will be registered automatically.
                </p>
                {activeTeamObject && (
                  <div className="pt-2 border-t border-cyan-800/20 space-y-2">
                    {(() => {
                      const teamCars = (activeTeamObject as any)?.cars || []
                      const leagueClassTags = league.classTags || []
                      const matching = teamCars.filter((car: any) => {
                        if (!car.category) return false
                        const c1 = car.category.toUpperCase()
                        return leagueClassTags.some((tag: any) => {
                          const c2 = tag.toUpperCase()
                          return c1 === c2 || (c1.startsWith('LMP') && c2.startsWith('LMP'))
                        })
                      })

                      // Identify already registered vehicles
                      const alreadyRegistered = matching.filter((car: any) => {
                        const carClassTag = String(car.category || '').toUpperCase()
                        const carDorsalStr = String(car.dorsal || '').replace(/[^0-9]/g, '')
                        const carDorsal = carDorsalStr ? Number(carDorsalStr) : 0

                        return initialRegistrations.some((r) => {
                          if (r.teamId !== selectedTeamId || r.status === 'rejected') return false
                          const rc = String(r.classTag || '').toUpperCase()
                          const isClassMatch = rc === carClassTag || (rc.startsWith('LMP') && carClassTag.startsWith('LMP'))
                          const rNum = r.assignedNumber != null ? Number(r.assignedNumber) : 0
                          return isClassMatch && rNum === carDorsal
                        })
                      })

                      // Identify new/unregistered vehicles
                      const newVehicles = matching.filter((car: any) => {
                        const carClassTag = String(car.category || '').toUpperCase()
                        const carDorsalStr = String(car.dorsal || '').replace(/[^0-9]/g, '')
                        const carDorsal = carDorsalStr ? Number(carDorsalStr) : 0

                        return !initialRegistrations.some((r) => {
                          if (r.teamId !== selectedTeamId || r.status === 'rejected') return false
                          const rc = String(r.classTag || '').toUpperCase()
                          const isClassMatch = rc === carClassTag || (rc.startsWith('LMP') && carClassTag.startsWith('LMP'))
                          const rNum = r.assignedNumber != null ? Number(r.assignedNumber) : 0
                          return isClassMatch && rNum === carDorsal
                        })
                      })

                      if (matching.length === 0) {
                        return (
                          <p className="text-[11px] text-amber-300 italic">
                            You do not have vehicles configured yet for the league categories ({leagueClassTags.join(', ')}). They will be auto-created and registered by default!
                          </p>
                        )
                      }

                      return (
                        <div className="space-y-3">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider font-semibold text-amber-400 mb-1">
                              {alreadyRegistered.length > 0 ? 'New vehicles to add:' : 'Vehicles to register based on your workshop:'}
                            </p>
                            {newVehicles.length === 0 ? (
                              <p className="text-[11px] text-slate-400 italic bg-black/10 p-2 border border-white/5">
                                All vehicles in your workshop for this league are already registered. There are no new vehicles to add.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 gap-1 text-[11px] font-mono">
                                {newVehicles.map((car: any, idx: number) => {
                                  const carDrivers = Array.isArray(car.driverUserIds) ? car.driverUserIds.filter(Boolean) : []
                                  return (
                                    <div key={idx} className="flex justify-between items-center bg-black/20 px-2 py-1 border border-white/5">
                                      <span className="text-white font-bold">{car.category?.toUpperCase()}</span>
                                      <span className="text-slate-400">Car #{car.dorsal || 'Auto'} ({carDrivers.length} drivers)</span>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-shell-line/50">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="border border-shell-line bg-transparent hover:bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRegSubmitting || activeTeamMembers.length === 0 || (alreadyRegisteredCount > 0 && newVehiclesCount === 0)}
                  className="bg-shell-accent hover:bg-red-700 disabled:opacity-30 disabled:hover:bg-shell-accent disabled:cursor-not-allowed px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-none transition-colors"
                >
                  {isRegSubmitting
                    ? 'Processing...'
                    : alreadyRegisteredCount > 0
                    ? newVehiclesCount === 0
                      ? 'All Registered'
                      : 'Add New Vehicles'
                    : 'Add New Vehicles'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* E. Publish Round Results Modal (Admin Only) */}
      {isPublishOpen && publishingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fade-in">
          <div className="shell-panel border border-shell-line bg-zinc-950 max-w-4xl w-full p-5 md:p-6 text-white rounded-none shadow-[0_0_50px_rgba(0,0,0,0.8)] relative flex flex-col max-h-[90vh]">
            <button
              onClick={() => setIsPublishOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-shell-line pb-4">
              <div>
                <h2 className="text-xl font-bold uppercase tracking-tight text-white flex items-center gap-2">
                  <Award className="h-5 w-5 text-cyan-400" />
                  Publish Results: {publishingEvent.title || `Round - ${publishingEvent.circuitName}`}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Set positions, total times, gaps, and points to distribute to team standings.
                </p>
              </div>

              {/* JSON Importer Button */}
              <div className="flex-shrink-0">
                <label className="inline-flex items-center gap-1.5 border border-[#1274de] bg-[#1274de]/10 hover:bg-[#1274de]/25 px-4 py-2 text-xs font-bold uppercase text-sky-400 rounded-none cursor-pointer transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Import Assetto Corsa JSON
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleAcJsonImport}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <form onSubmit={handlePublishResultsSubmit} className="space-y-6 overflow-y-auto flex-1 pr-1">
              {classTags.map((tag) => {
                const list = standings[tag] || []
                const classInput = inputResults[tag] || {}

                return (
                  <div key={tag} className="space-y-3">
                    <div className="flex items-center gap-2 border-l-2 border-cyan-500 pl-2">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-300">Category:</span>
                      <ClassBadge classTag={tag} className="text-[10px]" />
                    </div>

                    <div className="overflow-x-auto border border-shell-line bg-black/20">
                      <table className="min-w-full text-left text-xs">
                        <thead className="bg-black/40 text-[10px] uppercase tracking-wider text-slate-400">
                          <tr>
                            <th className="px-3 py-2">Team Name</th>
                            <th className="px-3 py-2 w-20">Position</th>
                            <th className="px-3 py-2 w-32">Total Time</th>
                            <th className="px-3 py-2 w-28">Gap</th>
                            <th className="px-3 py-2 w-24">Points Awarded</th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.map((team) => {
                            const entry = classInput[team.id] || { pos: 1, time: '', gap: '', points: 0 }
                            return (
                              <tr key={team.id} className="border-t border-shell-line/40 text-slate-100">
                                <td className="px-3 py-2 font-bold">
                                  <div className="flex items-center gap-2">
                                    <img src={team.logoUrl} className="w-5 h-5 object-cover border border-slate-700 shrink-0" alt={team.name} />
                                    <span>{team.name}</span>
                                    {team.assignedNumber != null && (
                                      <span className="text-[10px] bg-cyan-950 text-cyan-400 font-black px-1.5 py-0.5 border border-cyan-800/50">
                                        #{team.assignedNumber}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                
                                <td className="px-2 py-1.5">
                                  <input
                                    type="number"
                                    min={1}
                                    max={99}
                                    required
                                    value={entry.pos}
                                    onChange={(e) => toggleEventFieldResult(tag, team.id, 'pos', e.target.value)}
                                    className="w-16 border border-shell-line bg-black/40 px-2 py-1 text-center font-bold outline-none rounded-none focus:border-cyan-400"
                                  />
                                </td>

                                <td className="px-2 py-1.5">
                                  <input
                                    type="text"
                                    required
                                    value={entry.time}
                                    onChange={(e) => toggleEventFieldResult(tag, team.id, 'time', e.target.value)}
                                    placeholder="e.g. 1:42:15.502"
                                    className="w-28 border border-shell-line bg-black/40 px-2 py-1 font-mono outline-none rounded-none focus:border-cyan-400"
                                  />
                                </td>

                                <td className="px-2 py-1.5">
                                  <input
                                    type="text"
                                    required
                                    value={entry.gap}
                                    onChange={(e) => toggleEventFieldResult(tag, team.id, 'gap', e.target.value)}
                                    placeholder="e.g. Leader or +2.618s"
                                    className="w-24 border border-shell-line bg-black/40 px-2 py-1 font-mono outline-none rounded-none focus:border-cyan-400"
                                  />
                                </td>

                                <td className="px-2 py-1.5">
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    required
                                    value={entry.points}
                                    onChange={(e) => toggleEventFieldResult(tag, team.id, 'points', e.target.value)}
                                    className="w-20 border border-shell-line bg-black/40 px-2 py-1 font-bold text-cyan-400 outline-none rounded-none focus:border-cyan-400"
                                  />
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })}

              <div className="flex justify-end gap-2 pt-4 border-t border-shell-line/50">
                <button
                  type="button"
                  onClick={() => setIsPublishOpen(false)}
                  className="border border-shell-line bg-transparent hover:bg-white/5 px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-shell-accent hover:bg-red-700 px-8 py-2.5 text-xs font-bold uppercase tracking-wider rounded-none transition-colors"
                >
                  Publish Results & Complete Round
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
