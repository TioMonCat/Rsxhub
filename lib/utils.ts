import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string) {
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateString))
}

export function formatDateTime(dateString: string) {
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  }).format(new Date(dateString))
}

export function simulatorLabel(sim: string) {
  if (sim === 'ac') return 'Assetto Corsa'
  if (sim === 'lmu') return 'Le Mans Ultimate'
  return sim
}

export function formatLabel(format: string) {
  const labels: Record<string, string> = {
    sprint: 'Sprint',
    endurance: 'Endurance',
    gt3: 'GT3',
    prototype: 'Prototypes',
    formula: 'Formula',
    multiclass: 'Multiclass',
  }
  return labels[format] ?? format
}

export function statusLabel(status: string) {
  const labels: Record<string, string> = {
    open: 'Open',
    ongoing: 'Ongoing',
    finished: 'Finished',
    draft: 'Draft',
  }
  return labels[status] ?? status
}
