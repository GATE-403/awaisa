'use client'

import { Sliders, Sparkle } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { type ReactNode, useEffect, useId, useRef, useState } from 'react'
import { formatPrice, useStoredBookings } from '@/entities/booking'
import { BusinessTile, pickTint } from '@/entities/business'
import { useSession } from '@/entities/session'
import { getRecommendations } from '@/shared/api/clientApi'
import type { Recommendation } from '@/shared/api/types'
import { type Translate, useT } from '@/shared/i18n'
import { knownPosition } from '@/shared/lib/geo'
import { sizedImage } from '@/shared/lib/imageSizes'
import { StoryRow, StoryTile } from '@/shared/ui/StoryTile/StoryTile'
import { usePreferences } from '../lib/preferences'
import { deviceSession, readRecent, type Surface, track, trackPickClick } from '../lib/signals'
import styles from './ForYou.module.css'
import { ForYouShelfPlaceholder } from './ForYouShelfPlaceholder'
import { PreferencesSheet } from './PreferencesSheet'

// The capsule on a 144px card holds about 17 characters: past that only the reason's lead is
// shown («Ваш выбор · стрижки» → «Ваш выбор»), never a word cut by an ellipsis.
// Reasons with no « · » get a short form of their own: «Похоже на просмотренное» was cut to
// «Похоже на просмотре…».
const SHORT_LEADS: [RegExp, string][] = [
  [/^Похоже на просмотренное/, 'Similar'],
  [/^Как в ваших визитах/, 'As usual'],
  [/^Часто берут/, 'Often paired'],
]

const shortReason = (reason: string) => {
  if (reason.length <= 17) return reason
  const lead = reason.split(' · ')[0] ?? reason
  return SHORT_LEADS.find(([pattern]) => pattern.test(lead))?.[1] ?? lead
}

// Under a 76pt story tile there is room for about 12 characters: the reason in its shortest words.
const storyNote = (reason: string) => {
  const lead = reason.split(' · ')[0] ?? reason
  if (lead.startsWith('Popular')) return 'Popular'
  if (lead.startsWith('Часто берут')) return 'Often paired'
  // Reasons that ran past a story's width, said in a word or two («Похоже на прос…»).
  if (lead === 'Похоже на просмотренное') return 'Similar'
  if (lead === 'Как в ваших визитах') return 'As usual'
  if (lead === 'You have been here') return 'Been here'
  return lead.replace(/^(Сегодня|Завтра) с /, '$1 ').replace(/^Рейтинг /, '★ ')
}

// Reasons come from the API in Russian; the short ones the cards show are read here per language.
// Shortened first (above), so a card's length rules stay the Russian ones.
const REASON_PATTERNS: [RegExp, string, string][] = [
  [/^Пора снова · (\d+) нед\.$/, 'Due again · {weeks} wk', 'weeks'],
  [/^Рядом · ([\d,]+) км$/, 'Nearby · {km} km', 'km'],
  [/^Рядом · (\d+) м$/, 'Nearby · {meters} m', 'meters'],
  [/^Сегодня с (.+)$/, 'Today from {time}', 'time'],
  [/^Завтра с (.+)$/, 'Tomorrow from {time}', 'time'],
  [/^Сегодня (\d.*)$/, 'Today {time}', 'time'],
  [/^Завтра (\d.*)$/, 'Tomorrow {time}', 'time'],
  [/^Рейтинг (.+)$/, 'Rating {rating}', 'rating'],
]

const translateReason = (t: Translate, reason: string) => {
  for (const [pattern, key, name] of REASON_PATTERNS) {
    const match = reason.match(pattern)
    if (match) return t(key, { [name]: match[1] ?? '' })
  }
  return t(reason)
}

// What every event about a card carries: the answer it came from, so the list can be rebuilt.
const pickOf = (item: Recommendation) => ({
  serviceId: item.id,
  reason: item.reason,
  requestId: item.requestId,
  algorithm: item.algorithm,
})

// «Для вас»: services picked for this client - their answers, their visits («Пора снова»), where
// they are and who is free soon. Each card says why it is here.
// The reason the score gives a service due again (`recommend-score.ts`).
const DUE_REASON = 'Due again'

interface ForYouShelfProps {
  /** The shelf's heading. */
  title?: string
  /** A visit just booked (`serviceId~YYYY-MM-DD`): picks lean on it even before it is stored. */
  seedVisit?: string
  /** A service to leave out - the one just booked. */
  excludeServiceId?: string
  /** The service being chosen (the booking form): picks of the same kind come first. */
  likeServiceId?: string
  /** Picks for everyone (popular, near, free soon) even with nothing known; no questionnaire row. */
  isForEveryone?: boolean
  /** Inside a column (the success screen): the track keeps to it instead of bleeding to the edge. */
  isInline?: boolean
  /** «Настроить» beside the title - only in the profile, where the answers live. */
  isTunable?: boolean
  /** Where the shelf stands, for what it learns from taps (`catalog`, `booking`, …). */
  surface?: Surface
  /** A link on the right of the head (the catalog's «Рейтинг ›»), so it costs no row of its own. */
  headAction?: ReactNode
  /** `stories`: small square tiles like a stories row (the catalog's top); `cards` (default) the shelf. */
  variant?: 'cards' | 'stories'
  /** Only services due again («Пора снова»); with none the shelf is not drawn. */
  isOnlyDue?: boolean
}

