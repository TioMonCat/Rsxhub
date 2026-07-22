import type { League, LeagueEvent, LeagueRegistration, Profile } from '@/types'

export const leagues: League[] = [
  {
    id: '1',
    title: 'Endurance Real Championship',
    slug: 'erc',
    shortDescription: 'Official Endurance Real Championship League.',
    fullDescription:
      'Official Endurance Real Championship League in Assetto Corsa featuring multi-class endurance races.',
    simulator: 'ac',
    format: 'endurance',
    classTags: ['GT3', 'HYPERCAR'],
    status: 'open',
    bannerUrl: '/branding/erc_bann.png',
    startsAt: '2026-04-05T18:00:00.000Z',
    endsAt: '2026-06-28T18:00:00.000Z',
    featured: true,
    registrationOpen: true,
    maxDrivers: 42,
  },
  {
    id: '2',
    title: 'ERC Next Gen',
    slug: 'erc-next-gen',
    shortDescription: 'Official ERC Next Gen League.',
    fullDescription:
      'Official ERC Next Gen League in Assetto Corsa featuring intense sprint races for upcoming drivers.',
    simulator: 'ac',
    format: 'sprint',
    classTags: ['GT3'],
    status: 'ongoing',
    bannerUrl: '/branding/erc_ng_bann.png',
    startsAt: '2026-03-18T19:30:00.000Z',
    endsAt: '2026-05-20T19:30:00.000Z',
    featured: true,
    registrationOpen: true,
    maxDrivers: 30,
  }
]

export const leagueEvents: LeagueEvent[] = [
  {
    id: 'e1',
    leagueId: '1',
    title: 'Round 1',
    circuitName: 'Monza',
    startsAt: '2026-04-05T18:00:00.000Z',
    endsAt: '2026-04-05T21:00:00.000Z',
    status: 'scheduled',
  },
  {
    id: 'e2',
    leagueId: '1',
    title: 'Round 2',
    circuitName: 'Spa-Francorchamps',
    startsAt: '2026-04-19T18:00:00.000Z',
    endsAt: '2026-04-19T21:00:00.000Z',
    status: 'scheduled',
  },
  {
    id: 'e3',
    leagueId: '2',
    title: 'Round 1',
    circuitName: 'Barcelona-Catalunya',
    startsAt: '2026-03-22T19:30:00.000Z',
    endsAt: '2026-03-22T20:30:00.000Z',
    status: 'scheduled',
  },
  {
    id: 'e4',
    leagueId: '2',
    title: 'Round 2',
    circuitName: 'Imola',
    startsAt: '2026-03-29T19:30:00.000Z',
    endsAt: '2026-03-29T20:30:00.000Z',
    status: 'scheduled',
  }
]

export const mockRegistrations: LeagueRegistration[] = [
  {
    id: 'r1',
    leagueId: '1',
    userId: 'u-alpha',
    displayName: 'Alex Moreno',
    steamId: '76561198000000111',
    createdAt: '2026-03-10T17:10:00.000Z',
    status: 'approved',
  },
  {
    id: 'r2',
    leagueId: '1',
    userId: 'u-beta',
    displayName: 'Marco Vidal',
    steamId: '76561198000000222',
    createdAt: '2026-03-12T12:00:00.000Z',
    status: 'pending',
  },
  {
    id: 'r3',
    leagueId: '2',
    userId: 'u-gamma',
    displayName: 'David Ruiz',
    steamId: '76561198000000333',
    createdAt: '2026-03-08T09:30:00.000Z',
    status: 'approved',
  },
]

export const mockProfile: Profile = {
  id: 'p1',
  displayName: 'Pol Cuerva',
  countryCode: 'ES',
  bio: 'Piloto y organizador de campeonatos de simracing con foco en experiencia competitiva y branding profesional.',
  mainSim: 'ac',
  racingNumber: 14,
  avatarUrl: null,
  steamId: '76561198000000000',
  steamDisplayName: 'PolSimracing',
}
