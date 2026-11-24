'use client'

import { plural } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { CaretRight, Plus } from '@phosphor-icons/react/ssr'
import { useEffect, useState } from 'react'
import {
  createPromotion,
  deletePromotion,
  getManagedPromotions,
  getPageStats,
  updatePromotion,
} from '@/shared/api/clientApi'
import type { PageStats, Promotion, PromotionInput, Service } from '@/shared/api/types'
import { Link as NextLink } from '@/shared/i18n/navigation'
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

// The count is drawn bold on its own, so only the words after it are kept.
const wordsOf = (counted: string) => counted.replace(/^\S+\s/, '')

// Under the bio, like a professional account's insights and its highlights: one footnote line
// "Last 7 days: 18 bookings · 120 views ›" (to "Analytics"), then the running promotions as the
// clients see them as capsules and "+ Promotion"; each opens the promotion's sheet right here.
export const PageInsights = ({
  slug,
  analyticsHref,
  services,
  run,
  todayKey,
}: PageInsightsProps) => {
  const { t } = useLingui()
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
    }, t`Promotion saved`)

  const remove = (promotion: Promotion) =>
    void run(async () => {
      await deletePromotion(slug, promotion.id)
      setPromotions(await getManagedPromotions(slug))
    }, t`Promotion deleted`)

  const facts = stats
    ? [
        stats.bookings > 0 && {
          key: 'bookings',
          count: stats.bookings,
          words: wordsOf(t`${plural(stats.bookings, { one: '# booking', other: '# bookings' })}`),
        },
        stats.views > 0 && {
          key: 'views',
          count: stats.views,
          words: wordsOf(t`${plural(stats.views, { one: '# view', other: '# views' })}`),
        },
      ].filter((fact) => fact !== false)
    : []

  return (
    <>
      {facts.length > 0 && (
        <NextLink href={analyticsHref} scroll={false} className={styles.insights}>
          <span>{t`In ${plural(stats?.days ?? 0, { one: '# day', other: '# days' })}:`}</span>
          {facts.map((fact, index) => (
            <span key={fact.key}>
              {index > 0 && ' · '}
              <strong>{fact.count}</strong> {fact.words}
            </span>
          ))}
          <CaretRight aria-hidden />
        </NextLink>
      )}
      <ul className={styles.promotions} aria-label={t`Promotions`}>
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
            aria-label={t`New promotion`}
          >
            <Plus aria-hidden />
            {t`Promotion`}
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
