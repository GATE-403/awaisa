import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getProfileOnServer } from '@/shared/api/sessionApi'
import { PageSkeleton } from '@/shared/ui/PageSkeleton/PageSkeleton'
import { ProfilePage } from '@/views/publicProfile'

export const generateMetadata = async ({ params }: PageProps<'/u/[id]'>): Promise<Metadata> => {
  const profile = await getProfileOnServer((await params).id)
  if (!profile) return { title: 'Профиль', robots: { index: false } }
  return {
    title: `${profile.name} — профиль`,
    description: `${profile.name} в Awaisa: уровень ${profile.level.level}, ${profile.badges.length} значков`,
    robots: { index: false },
  }
}

// Read with the visitor's session (the owner sees their own hidden profile), so behind Suspense.
const ProfileWithData = async ({ id }: { id: string }) => {
  const profile = await getProfileOnServer(id)
  if (!profile) notFound()

  return <ProfilePage profile={profile} />
}

const ProfileRoute = ({ params }: PageProps<'/u/[id]'>) => (
  <Suspense fallback={<PageSkeleton />}>
    {params.then(({ id }) => (
      <ProfileWithData id={id} />
    ))}
  </Suspense>
)

export default ProfileRoute
