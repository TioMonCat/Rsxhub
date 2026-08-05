export type CarEntry = {
  id: string
  category: 'GT3' | 'LMP2' | 'HYPERCAR'
  dorsal: string // String representation: '0', '00', '000', '7', '07', '123'
  skinUrl: string
  driverUserIds: string[] // All assigned drivers across all leagues
  driverUserIdsByLeague?: Record<string, string[]> // Mapping: leagueId -> driverUserIds[]
  leagueId?: string | null
}

export type TeamMemberOption = {
  userId: string
  name: string
  steamId?: string
}

export type TakenDorsal = {
  teamId: string
  teamName: string
  category: string
  dorsal: string
  leagueId?: string | null
}

export type LeagueOption = {
  id: string
  slug: string
  title: string
  classTags: string[]
  maxDriversPerCar?: number
}

export function getSkinFileName(url: string): string {
  if (!url) return 'skin.zip'
  if (url.startsWith('data:')) {
    const match = url.match(/name=([^;]+)/)
    if (match && match[1]) {
      try {
        return decodeURIComponent(match[1])
      } catch {
        return match[1]
      }
    }
    return 'skin.zip'
  }
  const cleanName = url.split('/').pop()?.split('?')[0] || 'skin.zip'
  try {
    return decodeURIComponent(cleanName)
  } catch {
    return cleanName
  }
}
