'use client'

import { CaretRight, Plus } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useEffect, useState } from 'react'
import {
  createPromotion,
  deletePromotion,
  getManagedPromotions,
  getPageStats,
  updatePromotion,
} from '@/shared/api/clientApi'
import type { PageStats, Promotion, PromotionInput, Service } from '@/shared/api/types'
import { pluralWord } from '@/shared/lib/plural'
import { describePromotion } from '@/shared/lib/promotionText'
import { PromotionSheet } from '@/views/manage/ui/PromotionsTab/PromotionSheet'
import styles from './PageTab.module.css'

interface PageInsightsProps {
  slug: string
  analyticsHref: string
  services: Service[]
  run: (action: () => Promise<unknown>, successTitle: string) => Promise<boolean>
  /** The day key (YYYY-MM-DD) to tell running promotions from ended ones; null before mount. */
  todayKey: string | null
}

const isRunning = (promotion: Promotion, todayKey: string | null) =>
  promotion.isActive &&
  (!todayKey || !promotion.endsOn || promotion.endsOn >= todayKey) &&
  (!todayKey || !promotion.startsOn || promotion.startsOn <= todayKey)

const promotionText = (promotion: Promotion) =>
  promotion.code
    ? `${describePromotion(promotion)} · ${promotion.code}`
    : describePromotion(promotion)

// Under the bio, like a professional account's insights and its highlights: one footnote line
// «За 7 дней: 18 записей · 120 просмотров ›» (to «Аналитика»), then the running promotions as the
// clients see them as capsules and «+ Акция»; each opens the promotion's sheet right here.
export const PageInsights = ({
  slug,
  analyticsHref,
  services,
  run,
  todayKey,
}: PageInsightsProps) => {
  const [stats, setStats] = useState<PageStats | null>(null)
  const [promotions, setPromotions] = useState<Promotion[]>([])
  // Promotions are changed in their sheet right here, never in another tab.
  const [editing, setEditing] = useState<Promotion | 'new' | null>(null)
  const running = promotions.filter((promotion) => isRunning(promotion, todayKey))

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      const [nextStats, nextPromotions] = await Promise.all([
        getPageStats(slug, controller.signal),
        getManagedPromotions(slug, controller.signal),
      ])
      setStats(nextStats)
      setPromotions(nextPromotions)
    }
    // Secondary facts: the page stands without them.
    load().catch(() => undefined)
    return () => controller.abort()
  }, [slug])

  const save = (input: PromotionInput) =>
    run(async () => {
      if (editing && editing !== 'new') await updatePromotion(slug, editing.id, input)
      else await createPromotion(slug, input)
      setPromotions(await getManagedPromotions(slug))
    }, 'Акция сохранена')

  const remove = (promotion: Promotion) =>
    void run(async () => {
      await deletePromotion(slug, promotion.id)
      setPromotions(await getManagedPromotions(slug))
    }, 'Акция удалена')

  const facts = stats
    ? [
        stats.bookings > 0 && {
          key: 'bookings',
          count: stats.bookings,
          words: pluralWord(stats.bookings, ['запись', 'записи', 'записей']),
        },
        stats.views > 0 && {
          key: 'views',
          count: stats.views,
          words: pluralWord(stats.views, ['просмотр', 'просмотра', 'просмотров']),
        },
      ].filter((fact) => fact !== false)
    : []

  return (
    <>
      {facts.length > 0 && (
        <NextLink href={analyticsHref} scroll={false} className={styles.insights}>
          <span>За {stats?.days} дней:</span>
          {facts.map((fact, index) => (
            <span key={fact.key}>
              {index > 0 && ' · '}
              <strong>{fact.count}</strong> {fact.words}
            </span>
          ))}
          <CaretRight weight='bold' aria-hidden />
        </NextLink>
      )}
      <ul className={styles.promotions} aria-label='Акции'>
        {running.map((promotion) => (
          <li key={promotion.id}>
            <button
              type='button'
              className={styles.promotion}
              onClick={() => setEditing(promotion)}
            >
              {promotionText(promotion)}
            </button>
          </li>
        ))}
        <li>
          <button
            type='button'
            className={styles.promotion}
            data-add
            onClick={() => setEditing('new')}
            aria-label='Новая акция'
          >
            <Plus weight='bold' aria-hidden />
            Акция
          </button>
        </li>
      </ul>
      {editing && (
        <PromotionSheet
          key={editing === 'new' ? 'new' : editing.id}
          promotion={editing === 'new' ? null : editing}
          services={services}
          onClose={() => setEditing(null)}
          onSave={save}
          onDelete={editing === 'new' ? undefined : () => remove(editing)}
        />
      )}
    </>
  )
}
