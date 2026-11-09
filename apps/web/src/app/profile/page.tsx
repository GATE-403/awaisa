import type { Metadata } from 'next'
import { ProfilePage } from '@/views/profile'

export const metadata: Metadata = {
  title: 'Профиль',
}

const ProfileRoute = () => <ProfilePage />

export default ProfileRoute
