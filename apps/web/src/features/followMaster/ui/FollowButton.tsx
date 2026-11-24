'use client'

import { Button } from '@awaisa/ui/Button'
import { useToast } from '@awaisa/ui/Toast'
import { Bell, BellRinging } from '@phosphor-icons/react/ssr'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { getErrorMessage } from '@/shared/api/apiError'
import { useT } from '@/shared/i18n'
import { haptic } from '@/shared/lib/nativeBridge'
import { GlyphButton } from '@/shared/ui/GlyphGroup/GlyphGroup'
import { useFollows } from '../model/useFollows'
import styles from './FollowButton.module.css'

interface FollowButtonProps {
  specialistId: string
  /** The master's first name, for the label and the toast. */
  name: string
  /** `glyph`: a round bell in a picture card's corner; `capsule`: a secondary capsule;
      `groupItem`: a thin bell inside a `GlyphGroup` (its label in the tooltip). */
  variant?: 'glyph' | 'capsule' | 'groupItem'
}

// «Следить»: freed time with the master, a move to another place. Guests sign in first and
// come back to the same page.
export const FollowButton = ({ specialistId, name, variant = 'capsule' }: FollowButtonProps) => {
  const t = useT()
  const toast = useToast()
  const router = useRouter()
  const pathname = usePathname()
  const follows = useFollows()
  const [isBusy, setIsBusy] = useState(false)
  const isOn = follows.isFollowing(specialistId)

  const handleClick = async (event: { preventDefault: () => void }) => {
    event.preventDefault()
    if (!follows.isSignedIn) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`)
      return
    }
    setIsBusy(true)
    try {
      if (isOn) {
        await follows.unfollow(specialistId)
      } else {
        await follows.follow(specialistId)
        haptic('success')
        toast.show({
          title: t('You follow {name}', { name }),
          description: t('We will write when the master has free time'),
          type: 'success',
        })
      }
    } catch (error) {
      toast.show({
        title: t('Something went wrong'),
        description: getErrorMessage(error),
        type: 'error',
      })
    } finally {
      setIsBusy(false)
    }
  }

  const label = isOn ? t('Unfollow {name}', { name }) : t('Follow {name}', { name })

  if (variant === 'groupItem') {
    return (
      <GlyphButton
        icon={isOn ? <BellRinging weight='fill' /> : <Bell />}
        label={label}
        aria-pressed={isOn}
        disabled={isBusy}
        onClick={(event) => void handleClick(event)}
      />
    )
  }

  if (variant === 'glyph') {
    return (
      <button
        type='button'
        className={styles.glyph}
        aria-pressed={isOn}
        aria-label={label}
        disabled={isBusy}
        onClick={(event) => void handleClick(event)}
      >
        {isOn ? <BellRinging weight='fill' aria-hidden /> : <Bell aria-hidden />}
      </button>
    )
  }

  return (
    <Button
      type='button'
      variant='secondary'
      size='sm'
      aria-pressed={isOn}
      disabled={isBusy}
      onClick={(event) => void handleClick(event)}
    >
      {isOn ? <BellRinging weight='fill' aria-hidden /> : <Bell aria-hidden />}
      {isOn ? t('Following') : t('Follow the master')}
    </Button>
  )
}
