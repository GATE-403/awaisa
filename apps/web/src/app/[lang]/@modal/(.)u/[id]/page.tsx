import { Suspense } from 'react'
import { getProfileOnServer } from '@/shared/api/sessionApi'
import { initLingui } from '@/shared/i18n/server'
import { BookingLayer } from '@/views/booking'
import { ProfileSheet, ProfileSheetBody, ProfileSkeleton } from '@/views/publicProfile'

// Next 16 in dev can hand the intercepted segment over with its markers glued on ("(.)lom").
const toId = (param: string) => decodeURIComponent(param).replace(/^(\(\.{1,3}\))+/, '')

const ProfileOverPage = async ({ id }: { id: string }) => {
  const profile = await getProfileOnServer(id)
  if (!profile) return null
  return <ProfileSheetBody profile={profile} />
}

// A profile tapped inside the app opens over the page it was tapped on (an intercepted route),
// like a booking; a direct link or a reload opens the full `/u/<id>` page. `BookingLayer` keeps
// Next from scrolling the page under the sheet to its top.
const ProfileModal = async ({ params }: PageProps<'/[lang]/u/[id]'>) => {
  await initLingui()

  return (
    <BookingLayer>
      <Suspense fallback={null}>
        {params.then(({ id }) => (
          <ProfileSheet id={toId(id)}>
            <Suspense fallback={<ProfileSkeleton />}>
              <ProfileOverPage id={toId(id)} />
            </Suspense>
          </ProfileSheet>
        ))}
      </Suspense>
    </BookingLayer>
  )
}

export default ProfileModal
