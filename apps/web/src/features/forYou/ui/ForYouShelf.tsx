'use client'

import { Sliders, Sparkle } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useEffect, useId, useState } from 'react'
import { formatPrice, useStoredBookings } from '@/entities/booking'
import { useSession } from '@/entities/session'
import { getRecommendations } from '@/shared/api/clientApi'
import type { Recommendation } from '@/shared/api/types'
import { sizedImage } from '@/shared/lib/imageSizes'
import { usePreferences } from '../lib/preferences'
import styles from './ForYou.module.css'
import { PreferencesSheet } from './PreferencesSheet'

// Ask the browser for a position only when the visitor already allowed it: no prompt here.
const knownPosition = async () => {
  try {
    const permission = await navigator.permissions?.query({ name: 'geolocation' })
    if (permission?.state !== 'granted') return null
    return await new Promise<{ lat: number; lng: number } | null>((resolve) =>
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
        () => resolve(null),
        { maximumAge: 600_000, timeout: 4000 },
      ),
    )
  } catch {
    return null
  }
}

// «Для вас»: services picked for this client — their answers, their visits («Пора снова»), where
// they are and who is free soon. Each card says why it is here.
interface ForYouShelfProps {
  /** The shelf's heading. */
  title?: string
  /** A visit just booked (`serviceId~YYYY-MM-DD`): picks lean on it even before it is stored. */
  seedVisit?: string
  /** A service to leave out — the one just booked. */
  excludeServiceId?: string
  /** Picks for everyone (popular, near, free soon) even with nothing known; no questionnaire row. */
  isForEveryone?: boolean
  /** Inside a column (the success screen): the track keeps to it instead of bleeding to the edge. */
  isInline?: boolean
  /** «Настроить» beside the title — only in the profile, where the answers live. */
  isTunable?: boolean
}

export const ForYouShelf = ({
  title = 'Для вас',
  seedVisit,
  excludeServiceId,
  isForEveryone = false,
  isInline = false,
  isTunable = false,
}: ForYouShelfProps = {}) => {
  const preferences = usePreferences()
  const { bookings: stored, isReady } = useStoredBookings()
  const session = useSession()
  const [items, setItems] = useState<Recommendation[] | null>(null)
  const [isAsking, setIsAsking] = useState(false)
  const titleId = useId()
  const visits = stored
    .map(({ snapshot }) => snapshot)
    .filter((booking) => booking.status === 'confirmed')
    .map((booking) => `${booking.serviceId}~${booking.startsAt.slice(0, 10)}`)
    .concat(seedVisit ? [seedVisit] : [])
    .filter((visit, index, all) => all.indexOf(visit) === index)
    .join(',')
  const hasSignals =
    isForEveryone || preferences !== null || visits !== '' || session.status === 'signedIn'

  // biome-ignore lint/correctness/useExhaustiveDependencies: refetch when answers or visits change
  useEffect(() => {
    if (!isReady || !hasSignals) return
    const controller = new AbortController()
    void knownPosition().then((point) =>
      getRecommendations(
        {
          interests: preferences?.interests.join(',') || undefined,
          gender: preferences?.gender ?? undefined,
          budget: preferences?.budget ?? undefined,
          visits: visits || undefined,
          lat: point?.lat,
          lng: point?.lng,
        },
        controller.signal,
      )
        .then(setItems)
        .catch(() => undefined),
    )
    return () => controller.abort()
  }, [isReady, hasSignals, preferences, visits, session.status])

  if (!isReady) return null

  const sheet = isAsking && (
    <PreferencesSheet initial={preferences} onClose={() => setIsAsking(false)} />
  )

  // Nothing known yet: one quiet line instead of a shelf.
  if (!hasSignals) {
    return (
      <>
        <button type='button' className={styles.prompt} onClick={() => setIsAsking(true)}>
          <Sparkle weight='fill' aria-hidden className={styles.promptIcon} />
          <span className={styles.promptText}>
            <span className={styles.promptTitle}>Подберём для вас</span>
            <span className={styles.promptMeta}>3 вопроса — и подборка услуг рядом</span>
          </span>
        </button>
        {sheet}
      </>
    )
  }

  const shown = items?.filter((item) => item.id !== excludeServiceId) ?? []
  if (shown.length === 0) return sheet || null

  return (
    <section className={styles.shelf} data-inline={isInline || undefined} aria-labelledby={titleId}>
      <div className={styles.head}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {isTunable && (
          <button type='button' className={styles.tune} onClick={() => setIsAsking(true)}>
            <Sliders weight='bold' aria-hidden />
            Настроить
          </button>
        )}
      </div>
      <ul className={styles.track}>
        {shown.map((item) => (
          <li key={item.id}>
            <NextLink
              href={`/${item.slug}/book?service=${item.id}`}
              className={styles.card}
              aria-label={`${item.name}, ${item.businessName}, ${formatPrice(item.price)}. ${item.reason}`}
            >
              {item.coverUrl && (
                // biome-ignore lint/performance/noImgElement: sized CDN/WebP pictures
                <img
                  {...sizedImage(item.coverUrl, 180)}
                  alt=''
                  className={styles.image}
                  loading='lazy'
                  decoding='async'
                />
              )}
              <span className={styles.reason}>{item.reason}</span>
              <span className={styles.caption}>
                <span className={styles.name}>{item.name}</span>
                <span className={styles.meta}>
                  <strong>{formatPrice(item.price)}</strong> · {item.businessName}
                </span>
              </span>
            </NextLink>
          </li>
        ))}
      </ul>
      {sheet}
    </section>
  )
}
