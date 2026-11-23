'use client'

import { Button } from '@awaisa/ui/Button'
import { useToast } from '@awaisa/ui/Toast'
import { CaretRight, Plus } from '@phosphor-icons/react/ssr'
import { useEffect, useState } from 'react'
import { formatPrice } from '@/entities/booking'
import { getErrorMessage } from '@/shared/api/apiError'
import {
  adjustStock,
  deleteStockItem,
  getStock,
  receiveStock,
  saveStockItem,
} from '@/shared/api/clientApi'
import type { Catalog, StockItem } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { RowNote } from '@/shared/ui/RowNote/RowNote'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import styles from '@/views/manage/ui/manageForms.module.css'
import { SectionHeader } from '@/views/manage/ui/SectionHeader/SectionHeader'
import { formatQuantity } from './formatQuantity'
import { StockItemSheet } from './StockItemSheet'

interface StockTabProps {
  slug: string
  catalog: Catalog
}

// «Склад»: consumables with what one visit of each service uses. A visit marked «Пришёл»
// writes its materials off; analytics subtracts their cost from revenue.
export const StockTab = ({ slug, catalog }: StockTabProps) => {
  const toast = useToast()
  const t = useT()
  const [items, setItems] = useState<StockItem[] | null>(null)
  const [editing, setEditing] = useState<StockItem | 'new' | null>(null)
  const low = items?.filter((item) => item.isLow) ?? []
  const value = items?.reduce((sum, item) => sum + Math.max(item.quantity, 0) * item.unitCost, 0)

  useEffect(() => {
    const controller = new AbortController()
    getStock(slug, controller.signal)
      .then(setItems)
      .catch(() => undefined)
    return () => controller.abort()
  }, [slug])

  const run = async (action: () => Promise<unknown>, title: string, description?: string) => {
    try {
      const next = await action()
      setItems(Array.isArray(next) ? next : await getStock(slug))
      toast.show({ title, description, type: 'success' })
      return true
    } catch (error) {
      toast.show({ title: t('Не сохранилось'), description: getErrorMessage(error), type: 'error' })
      return false
    }
  }

  if (!items) return null

  const current = editing && editing !== 'new' ? items.find((item) => item.id === editing.id) : null

  return (
    <section className={styles.section} aria-label={t('Склад')}>
      <SectionHeader
        title={t('Склад')}
        description={t('Расходники списываются, когда визит отмечен «Пришёл», товары при продаже.')}
        isFloatingOnPhone
        actions={
          <Button size='sm' onClick={() => setEditing('new')}>
            <Plus aria-hidden />
            {t('Позиция')}
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          title={t('Добавьте первый расходник')}
          text={t(
            'Краска, шампунь, перчатки: укажите цену за единицу и сколько уходит на услугу — аналитика покажет себестоимость.',
          )}
          action={<Button onClick={() => setEditing('new')}>{t('Добавить позицию')}</Button>}
        />
      ) : (
        <section className={sheet.group} aria-label={t('Позиции')}>
          <ul className={styles.list}>
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type='button'
                  className={styles.serviceRow}
                  onClick={() => setEditing(item)}
                >
                  <span className={styles.rowBody}>
                    <span className={styles.rowTitle}>{item.name}</span>
                    <span className={styles.rowMeta}>
                      {[
                        item.isForSale && item.salePrice !== null
                          ? t('продажа {price}', { price: formatPrice(item.salePrice) })
                          : t('{price} за {unit}', {
                              price: formatPrice(item.unitCost),
                              unit: t(item.unit),
                            }),
                        item.materials.length > 0
                          ? t('в {count} усл.', { count: item.materials.length })
                          : t(item.isForSale ? 'товар' : 'не привязана к услугам'),
                      ].join(' · ')}
                    </span>
                  </span>
                  <span className={styles.cellValue} data-tone={item.isLow ? 'danger' : undefined}>
                    {formatQuantity(item.quantity)} {t(item.unit)}
                  </span>
                  <CaretRight className={styles.chevron} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          <RowNote>
            {[
              low.length > 0
                ? t('Заканчивается: {names}.', { names: low.map((item) => item.name).join(', ') })
                : '',
              t('На складе на {amount}.', { amount: formatPrice(Math.round(value ?? 0)) }),
            ]
              .filter(Boolean)
              .join(' ')}
          </RowNote>
        </section>
      )}

      {editing && (
        <StockItemSheet
          key={editing === 'new' ? 'new' : editing.id}
          item={editing === 'new' ? null : (current ?? editing)}
          services={catalog.services}
          onClose={() => setEditing(null)}
          onSave={(input) =>
            run(
              () => saveStockItem(slug, input, editing === 'new' ? undefined : editing.id),
              t('Сохранено'),
            )
          }
          onReceive={
            editing === 'new'
              ? undefined
              : (quantity, asExpense) =>
                  run(
                    () =>
                      receiveStock(slug, editing.id, {
                        quantity,
                        expense: asExpense ? { branchId: null } : null,
                      }),
                    t('Приход записан'),
                    asExpense ? t('Сумма закупки в «Расходах».') : undefined,
                  )
          }
          onAdjust={
            editing === 'new'
              ? undefined
              : (quantity) =>
                  run(() => adjustStock(slug, editing.id, quantity), t('Остаток исправлен'))
          }
          onDelete={
            editing === 'new'
              ? undefined
              : () => void run(() => deleteStockItem(slug, editing.id), t('Позиция удалена'))
          }
        />
      )}
    </section>
  )
}
