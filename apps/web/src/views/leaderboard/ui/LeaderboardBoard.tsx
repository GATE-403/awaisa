'use client'

import { Star } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { BusinessTile, PersonAvatar } from '@/entities/business'
import type { BusinessKind, LeaderboardMaster, LeaderboardPlace } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { TextTabs } from '@/shared/ui/TextTabs/TextTabs'
import { BOARDS, type BoardView, boardHref } from '../config/boards'
import styles from '../LeaderboardPage.module.css'
import { BoardViewSwitch } from './BoardViewSwitch'

const formatScore = (value: number) => value.toLocaleString('en-GB', { minimumFractionDigits: 1 })

type Entry = {
  key: string
  place: number
  href: string
  /** Said after the row to screen readers: what a tap does. */
  action?: string
  name: string
  subtitle: string
  average: number
  reviews: number
  face: React.ReactNode
}

const toMasterEntry = (master: LeaderboardMaster): Entry => ({
  key: master.id,
  place: master.place,
  href: `/${master.business.slug}/book?specialist=${master.id}`,
  action: 'Book',
  name: master.name,
  subtitle: master.business.name,
  average: master.average,
  reviews: master.reviews,
  face: <PersonAvatar name={master.name} src={master.photoUrl ?? undefined} size='md' />,
})

const toPlaceEntry = (place: LeaderboardPlace): Entry => ({
  key: place.slug,
  place: place.place,
  href: `/${place.slug}`,
  name: place.name,
  subtitle: place.address ?? '',
  average: place.average,
  reviews: place.reviews,
  face: (
    <BusinessTile
      name={place.name}
      // No logo yet: the place's cover in the circle reads better than a dark monogram.
      logoUrl={place.logoUrl ?? place.coverUrl}
      size='md'
    />
  ),
})

interface LeaderboardBoardProps {
  kind: BusinessKind
  view: BoardView
  masters: LeaderboardMaster[]
  places: LeaderboardPlace[]
}

export const LeaderboardBoard = ({ kind, view, masters, places }: LeaderboardBoardProps) => {
  const t = useT()
  const board = BOARDS.find((item) => item.kind === kind) ?? BOARDS[0]
  const isPlaces = view === 'places'
  const entries = isPlaces ? places.map(toPlaceEntry) : masters.map(toMasterEntry)

  return (
    <>
      <header className={styles.head}>
        <h1 className={styles.title}>{t((isPlaces ? board?.places : board?.masters) ?? '')}</h1>
        <p className={styles.lead}>{t('By client reviews on Awaisa')}</p>
      </header>

      <div className={styles.controls}>
        <BoardViewSwitch
          view={view}
          hrefs={{ masters: boardHref('masters', kind), places: boardHref('places', kind) }}
        />
        {/* Kinds as the app's text tabs: only the chosen one underlined. */}
        <div className={styles.kinds}>
          <TextTabs
            label={t('Type')}
            items={BOARDS.map((item) => ({
              label: t(item.tab),
              href: boardHref(view, item.kind),
              isActive: item.kind === kind,
            }))}
          />
        </div>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          variant='inline'
          text={t('Too few reviews for a rating yet. It will appear once there are more.')}
        />
      ) : (
        <>
          {/* One list from the first, every row the same; the top three's place is a gold /
                silver / bronze numeral. */}
          <ol className={styles.list}>
            {entries.map((entry) => (
              <li key={entry.key} data-place={entry.place <= 3 ? entry.place : undefined}>
                {/* No aria-label: the row's own words are its name (WCAG 2.5.3), the rest is
                      screen-reader text after them. */}
                <NextLink href={entry.href} className={styles.row}>
                  <span className={styles.place} data-place={entry.place}>
                    {/* The visible number stays hidden from screen readers, which read «place 1» instead:
                          a suffix glued after the number was read as a separate word. */}
                    <span aria-hidden>{entry.place}</span>
                    <span className={styles.srOnly}>
                      {t('place {place}', { place: entry.place })}
                    </span>
                  </span>
                  {entry.face}
                  <span className={styles.who}>
                    <span className={styles.name}>{entry.name}</span>
                    <span className={styles.where}>{entry.subtitle}</span>
                    {entry.action && <span className={styles.srOnly}>{t(entry.action)}</span>}
                  </span>
                  <span className={styles.rating}>
                    <span className={styles.ratingValue}>
                      <Star weight='fill' aria-hidden className={styles.star} />
                      {formatScore(entry.average)}
                    </span>
                    <span className={styles.muted}>
                      {t.count(entry.reviews, ['review', 'reviews'])}
                    </span>
                  </span>
                </NextLink>
              </li>
            ))}
          </ol>

          <p className={styles.footnote}>
            {t(
              'The place depends on ratings after visits: the average leans toward 4.3 while there are few reviews; a specialist needs at least three reviews, a place five. Updated every few minutes.',
            )}
          </p>
        </>
      )}
    </>
  )
}
