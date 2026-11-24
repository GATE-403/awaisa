'use client'

import { CaretRight, MapPin, Star } from '@phosphor-icons/react/ssr'
import type { CSSProperties, ReactNode } from 'react'
import { formatPrice, getDateParts } from '@/entities/booking'
import { addMinutes, BusinessTile, PersonAvatar, pickTint } from '@/entities/business'
import type { Business, PriceQuote, Service, Specialist } from '@/shared/api/types'
import { type Translate, useT } from '@/shared/i18n'
import { formatPhone } from '@/shared/lib/formatPhone'
import { useToday } from '@/shared/lib/hooks/useToday'
import { sizedImage } from '@/shared/lib/imageSizes'
import type { BookingStepId } from '@/views/booking/model/useBookingForm'
import styles from './BookingReview.module.css'

interface BookingReviewProps {
  business: Business
  branchAddress: string | null
  service: Service
  specialist: Specialist | null
  dayKey: string
  time: string
  name: string
  phone: string
  comment: string
  quote: PriceQuote | null
  onEdit: (step: BookingStepId) => void
  /** Book at the card's foot on wide screens (phones have it in the bottom bar). */
  action?: ReactNode
}

const relativeDay = (dayKey: string, todayKey: string | null, t: Translate) => {
  if (!todayKey) return null
  const days = Math.round(
    (Date.parse(`${dayKey}T00:00:00Z`) - Date.parse(`${todayKey}T00:00:00Z`)) / 86_400_000,
  )
  if (days === 0) return t('today')
  if (days === 1) return t('tomorrow')
  if (days === 2) return t('the day after tomorrow')
  return t('in {days} days', { days })
}