export const ForYouShelf = ({
  title = 'For you',
  seedVisit,
  excludeServiceId,
  likeServiceId,
  isForEveryone = false,
  isInline = false,
  isTunable = false,
  surface = 'catalog',
  headAction,
  variant = 'cards',
  isOnlyDue = false,
}: ForYouShelfProps = {}) => {
  const t = useT()
  const trackRef = useRef<HTMLUListElement>(null)
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
          priority: preferences?.priorities?.join(',') || undefined,
          visits: visits || undefined,
          lat: point?.lat,
          lng: point?.lng,
          like: likeServiceId,
          recent: readRecent().join(',') || undefined,
          session: deviceSession() ?? undefined,
        },
        controller.signal,
      )
        .then((next) =>
          setItems(isOnlyDue ? next.filter((item) => item.reason.startsWith(DUE_REASON)) : next),
        )
        .catch(() => undefined),
    )
    return () => controller.abort()
  }, [isReady, hasSignals, preferences, visits, session.status, likeServiceId])

  const shownIds = items
    ?.filter((item) => item.id !== excludeServiceId)
    .map((item) => item.id)
    .join(',')

  // Shown = the shelf came into view: one impression per card per answer, like feeds count them.
  // biome-ignore lint/correctness/useExhaustiveDependencies: once per set of cards
  useEffect(() => {
    const element = trackRef.current
    if (!element || !items || !shownIds) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        observer.disconnect()
        track(
          items
            .filter((item) => item.id !== excludeServiceId)
            .map((item, position) => ({
              kind: 'impression' as const,
              ...pickOf(item),
              surface,
              position,
            })),
        )
      },
      { threshold: 0.5 },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [shownIds, surface])

  // The catalog's shelf is there for everyone: it holds its place while the picks load, so the
  // results under it do not jump down when they arrive.
  if (isForEveryone && (!isReady || items === null)) {
    return <ForYouShelfPlaceholder title={title} headAction={headAction} variant={variant} />
  }

  if (!isReady) return null

  const sheet = isAsking && (
    <PreferencesSheet initial={preferences} onClose={() => setIsAsking(false)} />
  )

  // Nothing is due without visits: no questionnaire row in place of «Пора снова».
  if (isOnlyDue && !hasSignals) return null

  // Nothing known yet: one quiet line instead of a shelf.
  if (!hasSignals) {
    return (
      <>
        <button type='button' className={styles.prompt} onClick={() => setIsAsking(true)}>
          <Sparkle aria-hidden className={styles.promptIcon} />
          <span className={styles.promptText}>
            <span className={styles.promptTitle}>{t('Picks for you')}</span>
            <span className={styles.promptMeta}>
              {t('3 questions, then services picked near you')}
            </span>
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
          {t(title)}
        </h2>
        {isTunable && (
          <button type='button' className={styles.tune} onClick={() => setIsAsking(true)}>
            <Sliders aria-hidden />
            {t('Adjust')}
          </button>
        )}
        {headAction}
      </div>
      {variant === 'stories' ? (
        <StoryRow ref={trackRef}>
          {shown.map((item, position) => (
            <StoryTile
              key={item.id}
              href={`/${item.slug}/book?service=${item.id}`}
              label={item.name}
              details={`${item.businessName}, ${formatPrice(item.price)}`}
              imageUrl={item.coverUrl}
              fallback={<BusinessTile name={item.businessName} logoUrl={item.logoUrl} size='lg' />}
              tint={pickTint(item.businessName)}
              note={translateReason(t, storyNote(item.reason))}
              isEager={position < 5}
              onOpen={() => trackPickClick({ ...pickOf(item), surface, position })}
            />
          ))}
        </StoryRow>
      ) : (
        <ul ref={trackRef} className={styles.track} data-edge-fade=''>
          {shown.map((item, position) => (
            <li key={item.id}>
              <NextLink
                href={`/${item.slug}/book?service=${item.id}`}
                className={styles.card}
                data-card=''
                data-picture-frame={item.coverUrl ? '' : undefined}
                onClick={() => trackPickClick({ ...pickOf(item), surface, position })}
              >
                {item.coverUrl && (
                  // biome-ignore lint/performance/noImgElement: sized CDN/WebP pictures
                  <img
                    {...sizedImage(item.coverUrl, 180)}
                    alt=''
                    className={styles.image}
                    data-card-media=''
                    // The first picks are the first thing a newcomer sees: no grey cards.
                    loading={position < 3 ? 'eager' : 'lazy'}
                    fetchPriority={position === 0 ? 'high' : undefined}
                    decoding='async'
                  />
                )}
                <span className={styles.reason}>
                  {translateReason(t, shortReason(item.reason))}
                </span>
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
      )}
      {sheet}
    </section>
  )
}
