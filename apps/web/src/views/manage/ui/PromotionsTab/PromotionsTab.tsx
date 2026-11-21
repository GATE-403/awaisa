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
  happy_hours: 'Скидка по часам',
  first_visit: 'Первый визит',
  promo_code: 'Промокод',
}

// «Акции»: discounts the business runs — by hours, for first visits, by promo code.
export const PromotionsTab = ({ slug, catalog }: PromotionsTabProps) => {
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
      toast.show({ title: 'Акция сохранена', type: 'success' })
      await load()
      void refreshBusiness(slug)
      return true
    } catch (error) {
      toast.show({ title: 'Не сохранилось', description: getErrorMessage(error), type: 'error' })
      return false
    }
  }

  const remove = async (promotion: Promotion) => {
    try {
      await deletePromotion(slug, promotion.id)
      toast.show({ title: 'Акция удалена', type: 'success' })
      await load()
      void refreshBusiness(slug)
    } catch (error) {
      toast.show({ title: 'Не получилось', description: getErrorMessage(error), type: 'error' })
    }
  }

  return (
    <section className={styles.section} aria-label='Акции'>
      <SectionHeader
        title='Акции'
        description='Скидки не суммируются — клиент получает самую большую.'
        isFloatingOnPhone
        actions={
          <Button size='sm' onClick={() => setEditing('new')}>
            <Plus weight='bold' aria-hidden />
            Новая акция
          </Button>
        }
      />

      {promotions?.length === 0 && (
        <EmptyState
          title='Запустите первую акцию'
          text='Заполните тихие часы скидкой, приведите новых клиентов или раздайте промокод.'
          action={<Button onClick={() => setEditing('new')}>Новая акция</Button>}
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
                    <Tag weight='fill' aria-hidden className={styles.star} />
                    {promotion.title}
                  </span>
                  <span className={styles.rowMeta}>
                    {[
                      !promotion.isActive && 'Выключена',
                      KIND_LABEL[promotion.kind],
                      promotion.kind === 'promo_code'
                        ? promotion.code
                        : describePromotion(promotion),
                      promotion.endsOn && `до ${promotion.endsOn.split('-').reverse().join('.')}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <span className={styles.cellValue}>−{promotion.percent}%</span>
                <CaretRight className={styles.chevron} weight='bold' aria-hidden />
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
