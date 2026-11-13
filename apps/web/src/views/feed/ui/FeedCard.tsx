'use client'

import { Avatar } from '@awaisa/ui/Avatar'
import { ButtonLink } from '@awaisa/ui/Button'
import { Menu, MenuItem } from '@awaisa/ui/Menu'
import { useToast } from '@awaisa/ui/Toast'
import { DotsThree, Flag, ShareFat } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useState } from 'react'
import { formatDuration, formatPrice, useNextSlot } from '@/entities/booking'
import { BusinessTile } from '@/entities/business'
import { reportFeedItem } from '@/shared/api/clientApi'
import type { FeedItem } from '@/shared/api/types'
import styles from '../FeedPage.module.css'

interface FeedCardProps {
  item: FeedItem
  index: number
  /** Fills the screen: the photo drifts and the free time is looked up. */
  isActive: boolean
  /** The active card or a neighbour: its photo loads eagerly. */
  isNear: boolean
}

const ANY = 'any'

export const FeedCard = ({ item, index, isActive, isNear }: FeedCardProps) => {
  const toast = useToast()
  const [isReported, setIsReported] = useState(false)
  const { business, service, specialist } = item
  const slot = useNextSlot(service?.id ?? null, {
    specialistId: specialist?.id ?? ANY,
    isEnabled: isNear,
  })
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
    try {
      if (navigator.share) {
        await navigator.share({ title, url })
        return
      }
      await navigator.clipboard.writeText(url)
      toast.show({ title: 'Ссылка скопирована', type: 'success' })
    } catch {
      // The share sheet was closed: nothing to do.
    }
  }

  const report = async () => {
    setIsReported(true)
    await reportFeedItem(item.id).catch(() => undefined)
    toast.show({ title: 'Спасибо, проверим фото', type: 'info' })
  }

  return (
    <article
      className={styles.card}
      data-index={index}
      data-active={isActive || undefined}
      aria-posinset={index + 1}
      aria-setsize={-1}
      aria-label={service ? `${service.name}, ${business.name}` : business.name}
    >
      <div className={styles.media}>
        {/* biome-ignore lint/performance/noImgElement: already resized WebP from our API */}
        <img
          src={item.url}
          alt={service ? `Работа: ${service.name}` : `Работа в ${business.name}`}
          className={styles.photo}
          loading={isNear ? 'eager' : 'lazy'}
          decoding='async'
          data-reported={isReported || undefined}
        />
      </div>

      <div className={styles.side}>
        <button type='button' className={styles.sideButton} onClick={() => void share()}>
          <ShareFat weight='fill' aria-hidden />
          <span>Поделиться</span>
        </button>
        <Menu
          label='Ещё'
          className={styles.sideButton}
          trigger={
            <>
              <DotsThree weight='bold' aria-hidden />
              <span aria-hidden>Ещё</span>
            </>
          }
        >
          <MenuItem
            variant='danger'
            icon={<Flag weight='bold' aria-hidden />}
            disabled={isReported}
            onClick={() => void report()}
          >
            Пожаловаться
          </MenuItem>
        </Menu>
      </div>

      <div className={styles.info}>
        <NextLink href={`/${business.slug}`} className={styles.place}>
          <BusinessTile name={business.name} size='xs' />
          <span className={styles.placeName}>{business.name}</span>
          {item.distanceKm !== null && (
            <span className={styles.placeMeta}>
              {item.distanceKm < 1
                ? `${Math.round(item.distanceKm * 1000)} м`
                : `${item.distanceKm} км`}
            </span>
          )}
        </NextLink>
        {service && (
          <>
            <h2 className={styles.service}>{service.name}</h2>
            <p className={styles.meta}>
              <strong>{formatPrice(service.price)}</strong> ·{' '}
              {formatDuration(service.durationMinutes)}
              {specialist && (
                <>
                  {' · '}
                  <span className={styles.master}>
                    <Avatar
                      name={specialist.name}
                      src={specialist.photoUrl ?? undefined}
                      size='sm'
                    />
                    {specialist.name}
                  </span>
                </>
              )}
            </p>
          </>
        )}
        <div className={styles.cta}>
          <ButtonLink render={<NextLink href={bookHref} />} size='lg' className={styles.book}>
            {service ? 'Записаться' : 'Выбрать услугу'}
          </ButtonLink>
          {service && slot && (
            <span className={styles.slot}>
              {slot.dayLabel} с {slot.time}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
