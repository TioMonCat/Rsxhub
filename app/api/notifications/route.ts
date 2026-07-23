import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getUserNotifications } from '@/lib/notifications-data'

export async function GET() {
  try {
    const session = await getCurrentUser()
    if (!session?.userId) {
      return NextResponse.json({ notifications: [] })
    }

    const notifications = await getUserNotifications(session.userId)
    return NextResponse.json({ notifications })
  } catch (err) {
    console.error('Failed to get notifications:', err)
    return NextResponse.json({ notifications: [] })
  }
}
