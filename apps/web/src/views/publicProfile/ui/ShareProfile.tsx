'use client'

import { useToast } from '@awaisa/ui/Toast'
import { LinkSimple } from '@phosphor-icons/react/ssr'
import { inviteUrl } from '@/features/invite'
import { useT } from '@/shared/i18n'
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
      ? t('Записывайся к мастерам через Awaisa — вот мой профиль')
      : t('{name} в Awaisa', { name })
    try {
      if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title: text, text, url })
        return
      }
      await navigator.clipboard.writeText(url)
      toast.show({
        title: isOwn ? t('Ссылка-приглашение скопирована') : t('Ссылка на профиль скопирована'),
        type: 'success',
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      toast.show({ title: t('Не получилось поделиться'), type: 'error' })
    }
  }

  return (
    <GlyphButton
      // What it gives is a link (an invitation on one's own profile).
      icon={<LinkSimple aria-hidden />}
      label={isOwn ? t('Пригласить') : t('Поделиться')}
      onClick={share}
    />
  )
}
