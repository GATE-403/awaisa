'use client'

import { useToast } from '@awaisa/ui/Toast'
import { LinkSimple } from '@phosphor-icons/react/ssr'
import { inviteUrl } from '@/features/invite'
import { useT } from '@/shared/i18n'
import { shareLink } from '@/shared/lib/share'
import { GlyphButton } from '@/shared/ui/GlyphGroup/GlyphGroup'

interface ShareProfileProps {
  name: string
  /** The handle when there is one, else the public id. */
  address: string
  /** Own profile: the link invites friends (it carries this client's ref). */
  isOwn: boolean
}

// The share sheet on phones, the link copied elsewhere. On one's own profile it is an invitation:
// a friend who books through it counts toward «Привёл друга».
export const ShareProfile = ({ name, address, isOwn }: ShareProfileProps) => {
  const t = useT()
  const toast = useToast()

  const share = async () => {
    const url = isOwn ? inviteUrl(address) : `${window.location.origin}/u/${address}`
    const text = isOwn
      ? t('Book specialists through Awaisa, here is my profile')
      : t('{name} on Awaisa', { name })
    const result = await shareLink({ title: text, text, url, isTouchOnly: true })
    if (result === 'copied') {
      toast.show({
        title: isOwn ? t('Invite link copied') : t('Profile link copied'),
        type: 'success',
      })
    }
    if (result === 'failed') toast.show({ title: t('Could not share'), type: 'error' })
  }

  return (
    <GlyphButton
      // What it gives is a link (an invitation on one's own profile).
      icon={<LinkSimple aria-hidden />}
      label={isOwn ? t('Invite') : t('Share')}
      onClick={share}
    />
  )
}
