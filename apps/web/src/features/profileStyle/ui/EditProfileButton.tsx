'use client'

import { PencilSimple } from '@phosphor-icons/react/ssr'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useSession } from '@/entities/session'
import { useT } from '@/shared/i18n'
import { GlyphButton } from '@/shared/ui/GlyphGroup/GlyphGroup'
import { useProfileEditorHost } from '../model/profileEditorHost'
import { useMyProfile } from '../model/useMyProfile'
import { ProfileStyleSheet } from './ProfileStyleSheet/ProfileStyleSheet'

// «Appearance» on one's own page: the look is edited where it is seen, then the page redraws.
export const EditProfileButton = () => {
  const t = useT()
  const router = useRouter()
  const session = useSession()
  const myProfile = useMyProfile(session.status === 'signedIn')
  const [isOpen, setIsOpen] = useState(false)
  const host = useProfileEditorHost()
  const customer = session.customer

  return (
    <>
      <GlyphButton
        icon={<PencilSimple aria-hidden />}
        label={t('Change')}
        onClick={() => (host ? host.open() : setIsOpen(true))}
        disabled={!myProfile.settings}
      />
      {isOpen && myProfile.settings && customer && (
        <ProfileStyleSheet
          settings={myProfile.settings}
          profile={myProfile.profile}
          name={customer.name || t('You')}
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
