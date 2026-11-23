'use client'

import { Check, Fire } from '@phosphor-icons/react/ssr'
import { type CSSProperties, useState } from 'react'
import { formatPrice } from '@/entities/booking'
import { pickTint } from '@/entities/business'
import type { Category, Service } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { gridImage } from '@/shared/lib/imageSizes'
import chipStyles from '@/shared/ui/Chip/Chip.module.css'
import styles from './ServicePicker.module.css'

interface ServicePickerProps {
  services: Service[]
  categories: Category[]
  value: string | null
  /**
   * The visit's services, when it is changed from its ticket: the cards are checkboxes, every
   * service in the visit is ticked, and a tap ticks or unticks one (`onChange`).
   */
  chosenIds?: string[]
  onChange: (id: string) => void
  /** The chosen card tapped again: close the step without changing anything. */
  onReselect?: () => void
  /** A work photo per service (newest tagged one), else the place's cover. */
  photos?: Record<string, string>
  coverUrl?: string | null
  businessName: string
  /** «Сегодня с 15:30» for a service, when one could come soon. */
  soonLabel: (serviceId: string) => string | null
}

// Services as the catalog's picture cards, two a row: people pick a haircut by how it looks, the
// way they found it. A native radio covers each card; the chosen one is ringed and checked.
export const ServicePicker = ({
  services,
  categories,
  value,
  chosenIds,
  onChange,
  photos,
  onReselect,
  coverUrl,
  businessName,
  soonLabel,
}: ServicePickerProps) => {
  const t = useT()
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const shownCategories = categories.filter((category) =>
    services.some((service) => service.categoryId === category.id),
  )
  const shown = categoryId
    ? services.filter((service) => service.categoryId === categoryId)
    : services
  const tint = { '--tint': pickTint(businessName) } as CSSProperties
  const isMultiple = chosenIds !== undefined

  return (
    <div className={styles.picker}>
      {shownCategories.length > 1 && (
        <div className={styles.chips} data-edge-fade=''>
          {[{ id: null, name: t('Все') }, ...shownCategories].map((category) => (
            <button
              key={category.id ?? 'all'}
              type='button'
              className={chipStyles.chip}
              aria-pressed={categoryId === category.id}
              onClick={() => setCategoryId(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}
      <div
        className={styles.grid}
        // Checkboxes when the visit is changed from its ticket, radios when its first service is
        // picked (one tap, and the form moves on).
        {...(isMultiple
          ? { role: 'group' as const, 'aria-label': t('Услуги визита') }
          : { role: 'radiogroup' as const, 'aria-label': t('Услуга') })}
      >
        {shown.map((service) => {
          const picture = photos?.[service.id] ?? coverUrl ?? null
          const soon = soonLabel(service.id)
          const isChosen = isMultiple ? chosenIds.includes(service.id) : value === service.id
          return (
            <label
              key={service.id}
              className={styles.card}
              data-card=''
              data-picture-frame=''
              data-chosen={isChosen || undefined}
              style={tint}
            >
              {picture && (
                // biome-ignore lint/performance/noImgElement: hotlinked and API pictures, sized here
                <img {...gridImage(picture)} alt='' className={styles.image} data-card-media='' />
              )}
              <input
                type={isMultiple ? 'checkbox' : 'radio'}
                name='service'
                className={styles.input}
                checked={isChosen}
                onChange={() => onChange(service.id)}
                onClick={() => {
                  if (!isMultiple && isChosen) onReselect?.()
                }}
                aria-label={`${service.name}, ${formatPrice(service.price)}, ${t.duration(service.durationMinutes)}`}
              />
              {service.isPopular && (
                <span className={styles.hit} aria-hidden>
                  <Fire weight='fill' />
                </span>
              )}
              <Check className={styles.check} aria-hidden />
              <span className={styles.caption}>
                <span className={styles.name}>{service.name}</span>
                <span className={styles.meta}>
                  {formatPrice(service.price)} · {t.duration(service.durationMinutes)}
                </span>
                {soon && <span className={styles.soon}>{soon}</span>}
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
