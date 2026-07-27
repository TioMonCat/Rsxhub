import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getFirestoreDb, hasFirebase } from '@/lib/firebase'
import EditProfileForm from './edit-profile-form'
import { updateProfile } from '../actions'

export default async function EditarPerfilPage() {
  const session = await getCurrentUser()
  if (!session) redirect('/perfil')

  let profile = {
    displayName: session.steamDisplayName,
    countryCode: 'ES',
    bio: '',
    mainSim: 'ac' as 'ac' | 'lmu',
    preferredCategories: [] as string[],
  }

  const db = getFirestoreDb()
  if (hasFirebase && db) {
    const doc = await db.collection('profiles').doc(session.userId).get()
    if (doc.exists) {
      const data = doc.data()
      profile = {
        displayName: data?.display_name || session.steamDisplayName,
        countryCode: data?.country_code || 'ES',
        bio: data?.bio || '',
        mainSim: (data?.main_sim || 'ac') as 'ac' | 'lmu',
        preferredCategories: data?.preferred_categories || [],
      }
    }
  } else {
    try {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const mockProfile = cookieStore.get(`mock_profile_${session.userId}`)?.value || cookieStore.get('mock_profile')?.value
      if (mockProfile) {
        const parsed = JSON.parse(mockProfile)
        if (!parsed.user_id || parsed.user_id === session.userId) {
          profile = {
            displayName: parsed.display_name || session.steamDisplayName,
            countryCode: parsed.country_code || 'ES',
            bio: parsed.bio || '',
            mainSim: (parsed.main_sim || 'ac') as 'ac' | 'lmu',
            preferredCategories: parsed.preferred_categories || [],
          }
        }
      }
    } catch (e) {
      console.error('Failed to read mock_profile cookie:', e)
    }
  }

  return (
    <div className="shell-panel max-w-3xl p-5 md:p-6 rounded-none text-white">
      <h1 className="text-3xl font-bold text-white">Edit Profile</h1>
      <p className="mt-2 text-slate-400">Update your driver profile data.</p>
      <EditProfileForm profile={profile} updateAction={updateProfile} />
    </div>
  )
}
