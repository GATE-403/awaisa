import { Star } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { BusinessTile, PersonAvatar } from '@/entities/business'
import type { BusinessKind, LeaderboardMaster, LeaderboardPlace } from '@/shared/api/types'
import { pluralize } from '@/shared/lib/plural'
import { Breadcrumbs } from '@/shared/ui/Breadcrumbs/Breadcrumbs'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { TextTabs } from '@/shared/ui/TextTabs/TextTabs'
import styles from './LeaderboardPage.module.css'
import { BoardViewSwitch } from './ui/BoardViewSwitch'

// What each board is called, in the order of the tabs.
const BOARDS: { kind: BusinessKind; tab: string; masters: string; places: string }[] = [
  { kind: 'barber', tab: 'Барберы', masters: 'Лучшие барберы', places: 'Лучшие барбершопы' },
  { kind: 'beauty', tab: 'Стилисты', masters: 'Лучшие стилисты', places: 'Лучшие салоны' },
  {
    kind: 'nails',
    tab: 'Ногти',
    masters: 'Лучшие мастера маникюра',
    places: 'Лучшие ногтевые студии',
  },
  { kind: 'spa', tab: 'Массаж', masters: 'Лучшие массажисты', places: 'Лучшие SPA' },
  { kind: 'health', tab: 'Здоровье', masters: 'Лучшие специалисты', places: 'Лучшие клиники' },
  { kind: 'other', tab: 'Тату', masters: 'Лучшие тату-мастера', places: 'Лучшие тату-студии' },
]

type View = 'masters' | 'places'

const hrefOf = (view: View, kind: BusinessKind) => {
  const params = new URLSearchParams()
  if (view === 'places') params.set('view', 'places')
  if (kind !== 'barber') params.set('kind', kind)
  const query = params.toString()
  return query ? `/top?${query}` : '/top'
}

const formatScore = (value: number) => value.toLocaleString('ru-RU', { minimumFractionDigits: 1 })

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
  action: 'Записаться',
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

interface LeaderboardPageProps {
  kind: BusinessKind
  view: View
  masters: LeaderboardMaster[]
  places: LeaderboardPlace[]
}

// The leaderboard in the app's quiet style: masters or places of one kind in one thread of rows,
// every row the same, the top three told by the colour of their place.
// Ranked by reviews, the average pulled toward 4.3 until there are enough of them.
export const LeaderboardPage = ({ kind, view, masters, places }: LeaderboardPageProps) => {
  const board = BOARDS.find((item) => item.kind === kind) ?? BOARDS[0]
  const isPlaces = view === 'places'
  const entries = isPlaces ? places.map(toPlaceEntry) : masters.map(toMasterEntry)

  return (
    <main className={styles.page}>
      <div className={styles.column}>
        <Breadcrumbs
          align='center'
          className={styles.crumbs}
          items={[
            { label: 'Каталог', href: '/' },
            { label: 'Рейтинг', href: `/top?kind=${kind}${isPlaces ? '&view=places' : ''}` },
          ]}
        />
        <header className={styles.head}>
          <h1 className={styles.title}>{isPlaces ? board?.places : board?.masters}</h1>
          <p className={styles.lead}>По отзывам клиентов в Awaisa</p>
        </header>

        <div className={styles.controls}>
          <BoardViewSwitch
            view={view}
            hrefs={{ masters: hrefOf('masters', kind), places: hrefOf('places', kind) }}
          />
          {/* Kinds as the app's text tabs: only the chosen one underlined. */}
          <div className={styles.kinds}>
            <TextTabs
              label='Вид'
              items={BOARDS.map((item) => ({
                label: item.tab,
                href: hrefOf(view, item.kind),
                isActive: item.kind === kind,
              }))}
            />
          </div>
        </div>

        {entries.length === 0 ? (
          <EmptyState
            variant='inline'
            text='Пока мало отзывов, чтобы составить рейтинг. Он появится, когда оценок станет больше.'
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
                      {/* Read as one word «1-е место»: a hidden «-е место» after the visible
                          number was read as «1 -е место». */}
                      <span aria-hidden>{entry.place}</span>
                      <span className={styles.srOnly}>{entry.place}-е место</span>
                    </span>
                    {entry.face}
                    <span className={styles.who}>
                      <span className={styles.name}>{entry.name}</span>
                      <span className={styles.where}>{entry.subtitle}</span>
                      {entry.action && <span className={styles.srOnly}>{entry.action}</span>}
                    </span>
                    <span className={styles.rating}>
                      <span className={styles.ratingValue}>
                        <Star weight='fill' aria-hidden className={styles.star} />
                        {formatScore(entry.average)}
                      </span>
                      <span className={styles.muted}>
                        {pluralize(entry.reviews, ['отзыв', 'отзыва', 'отзывов'])}
                      </span>
                    </span>
                  </NextLink>
                </li>
              ))}
            </ol>

            <p className={styles.footnote}>
              Место зависит от оценок после визитов: средняя подтягивается к 4,3, пока отзывов мало;
              мастеру нужно хотя бы три отзыва, месту — пять. Обновляется каждые несколько минут.
            </p>
          </>
        )}
      </div>
    </main>
  )
}
