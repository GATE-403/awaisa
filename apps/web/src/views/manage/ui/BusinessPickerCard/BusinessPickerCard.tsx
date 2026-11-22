import { ArrowUpRight, CaretRight } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { addDayKey } from '@/entities/booking'
import { BusinessTile } from '@/entities/business'
import type { BusinessLink } from '@/shared/api/types'
import { getKindLabel } from '@/shared/config/platform'
import { useT } from '@/shared/i18n'
import { useToday } from '@/shared/lib/hooks/useToday'
import styles from './BusinessPickerCard.module.css'

interface BusinessPickerCardProps {
  business: BusinessLink
}

const ROLE_LABELS: Record<BusinessLink['role'], string> = {
  owner: 'Владелец',
  staff: 'Сотрудник',
  admin: 'Админ платформы',
}

// One row per business, like Settings: a glance at today on the right, one tap opens the cabinet.
export const BusinessPickerCard = ({ business }: BusinessPickerCardProps) => {
  const t = useT()
  const today = useToday()
  const next = business.next
  const nextLabel = !next
    ? t('Записей впереди нет')
    : today && next.date === today.dayKey
      ? t('Дальше: сегодня в {time}', { time: next.time })
      : today && next.date === addDayKey(today.dayKey, 1)
        ? t('Дальше: завтра в {time}', { time: next.time })
        : t('Дальше: {day}, {time}', {
            // English keeps the weekday's capital letter.
            day: t.language === 'en' ? t.dayLong(next.date) : t.dayLong(next.date).toLowerCase(),
            time: next.time,
          })

  return (
    <article className={styles.row} aria-label={business.name}>
      <NextLink href={`/manage/${business.slug}`} className={styles.main}>
        <span className={styles.thumb}>
          {business.coverUrl ? (
            // biome-ignore lint/performance/noImgElement: already resized WebP from our API
            <img src={business.coverUrl} alt='' className={styles.cover} loading='lazy' />
          ) : (
            <BusinessTile name={business.name} logoUrl={business.logoUrl} size='md' />
          )}
        </span>
        <span className={styles.text}>
          <span className={styles.name}>
            <span className={styles.nameText}>{business.name}</span>
            <span className={styles.status} data-hidden={!business.isPublished || undefined}>
              <span className={styles.statusText}>
                {business.isPublished ? t('Открыта') : t('Скрыта')}
              </span>
            </span>
          </span>
          <span className={styles.meta}>
            {[t(getKindLabel(business.kind)), t(ROLE_LABELS[business.role])]
              .filter(Boolean)
              .join(' · ')}
          </span>
          <span className={styles.next}>{nextLabel}</span>
        </span>
        <span className={styles.today}>
          <span className={styles.todayCount}>{business.todayCount}</span>
          <span className={styles.todayLabel}> {t('сегодня')}</span>
        </span>
        <CaretRight weight='bold' aria-hidden className={styles.chevron} />
      </NextLink>
      <NextLink
        href={`/${business.slug}`}
        className={styles.page}
        aria-label={t('Страница {name}', { name: business.name })}
        title={t('Открыть страницу')}
      >
        <ArrowUpRight weight='bold' aria-hidden />
      </NextLink>
    </article>
  )
}
