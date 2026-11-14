'use client'

import { Button } from '@awaisa/ui/Button'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useSession } from '@/entities/session'
import { useMyProfile } from '../model/useMyProfile'
import { ProfileStyleSheet } from './ProfileStyleSheet/ProfileStyleSheet'

// «Оформление» on one's own page: the look is edited where it is seen, then the page redraws.
export const EditProfileButton = () => {
  const router = useRouter()
  const session = useSession()
  const myProfile = useMyProfile(session.status === 'signedIn')
  const [isOpen, setIsOpen] = useState(false)
  const customer = session.customer

  return (
    <>
      <Button
        variant='secondary'
        size='sm'
        onClick={() => setIsOpen(true)}
        disabled={!myProfile.settings}
      >
        Оформление
      </Button>
      {isOpen && myProfile.settings && customer && (
        <ProfileStyleSheet
          settings={myProfile.settings}
          profile={myProfile.profile}
          name={customer.name || 'Вы'}
          avatarUrl={customer.avatarUrl ?? null}
          onSave={async (input) => {
            await myProfile.save(input)
            router.refresh()
          }}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
