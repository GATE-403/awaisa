import { useToast } from '@awaisa/ui/Toast'
import type { Icon } from '@phosphor-icons/react'
import {
  ArrowUpRight,
  CaretRight,
  ChatCircle,
  CircleDashed,
  Copy,
  Receipt,
  TrendDown,
  TrendUp,
} from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import type { CSSProperties } from 'react'
import { addDayKey } from '@/entities/booking'
import { BusinessTile } from '@/entities/business'
import type { BusinessAttention, BusinessLink } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { useToday } from '@/shared/lib/hooks/useToday'
import { copyText } from '@/shared/lib/share'
import {
  type AttentionItem,
  attentionItems,
  rememberOpened,
  statusLine,
} from '@/views/manage/lib/businessList'
import styles from './BusinessPickerCard.module.css'

// The schedule's own mark for an unmarked visit, the reviews' bubble, the receipt.
const GLYPHS: Record<AttentionItem['key'], Icon> = {
  unmarkedVisits: CircleDashed,
  unansweredReviews: ChatCircle,
  failedReceipts: Receipt,
}

interface BusinessPickerCardProps {
  business: BusinessLink
  attention?: BusinessAttention
}

// One row per business right on the page, like Settings: the name, the next visit, a quiet line of
// what waits (each a link to its tab, only its glyph in orange), today's visits on the right when
// there are any. A quiet row still says where it stands («просто и нет динамики»): the step left
// before clients can book, else the week in figures with its direction, else a nudge to share.
// Only what is unusual is drawn: «Скрыта», never «Открыта»; no role or kind every row repeats.
export const BusinessPickerCard = ({ business, attention }: BusinessPickerCardProps) => {
  const t = useT()
  const today = useToday()
  const next = business.next
  const items = attentionItems(attention, t)
  const load = attention?.todayLoad ?? null
  const toast = useToast()
  // A row with nothing booked ahead and nothing waiting still says where it stands.
  const status = statusLine(attention, !next && items.length === 0, t, business.isPublished)

  const copyLink = async () => {
    const url = `${window.location.origin}/${business.slug}`
    const isCopied = await copyText(url)
    if (isCopied) toast.show({ title: t('Ссылка скопирована'), description: url, type: 'success' })
    else toast.show({ title: t('Не получилось скопировать'), description: url, type: 'error' })
  }
  const cabinet = `/manage/${business.slug}`
  const nextLabel = !next
    ? null
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
          {/* Stretched over the whole row: one tap anywhere opens the cabinet. */}
          <NextLink
            href={cabinet}
            className={styles.main}
            onClick={() => rememberOpened(business.slug)}
          >
            {business.name}
          </NextLink>
          {!business.isPublished && <span className={styles.hidden}>{t('Скрыта')}</span>}
        </span>
        {status?.kind === 'setup' && (
          // How far from taking bookings: three small segments and the step left, a link to it.
          <NextLink
            href={`${cabinet}?tab=${status.tab}`}
            className={styles.statusLink}
            onClick={() => rememberOpened(business.slug)}
          >
            <span className={styles.steps} aria-hidden='true'>
              {Array.from({ length: status.total }, (_, index) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed segments of a progress bar
                  key={index}
                  className={styles.stepSegment}
                  data-done={index < status.done || undefined}
                />
              ))}
            </span>
            {t('Запуск {done} из {total} · {step}', {
              done: status.done,
              total: status.total,
              step: status.text,
            })}
          </NextLink>
        )}
        {nextLabel && <span className={styles.next}>{nextLabel}</span>}
        {status?.kind === 'week' && (
          <span className={styles.next}>
            {t('За неделю:')} <strong>{status.views}</strong>{' '}
            {t.count(status.views, ['просмотр', 'просмотра', 'просмотров']).replace(/^\d+\s/, '')}
            {' · '}
            <strong>{status.bookings}</strong>{' '}
            {t.count(status.bookings, ['запись', 'записи', 'записей']).replace(/^\d+\s/, '')}
            {status.trend === 'up' && (
              <TrendUp className={styles.trendUp} aria-label={t('больше, чем неделей раньше')} />
            )}
            {status.trend === 'down' && (
              <TrendDown
                className={styles.trendDown}
                aria-label={t('меньше, чем неделей раньше')}
              />
            )}
          </span>
        )}
        {status?.kind === 'share' && (
          <span className={styles.share}>
            {t('Поделитесь ссылкой, и придут первые клиенты')}
            <button
              type='button'
              className={styles.copy}
              onClick={() => void copyLink()}
              aria-label={t('Скопировать ссылку на {name}', { name: business.name })}
              title={t('Скопировать ссылку')}
            >
              <Copy aria-hidden />
            </button>
          </span>
        )}
        {items.length > 0 && (
          <span className={styles.attention}>
            {items.map((item) => {
              const Glyph = GLYPHS[item.key]
              return (
                <NextLink
                  key={item.key}
                  href={`${cabinet}?tab=${item.tab}`}
                  className={styles.attentionLink}
                  onClick={() => rememberOpened(business.slug)}
                >
                  <Glyph className={styles.attentionGlyph} aria-hidden />
                  {item.text}
                </NextLink>
              )
            })}
          </span>
        )}
      </span>
      {business.todayCount > 0 && (
        <span className={styles.today}>
          <span className={styles.todayCount}>{business.todayCount}</span>
          <span className={styles.todayLabel}> {t('сегодня')}</span>
          {/* How full today is: booked time over the masters' open hours, like the day strip's
              bars in the schedule. */}
          {load !== null && (
            <span
              className={styles.load}
              role='img'
              aria-label={t('День занят на {percent}%', { percent: Math.round(load * 100) })}
              style={{ '--load': load } as CSSProperties}
            />
          )}
        </span>
      )}
      {/* The public page, only with a mouse: phones reach it from the cabinet's own bar. */}
      <NextLink
        href={`/${business.slug}`}
        className={styles.page}
        aria-label={t('Страница {name}', { name: business.name })}
        title={t('Открыть страницу')}
      >
        <ArrowUpRight aria-hidden />
      </NextLink>
      <CaretRight aria-hidden className={styles.chevron} />
    </article>
  )
}
