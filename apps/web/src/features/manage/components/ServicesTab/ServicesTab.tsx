import { Button } from '@awaisa/ui/Button'
import { Input } from '@awaisa/ui/Input'
import { CaretRight } from '@phosphor-icons/react/ssr'
import { type FormEvent, useState } from 'react'
import {
  createCategory,
  createService,
  deleteCategory,
  updateService,
} from '@/common/api/clientApi'
import type { Catalog, Service, ServiceInput } from '@/common/api/types'
import { formatDuration, formatPrice } from '@/features/booking/bookingUtils'
import styles from '../manageForms.module.css'
import { ServiceDialog } from './ServiceDialog'

interface ServicesTabProps {
  slug: string
  catalog: Catalog
  run: (action: () => Promise<unknown>, successTitle: string) => Promise<boolean>
}

export const ServicesTab = ({ slug, catalog, run }: ServicesTabProps) => {
  const [editing, setEditing] = useState<Service | 'new' | null>(null)
  const [categoryName, setCategoryName] = useState('')

  const handleSave = (input: ServiceInput) =>
    editing && editing !== 'new'
      ? run(() => updateService(slug, editing.id, input), 'Услуга сохранена')
      : run(() => createService(slug, input), 'Услуга добавлена')

  const handleAddCategory = async (event: FormEvent) => {
    event.preventDefault()
    if (!categoryName.trim()) return
    if (await run(() => createCategory(slug, categoryName.trim()), 'Категория добавлена')) {
      setCategoryName('')
    }
  }

  return (
    <div className={styles.section}>
      <div className={styles.toolbar}>
        <p className={styles.hint}>Клиенты видят цену и длительность до записи.</p>
        <Button onClick={() => setEditing('new')}>Добавить услугу</Button>
      </div>

      {catalog.categories.map((category) => {
        const services = catalog.services.filter((service) => service.categoryId === category.id)

        return (
          <section key={category.id} className={styles.section} aria-label={category.name}>
            <div className={styles.toolbar}>
              <h3 className={styles.groupTitle}>{category.name}</h3>
              {services.length === 0 && catalog.categories.length > 1 && (
                <Button
                  variant='link'
                  size='sm'
                  onClick={() => run(() => deleteCategory(slug, category.id), 'Категория удалена')}
                >
                  Удалить
                </Button>
              )}
            </div>
            {services.length === 0 ? (
              <p className={styles.empty}>Пока пусто — добавьте первую услугу.</p>
            ) : (
              <ul className={styles.list}>
                {services.map((service) => (
                  <li key={service.id}>
                    <button
                      type='button'
                      className={styles.row}
                      onClick={() => setEditing(service)}
                    >
                      <span className={styles.rowBody}>
                        <span>{service.name}</span>
                        <span className={styles.rowMeta}>
                          {formatDuration(service.durationMinutes)} · {formatPrice(service.price)}
                        </span>
                      </span>
                      {service.isActive === false && <span className={styles.badge}>Скрыта</span>}
                      {service.isPopular && <span className={styles.badge}>Популярная</span>}
                      <CaretRight className={styles.chevron} weight='bold' aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}

      <form className={styles.inline} onSubmit={handleAddCategory}>
        <Input
          value={categoryName}
          onValueChange={setCategoryName}
          placeholder='Новая категория, например «Ногти»'
          aria-label='Новая категория'
        />
        <Button type='submit' variant='secondary' disabled={!categoryName.trim()}>
          Добавить
        </Button>
      </form>

      {editing && (
        <ServiceDialog
          key={editing === 'new' ? 'new' : editing.id}
          service={editing === 'new' ? null : editing}
          categories={catalog.categories}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
