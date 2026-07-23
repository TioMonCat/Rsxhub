import { cache } from 'react'
import { getFirestoreDb, hasFirebase } from '@/lib/firebase'

export interface UserNotification {
  id: string
  userId: string
  title: string
  message: string
  read: boolean
  createdAt: string
  link?: string | null
}

export const getUserNotifications = cache(async (userId: string): Promise<UserNotification[]> => {
  if (!userId) return []

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        const snap = await db
          .collection('user_notifications')
          .where('user_id', '==', userId)
          .limit(25)
          .get()

        if (!snap.empty) {
          const list = snap.docs.map((doc: any) => {
            const data = doc.data()
            let createdIso = new Date().toISOString()
            if (data.created_at) {
              if (typeof data.created_at.toDate === 'function') {
                createdIso = data.created_at.toDate().toISOString()
              } else {
                createdIso = new Date(data.created_at).toISOString()
              }
            }

            return {
              id: doc.id,
              userId: data.user_id || '',
              title: data.title || '',
              message: data.message || '',
              read: Boolean(data.read),
              createdAt: createdIso,
              link: data.link || null,
            }
          })
          return list.sort((a: UserNotification, b: UserNotification) => b.createdAt.localeCompare(a.createdAt))
        }
      } catch (err) {
        console.error('Failed to fetch user notifications from Firestore:', err)
      }
    }
  }

  // Fallback to Mock Cookie mode
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const cookieVal = cookieStore.get(`mock_notifications_${userId}`)?.value || cookieStore.get('mock_notifications')?.value
    if (cookieVal) {
      const list: UserNotification[] = JSON.parse(cookieVal)
      return list.filter((n) => n.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    }
  } catch (e) {}

  return []
})

export async function createNotification({
  userId,
  title,
  message,
  link,
}: {
  userId: string
  title: string
  message: string
  link?: string
}) {
  if (!userId) return

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        await db.collection('user_notifications').add({
          user_id: userId,
          title,
          message,
          read: false,
          created_at: new Date(),
          link: link || null,
        })
      } catch (err) {
        console.error('Failed to create notification in Firestore:', err)
      }
    }
  }

  // Fallback / Dual write mock cookies
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const key = `mock_notifications_${userId}`
    const existing = cookieStore.get(key)?.value
    let current: UserNotification[] = existing ? JSON.parse(existing) : []
    current.unshift({
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId,
      title,
      message,
      read: false,
      createdAt: new Date().toISOString(),
      link: link || null,
    })
    cookieStore.set(key, JSON.stringify(current.slice(0, 30)), { path: '/', maxAge: 60 * 60 * 24 * 30 })
  } catch (e) {
    console.error('Failed to save mock notification cookie:', e)
  }
}
