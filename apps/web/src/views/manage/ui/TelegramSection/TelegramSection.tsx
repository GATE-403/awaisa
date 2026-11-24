'use client'

import { useToast } from '@awaisa/ui/Toast'
import { useEffect, useRef, useState } from 'react'
import { getErrorMessage } from '@/shared/api/apiError'
import { createTelegramLink, getTelegramStatus, removeTelegramChat } from '@/shared/api/clientApi'
import type { TelegramStatus } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { BUSINESS_TIME_ZONE } from '@/shared/lib/businessTime'
import { haptic } from '@/shared/lib/nativeBridge'
import { TelegramMark } from '@/shared/ui/BrandLogo/BrandLogo'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import forms from '@/views/manage/ui/manageForms.module.css'
import styles from './TelegramSection.module.css'

interface TelegramSectionProps {
  slug: string
  /** Shown once it is known that the platform has no bot configured. */
  fallback?: React.ReactNode
}

const POLL_MS = 3_000
const POLL_LIMIT = 40

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  timeZone: BUSINESS_TIME_ZONE,
})

// New bookings, cancellations, reviews and the morning schedule in the owner's Telegram.
// Linking is one tap: the bot opens with a one-time code, the cabinet notices the new chat.
export const TelegramSection = ({ slug, fallback = null }: TelegramSectionProps) => {
  const toast = useToast()
  const t = useT()
  const [status, setStatus] = useState<TelegramStatus | null>(null)
  const [isWaiting, setIsWaiting] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const pollRef = useRef<number | null>(null)

  // The one-time link is made ahead, so the tap is a plain link (no popup blocker, works in the app).
  const prepareLink = () =>
    createTelegramLink(slug)
      .then(({ url }) => setLink(url))
      .catch(() => setLink(null))

  // biome-ignore lint/correctness/useExhaustiveDependencies: prepareLink only reads the slug
  useEffect(() => {
    const controller = new AbortController()
    getTelegramStatus(slug, controller.signal)
      .then((next) => {
        setStatus(next)
        if (next.isAvailable) void prepareLink()
      })
      .catch(() => undefined)

    return () => {
      controller.abort()
      if (pollRef.current) window.clearInterval(pollRef.current)
    }
  }, [slug])

  if (!status) return null
  if (!status.isAvailable) return <>{fallback}</>

  const waitForChat = (known: number) => {
    let attempts = 0
    setIsWaiting(true)
    pollRef.current = window.setInterval(async () => {
      attempts += 1
      const next = await getTelegramStatus(slug).catch(() => null)
      if (next && next.chats.length > known) {
        setStatus(next)
        setIsWaiting(false)
        haptic('success')
        toast.show({ title: t('Telegram connected'), type: 'success' })
      }
      if ((next && next.chats.length > known) || attempts >= POLL_LIMIT) {
        if (pollRef.current) window.clearInterval(pollRef.current)
        setIsWaiting(false)
        // The code is single-use: have a fresh one ready for the next chat.
        void prepareLink()
      }
    }, POLL_MS)
  }

  const handleRemove = async (id: string) => {
    try {
      await removeTelegramChat(slug, id)
      setStatus({ ...status, chats: status.chats.filter((chat) => chat.id !== id) })
      toast.show({ title: t('Notifications turned off'), type: 'success' })
    } catch (error) {
      toast.show({
        title: t('Something went wrong'),
        description: getErrorMessage(error),
        type: 'error',
      })
    }
  }

  return (
    <div className={forms.group}>
      <SectionCaption>{t('Telegram notifications')}</SectionCaption>
      <div className={forms.list}>
        {status.chats.map((chat) => (
          <div key={chat.id} className={styles.row}>
            <span className={styles.icon} aria-hidden='true'>
              <TelegramMark />
            </span>
            <span className={styles.text}>
              <span className={styles.title}>
                {chat.username ? `@${chat.username}` : t('Telegram chat')}
              </span>
              <span className={styles.meta}>
                {t('Connected {date}', { date: dateFormatter.format(new Date(chat.createdAt)) })}
              </span>
            </span>
            <button type='button' className={styles.remove} onClick={() => handleRemove(chat.id)}>
              {t('Disconnect')}
            </button>
          </div>
        ))}
        {isWaiting || !link ? (
          <span className={styles.connect} data-waiting=''>
            {isWaiting
              ? t('Waiting for you to tap "Start" in Telegram…')
              : t('Preparing the link…')}
          </span>
        ) : (
          <a
            href={link}
            target='_blank'
            rel='noreferrer'
            className={styles.connect}
            onClick={() => waitForChat(status.chats.length)}
          >
            {status.chats.length > 0 ? t('Connect another chat') : t('Connect Telegram')}
          </a>
        )}
      </div>
      <p className={styles.footer}>
        {t(
          "New bookings, cancellations and reviews arrive at once, the day's schedule at 9:00. In the bot: /today (today's bookings), /stop (turn off).",
        )}
      </p>
    </div>
  )
}
