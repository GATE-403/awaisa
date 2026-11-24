'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import { Menu, MenuItem, MenuSubmenu } from '@awaisa/ui/Menu'
import { useToast } from '@awaisa/ui/Toast'
import { ChatCircle, DotsThree, Flag, Heart, ShareFat } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useState } from 'react'
import { useNextSlot } from '@/entities/booking'
import { ReportReasons, useReport } from '@/features/report'
import type { FeedItem } from '@/shared/api/types'
import { type Translate, useT } from '@/shared/i18n'
import { shareLink } from '@/shared/lib/share'
import styles from '../FeedPage.module.css'
import { WorkReviewsSheet } from './WorkReviewsSheet'

interface FeedActionsProps {
  item: FeedItem
  isLiked: boolean
  onLike: (isLiked: boolean) => void
  onReported: () => void
}

const ANY = 'any'

const compact = (t: Translate, count: number) =>
  count >= 1000
    ? t('{count} тыс.', { count: (count / 1000).toFixed(1).replace('.', ',').replace(',0', '') })
    : `${count}`

// Under the hand, for the card in play: «⋯» (reviews, share, report), the one wide «Записаться»
// with the first free time, and ♥ with its count.
export const FeedActions = ({ item, isLiked, onLike, onReported }: FeedActionsProps) => {
  const toast = useToast()
  const t = useT()
  const [isReviewsOpen, setIsReviewsOpen] = useState(false)
  // The cached feed may not include this device's like yet: count it once, on top. (Rendered
  // with the work's id as its key, so this is read once per work.)
  const [wasLiked] = useState(isLiked)
  const likes = (item.likes ?? 0) + (isLiked === wasLiked ? 0 : isLiked ? 1 : -1)
  const { business, service, specialist } = item
  const slot = useNextSlot(service?.id ?? null, { specialistId: specialist?.id ?? ANY })
  const bookParams = new URLSearchParams(
    service
      ? {
          service: service.id,
          specialist: specialist?.id ?? ANY,
          ...(slot ? { date: slot.date, time: slot.time } : {}),
        }
      : {},
  )
  const bookHref = service ? `/${business.slug}/book?${bookParams}` : `/${business.slug}`

  const share = async () => {
    const url = `${window.location.origin}/feed?start=${item.id}`
    const title = service ? `${service.name} — ${business.name}` : business.name
    // The share sheet was closed: nothing to do.
    const result = await shareLink({ title, url })
    if (result === 'copied') toast.show({ title: t('Ссылка скопирована'), type: 'success' })
  }

  const report = useReport('photo', item.id, onReported)

  return (
    <div className={styles.actions}>
      <Menu label={t('Ещё')} className={styles.roundButton} trigger={<DotsThree aria-hidden />}>
        {service && (
          <MenuItem icon={<ChatCircle aria-hidden />} onClick={() => setIsReviewsOpen(true)}>
            {`${t('Отзывы')}${item.reviewsCount ? ` · ${compact(t, item.reviewsCount)}` : ''}`}
          </MenuItem>
        )}
        <MenuItem icon={<ShareFat aria-hidden />} onClick={() => void share()}>
          {t('Поделиться')}
        </MenuItem>
        <MenuSubmenu label={t('Пожаловаться')} variant='danger' icon={<Flag aria-hidden />}>
          <ReportReasons onPick={(reason) => void report(reason)} />
        </MenuSubmenu>
      </Menu>
      <ButtonLink render={<NextLink href={bookHref} />} size='lg' className={styles.book}>
        {service ? t('Записаться') : t('Выбрать услугу')}
        {/* The second line is always there (its time arrives a moment later), so the button never
            jumps from one line to two when a card comes in. */}
        {service && (
          <span className={styles.slot}>
            <span className={styles.visuallyHidden}> · </span>
            {slot ? `${t(slot.dayLabel)} ${slot.time}` : '\u00a0'}
          </span>
        )}
      </ButtonLink>
      <button
        type='button'
        className={styles.roundButton}
        aria-pressed={isLiked}
        aria-label={t('Нравится: {count}', { count: likes })}
        data-liked={isLiked || undefined}
        onClick={() => onLike(!isLiked)}
      >
        <Heart weight={isLiked ? 'fill' : 'regular'} aria-hidden />
        {likes > 0 && (
          <span className={styles.count} aria-hidden>
            {compact(t, likes)}
          </span>
        )}
      </button>
      {isReviewsOpen && <WorkReviewsSheet item={item} onClose={() => setIsReviewsOpen(false)} />}
    </div>
  )
}
