import { ButtonLink } from '@awaisa/ui/Button'
import { ArrowUpRight, CalendarDots } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import type { CSSProperties } from 'react'
import { addDayKey, formatDayLong } from '@/entities/booking'
import { BusinessTile, pickTint } from '@/entities/business'
import type { BusinessLink } from '@/shared/api/types'
import { getKindLabel } from '@/shared/config/platform'
import { useToday } from '@/shared/lib/hooks/useToday'
import { pluralize } from '@/shared/lib/plural'
import styles from './BusinessPickerCard.module.css'

interface BusinessPickerCardProps {
  business: BusinessLink
}

const ROLE_LABELS: Record<BusinessLink['role'], string> = {
  owner: 'Владелец',
  staff: 'Сотрудник',
  admin: 'Администратор платформы',
}

// One business, the way the Home app shows a home: picture, name, what is happening today.
export const BusinessPickerCard = ({ business }: BusinessPickerCardProps) => {
  const today = useToday()
  const next = business.next
  const nextLabel = !next
    ? 'Ближайших записей нет'
    : today && next.date === today.dayKey
      ? `Следующая сегодня в ${next.time}`
      : today && next.date === addDayKey(today.dayKey, 1)
        ? `Следующая завтра в ${next.time}`
        : `Следующая ${formatDayLong(next.date).toLowerCase()}, ${next.time}`

  return (
    <article className={styles.card} aria-label={business.name}>
      <NextLink
        href={`/manage/${business.slug}`}
        className={styles.media}
        style={{ '--tint': pickTint(business.name) } as CSSProperties}
        tabIndex={-1}
        aria-hidden='true'
      >
        {business.coverUrl ? (
          // biome-ignore lint/performance/noImgElement: already resized WebP from our API
          <img src={business.coverUrl} alt='' className={styles.cover} loading='lazy' />
        ) : (
          <BusinessTile name={business.name} size='lg' />
        )}
        <span className={styles.status} data-hidden={!business.isPublished || undefined}>
          {business.isPublished ? 'Открыта' : 'Скрыта'}
        </span>
      </NextLink>

      <div className={styles.body}>
        <p className={styles.eyebrow}>
          {[getKindLabel(business.kind), ROLE_LABELS[business.role]].filter(Boolean).join(' · ')}
        </p>
        <h2 className={styles.title}>
          <NextLink href={`/manage/${business.slug}`} className={styles.titleLink}>
            {business.name}
          </NextLink>
        </h2>
        <p className={styles.today}>
          <strong>
            {business.todayCount === 0
              ? 'Сегодня записей нет'
              : `Сегодня ${pluralize(business.todayCount, ['запись', 'записи', 'записей'])}`}
          </strong>
          <span>{nextLabel}</span>
        </p>
        <div className={styles.actions}>
          <ButtonLink
            size='sm'
            render={<NextLink href={`/manage/${business.slug}?tab=schedule`} />}
          >
            <CalendarDots weight='bold' aria-hidden />
            Расписание
          </ButtonLink>
          <ButtonLink
            size='sm'
            variant='secondary'
            render={<NextLink href={`/${business.slug}`} />}
          >
            Страница
            <ArrowUpRight weight='bold' aria-hidden />
          </ButtonLink>
        </div>
      </div>
    </article>
  )
}
