'use client'

import { Button } from '@awaisa/ui/Button'
import { useToast } from '@awaisa/ui/Toast'
import { ShareNetwork, UserPlus } from '@phosphor-icons/react/ssr'
import { inviteUrl } from '@/features/invite'

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
  const toast = useToast()

  const share = async () => {
    const url = isOwn ? inviteUrl(address) : `${window.location.origin}/u/${address}`
    const text = isOwn
      ? 'Записывайся к мастерам через Awaisa — вот мой профиль'
      : `${name} в Awaisa`
    try {
      if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title: text, text, url })
        return
      }
      await navigator.clipboard.writeText(url)
      toast.show({
        title: isOwn ? 'Ссылка-приглашение скопирована' : 'Ссылка на профиль скопирована',
        type: 'success',
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      toast.show({ title: 'Не получилось поделиться', type: 'error' })
    }
  }

  return (
    <Button variant='secondary' size='sm' onClick={share}>
      {isOwn ? <UserPlus weight='bold' aria-hidden /> : <ShareNetwork weight='bold' aria-hidden />}
      {isOwn ? 'Пригласить' : 'Поделиться'}
    </Button>
  )
}
