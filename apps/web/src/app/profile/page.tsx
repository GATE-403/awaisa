import type { Metadata } from 'next'
import { ProfilePage } from '@/features/profile/ProfilePage'

export const metadata: Metadata = {
  title: 'Профиль',
}

const ProfileRoute = () => <ProfilePage />

export default ProfileRoute
