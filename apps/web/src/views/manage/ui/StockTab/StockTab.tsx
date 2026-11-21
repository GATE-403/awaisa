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

  const run = async (action: () => Promise<unknown>, title: string) => {
    try {
      const next = await action()
      setItems(Array.isArray(next) ? next : await getStock(slug))
      toast.show({ title, type: 'success' })
      return true
    } catch (error) {
      toast.show({ title: 'Не сохранилось', description: getErrorMessage(error), type: 'error' })
      return false
    }
  }

  if (!items) return null

  const current = editing && editing !== 'new' ? items.find((item) => item.id === editing.id) : null

  return (
    <section className={styles.section} aria-label='Склад'>
      <SectionHeader
        title='Склад'
        description='Расходники списываются, когда визит отмечен «Пришёл».'
        isFloatingOnPhone
        actions={
          <Button size='sm' onClick={() => setEditing('new')}>
            <Plus weight='bold' aria-hidden />
            Позиция
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          title='Добавьте первый расходник'
          text='Краска, шампунь, перчатки: укажите цену за единицу и сколько уходит на услугу — аналитика покажет себестоимость.'
          action={<Button onClick={() => setEditing('new')}>Добавить позицию</Button>}
        />
      ) : (
        <section className={sheet.group} aria-label='Позиции'>
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
                        `${formatPrice(item.unitCost)} за ${item.unit}`,
                        item.materials.length > 0
                          ? `в ${item.materials.length} усл.`
                          : 'не привязана к услугам',
                      ].join(' · ')}
                    </span>
                  </span>
                  <span className={styles.cellValue} data-tone={item.isLow ? 'danger' : undefined}>
                    {formatQuantity(item.quantity)} {item.unit}
                  </span>
                  <CaretRight className={styles.chevron} weight='bold' aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          <RowNote>
            {low.length > 0 ? `Заканчивается: ${low.map((item) => item.name).join(', ')}. ` : ''}
            На складе на {formatPrice(Math.round(value ?? 0))}.
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
              'Сохранено',
            )
          }
          onReceive={
            editing === 'new'
              ? undefined
              : (quantity, unitCost) =>
                  run(() => receiveStock(slug, editing.id, quantity, unitCost), 'Приход записан')
          }
          onAdjust={
            editing === 'new'
              ? undefined
              : (quantity) =>
                  run(() => adjustStock(slug, editing.id, quantity), 'Остаток исправлен')
          }
          onDelete={
            editing === 'new'
              ? undefined
              : () => void run(() => deleteStockItem(slug, editing.id), 'Позиция удалена')
          }
        />
      )}
    </section>
  )
}
