import { Button } from '@awaisa/ui/Button'
import { CaretRight } from '@phosphor-icons/react/ssr'
import { useState } from 'react'
import {
  createCategory,
  createService,
  deleteCategory,
  updateService,
} from '@/common/api/clientApi'
import type { Catalog, Service, ServiceInput } from '@/common/api/types'
import { formatDuration, formatPrice } from '@/features/booking/bookingUtils'
import { EmptyState } from '../EmptyState/EmptyState'
import styles from '../manageForms.module.css'
import { SectionHeader } from '../SectionHeader/SectionHeader'
import { CategoryDialog } from './CategoryDialog'
import { ServiceDialog } from './ServiceDialog'

interface ServicesTabProps {
  slug: string
  catalog: Catalog
  run: (action: () => Promise<unknown>, successTitle: string) => Promise<boolean>
}

export const ServicesTab = ({ slug, catalog, run }: ServicesTabProps) => {
  const [editing, setEditing] = useState<Service | 'new' | null>(null)
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const hasServices = catalog.services.length > 0

  const handleSave = (input: ServiceInput) =>
    editing && editing !== 'new'
      ? run(() => updateService(slug, editing.id, input), 'Услуга сохранена')
      : run(() => createService(slug, input), 'Услуга добавлена')

  return (
    <section className={styles.section} aria-label='Услуги'>
      <SectionHeader
        title='Услуги'
        description='Цена и длительность видны клиенту до записи.'
        actions={
          <>
            <Button variant='secondary' size='sm' onClick={() => setIsAddingCategory(true)}>
              Новая категория
            </Button>
            <Button size='sm' onClick={() => setEditing('new')}>
              Добавить услугу
            </Button>
          </>
        }
      />

      {!hasServices && (
        <EmptyState
          title='Пока нет услуг'
          text='Добавьте первую — название, длительность и цену. Остальное можно позже.'
          action={<Button onClick={() => setEditing('new')}>Добавить услугу</Button>}
        />
      )}

      {hasServices &&
        catalog.categories.map((category) => {
          const services = catalog.services.filter((service) => service.categoryId === category.id)
          const canDelete = services.length === 0 && catalog.categories.length > 1

          return (
            <div key={category.id} className={styles.group}>
              <div className={styles.groupHeader}>
                <h3 className={styles.groupTitle}>
                  {category.name}
                  <span className={styles.groupCount}>{services.length}</span>
                </h3>
                {canDelete && (
                  <button
                    type='button'
                    className={styles.textButton}
                    onClick={() =>
                      run(() => deleteCategory(slug, category.id), 'Категория удалена')
                    }
                  >
                    Удалить
                  </button>
                )}
              </div>
              {services.length === 0 ? (
                <p className={styles.groupEmpty}>Нет услуг в этой категории.</p>
              ) : (
                <ul className={styles.list}>
                  {services.map((service) => (
                    <li key={service.id}>
                      <button
                        type='button'
                        className={styles.serviceRow}
                        onClick={() => setEditing(service)}
                      >
                        <span className={styles.rowBody}>
                          <span className={styles.rowTitle}>
                            {service.name}
                            {service.isPopular && <span className={styles.badge}>Популярная</span>}
                            {service.isActive === false && (
                              <span className={styles.badge}>Скрыта</span>
                            )}
                          </span>
                          {service.description && (
                            <span className={styles.rowMeta}>{service.description}</span>
                          )}
                        </span>
                        <span className={styles.cellMuted}>
                          {formatDuration(service.durationMinutes)}
                        </span>
                        <span className={styles.cellStrong}>{formatPrice(service.price)}</span>
                        <CaretRight className={styles.chevron} weight='bold' aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}

      {editing && (
        <ServiceDialog
          key={editing === 'new' ? 'new' : editing.id}
          service={editing === 'new' ? null : editing}
          categories={catalog.categories}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
      {isAddingCategory && (
        <CategoryDialog
          onClose={() => setIsAddingCategory(false)}
          onSave={(name) => run(() => createCategory(slug, name), 'Категория добавлена')}
        />
      )}
    </section>
  )
}
