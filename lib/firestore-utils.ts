/**
 * lib/firestore-utils.ts
 * Shared Firestore utility functions used across platform-data and team-data.
 */

/**
 * Converts Firestore Timestamps and raw values into serializable primitives.
 */
export function formatFirestoreValue(val: any): any {
  if (val && typeof val.toDate === 'function') {
    return val.toDate().toISOString()
  }
  return val
}

/**
 * Parses a raw value into a string array, normalizing each tag to UPPERCASE.
 * Returns undefined if no valid tags are found.
 */
export function parseClassTags(raw: unknown): string[] | undefined {
  if (Array.isArray(raw)) {
    const tags = raw.map((item) => String(item || '').trim().toUpperCase()).filter(Boolean)
    return tags.length ? tags : undefined
  }

  if (typeof raw === 'string') {
    const normalized = raw.trim()
    if (!normalized) return undefined

    if (normalized.startsWith('[') && normalized.endsWith(']')) {
      try {
        const parsed = JSON.parse(normalized)
        if (Array.isArray(parsed)) {
          const tags = parsed.map((item) => String(item || '').trim().toUpperCase()).filter(Boolean)
          return tags.length ? tags : undefined
        }
      } catch {}
    }

    const cleaned = normalized.replace(/^\{|\}$/g, '')
    const tags = cleaned
      .split(',')
      .map((item) => item.replace(/^"+|"+$/g, '').trim().toUpperCase())
      .filter(Boolean)
    return tags.length ? tags : undefined
  }

  return undefined
}

/**
 * Parses a raw value into a plain string array (without uppercasing).
 */
export function parseTextArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((item) => String(item || '').trim()).filter(Boolean)
  if (typeof raw === 'string') {
    const normalized = raw.trim()
    if (!normalized) return []
    if (normalized.startsWith('[') && normalized.endsWith(']')) {
      try {
        const parsed = JSON.parse(normalized)
        if (Array.isArray(parsed)) return parsed.map((item) => String(item || '').trim()).filter(Boolean)
      } catch {}
    }
    const cleaned = normalized.replace(/^\{|\}$/g, '')
    return cleaned
      .split(',')
      .map((item) => item.replace(/^"+|"+$/g, '').trim())
      .filter(Boolean)
  }
  return []
}
