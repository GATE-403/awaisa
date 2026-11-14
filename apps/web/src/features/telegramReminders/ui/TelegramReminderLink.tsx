'use client'

import { useEffect, useState } from 'react'
import { parseBookings, readRaw } from '@/entities/booking'
import { getTelegramLink } from '@/shared/api/clientApi'
import { useT } from '@/shared/i18n'
import styles from './TelegramReminderLink.module.css'

interface TelegramReminderLinkProps {
  bookingId: string
}

type Link = { url: string | null; isLinked: boolean }

// Reminders in Telegram instead of SMS: free for the salon, and the message carries a
// «Перенести или отменить» button. One quiet line; nothing when the bot is not set up.
export const TelegramReminderLink = ({ bookingId }: TelegramReminderLinkProps) => {
  const t = useT()
  const [link, setLink] = useState<Link | null>(null)

  useEffect(() => {
    const token = parseBookings(readRaw()).find((booking) => booking.id === bookingId)?.token
    getTelegramLink(bookingId, token ?? null)
      .then(setLink)
      .catch(() => setLink(null))
  }, [bookingId])

  if (!link?.url) return null
  if (link.isLinked) {
    return <p className={styles.line}>{t('Напомним в Telegram')}</p>
  }

  return (
    <a href={link.url} target='_blank' rel='noreferrer' className={styles.link}>
      {t('Напоминать в Telegram вместо SMS ›')}
    </a>
  )
}
