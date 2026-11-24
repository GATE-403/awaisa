import { msg, plural } from '@lingui/core/macro'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getProfileOnServer } from '@/shared/api/sessionApi'
import { initLingui } from '@/shared/i18n/server'
import { ProfilePage, ProfileSkeleton } from '@/views/publicProfile'

export const generateMetadata = async ({
  params,
}: PageProps<'/[lang]/u/[id]'>): Promise<Metadata> => {
  const i18n = await initLingui()
  const profile = await getProfileOnServer((await params).id)
  if (!profile) return { title: i18n._(msg`Profile`), robots: { index: false } }
  const name = profile.name
  const level = profile.level.level
  const badges = profile.badges.length
  return {
    title: i18n._(msg`${name} - profile`),
    description: i18n._(
      msg`${name} on Awaisa: level ${level}, ${plural(badges, { one: '# badge', other: '# badges' })}`,
    ),
    robots: { index: false },
  }
}

// Read with the visitor's session (the owner sees their own hidden profile), so behind Suspense.
const ProfileWithData = async ({ id }: { id: string }) => {
  const profile = await getProfileOnServer(id)
  if (!profile) notFound()

  return <ProfilePage profile={profile} />
}

const ProfileRoute = async ({ params }: PageProps<'/[lang]/u/[id]'>) => {
  await initLingui()

  return (
    <Suspense fallback={<ProfileSkeleton />}>
      {params.then(({ id }) => (
        <ProfileWithData id={id} />
      ))}
    </Suspense>
  )
}

export default ProfileRoute
