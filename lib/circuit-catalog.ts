import type { Circuit } from '@/types'

export const DEFAULT_CIRCUITS: Circuit[] = [
  { id: 'sys-daytona', name: 'Daytona International Speedway', slug: 'daytona-international-speedway', imageUrl: '/circuits/daytona.svg', isSystem: true },
  { id: 'sys-monza', name: 'Autodromo Nazionale Monza', slug: 'autodromo-nazionale-monza', imageUrl: '/circuits/monza.svg', isSystem: true },
  { id: 'sys-spa', name: 'Circuit de Spa-Francorchamps', slug: 'circuit-de-spa-francorchamps', imageUrl: '/circuits/spa.svg', isSystem: true },
  { id: 'sys-imola', name: 'Autodromo Enzo e Dino Ferrari', slug: 'autodromo-enzo-e-dino-ferrari', imageUrl: '/circuits/imola.svg', isSystem: true },
  { id: 'sys-lemans', name: 'Circuit de la Sarthe', slug: 'circuit-de-la-sarthe', imageUrl: '/circuits/lemans.svg', isSystem: true },
  { id: 'sys-nurburgring', name: 'Nurburgring GP', slug: 'nurburgring-gp', imageUrl: '/circuits/nurburgring.svg', isSystem: true },
]