// The last step before Book, shaped like the ticket it becomes: the place on its cover,
// the day as a calendar leaf beside the time span, then who, what and for whom - each a tap
// away from being changed - and what it costs and how it is paid. Nothing to fill in, only to
// check.
export const BookingReview = ({
  business,
  branchAddress,
  service,
  specialist,
  dayKey,
  time,
  name,
  phone,
  comment,
  quote,
  onEdit,
  action,
}: BookingReviewProps) => {
  const t = useT()
  const today = useToday()
  const { day } = getDateParts(dayKey)
  const month = t.monthShort(dayKey)
  const weekday = t.weekdayLong(dayKey)
  const relative = relativeDay(dayKey, today?.dayKey ?? null, t)
  const total = quote?.total ?? service.price
  const discount = quote?.discount ?? null

  return (
    <section className={styles.review} aria-labelledby='review-title'>
      <h2 id='review-title' className={styles.title}>
        {t('Check your booking')}
      </h2>

      <div className={styles.ticket} style={{ '--tint': pickTint(business.name) } as CSSProperties}>
        <div className={styles.place}>
          {business.coverUrl && (
            // biome-ignore lint/performance/noImgElement: sized CDN/WebP pictures
            <img {...sizedImage(business.coverUrl, 480)} alt='' className={styles.cover} />
          )}
          <span className={styles.placeInner}>
            <BusinessTile
              name={business.name}
              logoUrl={business.logoUrl}
              size='sm'
              className={styles.placeTile}
            />
            <span className={styles.placeText}>
              <span className={styles.placeName}>{business.name}</span>
              {branchAddress && (
                <span className={styles.placeAddress}>
                  <MapPin aria-hidden />
                  {branchAddress}
                </span>
              )}
            </span>
          </span>
        </div>

        <button type='button' className={styles.when} onClick={() => onEdit('datetime')}>
          <span className={styles.leaf} aria-hidden>
            <span className={styles.leafMonth}>{month}</span>
            <span className={styles.leafDay}>{day}</span>
          </span>
          <span className={styles.whenText}>
            <span className={styles.whenTime}>
              {time}–{addMinutes(time, service.durationMinutes)}
            </span>
            <span className={styles.whenDay}>
              {weekday}
              {relative && ` · ${relative}`}
            </span>
          </span>
          <span className={styles.edit}>{t('Change')}</span>
        </button>

        <div className={styles.perforation} aria-hidden />

        <ul className={styles.rows}>
          <li>
            <button type='button' className={styles.row} onClick={() => onEdit('service')}>
              <span className={styles.rowLabel}>{t('Service')}</span>
              <span className={styles.rowValue}>
                <span className={styles.rowName}>{service.name}</span>
                <span className={styles.rowMeta}>{t.duration(service.durationMinutes)}</span>
              </span>
              <CaretRight aria-hidden className={styles.chevron} />
            </button>
          </li>
          <li>
            <button type='button' className={styles.row} onClick={() => onEdit('specialist')}>
              <span className={styles.rowLabel}>{t('Specialist')}</span>
              <span className={styles.master}>
                {specialist ? (
                  <>
                    <PersonAvatar
                      name={specialist.name}
                      src={specialist.photoUrl ?? undefined}
                      size='sm'
                      className={styles.face}
                    />
                    <span className={styles.rowValue}>
                      <span className={styles.rowName}>{specialist.name}</span>
                      {specialist.rating !== null && (
                        <span className={styles.rowMeta}>
                          <Star weight='fill' aria-hidden className={styles.star} />
                          {specialist.rating.toFixed(1)}
                        </span>
                      )}
                    </span>
                  </>
                ) : (
                  <span className={styles.rowValue}>
                    <span className={styles.rowName}>{t('Anyone free')}</span>
                    <span className={styles.rowMeta}>{t('we will pick')}</span>
                  </span>
                )}
              </span>
              <CaretRight aria-hidden className={styles.chevron} />
            </button>
          </li>
          <li>
            <button type='button' className={styles.row} onClick={() => onEdit('contacts')}>
              <span className={styles.rowLabel}>{t('For')}</span>
              <span className={styles.rowValue}>
                <span className={styles.rowName}>{name}</span>
                <span className={styles.rowMeta}>{formatPhone(phone)}</span>
              </span>
              <CaretRight aria-hidden className={styles.chevron} />
            </button>
          </li>
          {/* The extras read as rows of the same ticket, each opening the contacts step. */}
          <li>
            <button type='button' className={styles.row} onClick={() => onEdit('contacts')}>
              <span className={styles.rowLabel}>{t('Comment')}</span>
              <span className={styles.rowValue}>
                <span className={comment ? styles.rowName : styles.rowEmpty}>
                  {comment || t('Add')}
                </span>
              </span>
              <CaretRight aria-hidden className={styles.chevron} />
            </button>
          </li>
          <li>
            <button type='button' className={styles.row} onClick={() => onEdit('contacts')}>
              <span className={styles.rowLabel}>{t('Promo code')}</span>
              <span className={styles.rowValue}>
                <span className={discount ? styles.rowName : styles.rowEmpty}>
                  {discount ? `${discount.title} · −${discount.percent}%` : t('Enter')}
                </span>
              </span>
              <CaretRight aria-hidden className={styles.chevron} />
            </button>
          </li>
        </ul>

        <div className={styles.perforation} aria-hidden />
        <div className={styles.total}>
          {discount && (
            <p className={styles.totalLine}>
              <span>{discount.title}</span>
              <span className={styles.discount}>−{formatPrice(discount.amount)}</span>
            </p>
          )}
          <p className={styles.totalMain}>
            <span>{t('To pay')}</span>
            <span>
              {discount && <s className={styles.old}>{formatPrice(service.price)}</s>}
              {formatPrice(total)}
            </span>
          </p>
          <p className={styles.terms}>
            {service.deposit
              ? t(
                  'Deposit {amount} - by card right after booking, the rest at the salon. Refunded if you cancel a day ahead.',
                  { amount: formatPrice(service.deposit) },
                )
              : t('Pay at the salon - cash or card. Move or cancel by the link in the SMS.')}
          </p>
        </div>
        {action && <div className={styles.action}>{action}</div>}
      </div>
    </section>
  )
}
