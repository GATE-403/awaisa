'use client'

import { Button } from '@awaisa/ui/Button'
import { useToast } from '@awaisa/ui/Toast'
import { CaretRight, Plus, Tag } from '@phosphor-icons/react/ssr'
import { useEffect, useState } from 'react'
import { getErrorMessage } from '@/shared/api/apiError'
import {
  createPromotion,
  deletePromotion,
  getManagedPromotions,
  updatePromotion,
} from '@/shared/api/clientApi'
import { refreshBusiness } from '@/shared/api/revalidate'
import type { Catalog, Promotion, PromotionInput } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { describePromotion } from '@/shared/lib/promotionText'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import styles from '@/views/manage/ui/manageForms.module.css'
import { SectionHeader } from '@/views/manage/ui/SectionHeader/SectionHeader'
import { PromotionSheet } from './PromotionSheet'

interface PromotionsTabProps {
  slug: string
  catalog: Catalog
}

const KIND_LABEL: Record<Promotion['kind'], string> = {
  happy_hours: 'Happy hours',
  first_visit: 'First visit',
  promo_code: 'Promo code',
}

// "Promotions": discounts the business runs - by hours, for first visits, by promo code.
export const PromotionsTab = ({ slug, catalog }: PromotionsTabProps) => {
  const t = useT()
  const toast = useToast()
  const [promotions, setPromotions] = useState<Promotion[] | null>(null)
  const [editing, setEditing] = useState<Promotion | 'new' | null>(null)

  const load = () =>
    getManagedPromotions(slug)
      .then(setPromotions)
      .catch(() => setPromotions([]))

  // biome-ignore lint/correctness/useExhaustiveDependencies: load once per business
  useEffect(() => {
    void load()
  }, [slug])

  const save = async (input: PromotionInput) => {
    try {
      if (editing && editing !== 'new') await updatePromotion(slug, editing.id, input)
      else await createPromotion(slug, input)
      toast.show({ title: t('Promotion saved'), type: 'success' })
      await load()
      void refreshBusiness(slug)
      return true
    } catch (error) {
      toast.show({ title: t('Not saved'), description: getErrorMessage(error), type: 'error' })
      return false
    }
  }

  const remove = async (promotion: Promotion) => {
    try {
      await deletePromotion(slug, promotion.id)
      toast.show({ title: t('Promotion deleted'), type: 'success' })
      await load()
      void refreshBusiness(slug)
    } catch (error) {
      toast.show({
        title: t('Something went wrong'),
        description: getErrorMessage(error),
        type: 'error',
      })
    }
  }

  return (
    <section className={styles.section} aria-label={t('Promotions')}>
      <SectionHeader
        title={t('Promotions')}
        description={t('Discounts don’t add up: the client gets the biggest one.')}
        isFloatingOnPhone
        actions={
          <Button size='sm' onClick={() => setEditing('new')}>
            <Plus aria-hidden />
            {t('New promotion')}
          </Button>
        }
      />

      {promotions?.length === 0 && (
        <EmptyState
          title={t('Launch your first promotion')}
          text={t(
            'Fill quiet hours with a discount, bring in new clients or hand out a promo code.',
          )}
          action={<Button onClick={() => setEditing('new')}>{t('New promotion')}</Button>}
        />
      )}

      {promotions && promotions.length > 0 && (
        <ul className={styles.list}>
          {promotions.map((promotion) => (
            <li key={promotion.id}>
              <button
                type='button'
                className={styles.serviceRow}
                data-hidden={!promotion.isActive || undefined}
                onClick={() => setEditing(promotion)}
              >
                <span className={styles.rowBody}>
                  <span className={styles.rowTitle}>
                    <Tag aria-hidden className={styles.star} />
                    {promotion.title}
                  </span>
                  <span className={styles.rowMeta}>
                    {[
                      !promotion.isActive && t('Off'),
                      t(KIND_LABEL[promotion.kind]),
                      promotion.kind === 'promo_code'
                        ? promotion.code
                        : describePromotion(promotion),
                      promotion.endsOn &&
                        t('until {date}', {
                          date: promotion.endsOn.split('-').reverse().join('.'),
                        }),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <span className={styles.cellValue}>−{promotion.percent}%</span>
                <CaretRight className={styles.chevron} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <PromotionSheet
          key={editing === 'new' ? 'new' : editing.id}
          promotion={editing === 'new' ? null : editing}
          services={catalog.services}
          onClose={() => setEditing(null)}
          onSave={save}
          onDelete={editing === 'new' ? undefined : () => remove(editing)}
        />
      )}
    </section>
  )
}
