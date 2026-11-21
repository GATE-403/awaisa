'use client'

import { CaretRight, Clock, MapPin, Phone } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { findDay, formatClock, WEEKDAYS_FULL, weekdayOf } from '@/entities/business'
import type { Business, WorkingDay } from '@/shared/api/types'
import { type Translate, useT } from '@/shared/i18n'
import { formatPhone } from '@/shared/lib/formatPhone'
import { useToday } from '@/shared/lib/hooks/useToday'
import { BranchesMap } from './BranchesMap'
import styles from './Place.module.css'

interface VisitSectionProps {
  business: Business
}

const hoursOf = (t: Translate, hours: WorkingDay[], weekday: number) => {
  const day = findDay(hours, weekday)
  return day ? `${formatClock(day.opensMinutes)}–${formatClock(day.closesMinutes)}` : t('Выходной')
}

// 1 January 2024 was a Monday: weekday 0 (Monday, like the API) is its day key.
const weekdayKey = (weekday: number) => `2024-01-0${weekday + 1}`

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

const routeOf = (business: Business, latitude: number | null, longitude: number | null) =>
  latitude !== null && longitude !== null
    ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
    : business.mapUrl || null

// Settings-style facts: a quiet glyph, a small label, the value — hours, address, phone.
export const VisitSection = ({ business }: VisitSectionProps) => {
  const t = useT()
  const today = useToday()
  const todayWeekday = today ? weekdayOf(today.dayKey) : null
  const isSeveral = business.branches.length > 1
  const pinned = business.branches.some(
    (branch) => branch.latitude !== null && branch.longitude !== null,
  )

  return (
    <section
      id='visit'
      className={`${styles.card} ${styles.visit}`}
      aria-label={t('Как нас найти')}
    >
      {/* The map leads, edge to edge at the card's top, like a place card in Maps. */}
      {pinned && (
        <div className={styles.visitMap}>
          <BranchesMap business={business} />
        </div>
      )}

      {business.branches.map((branch) => {
        const phone = branch.phone || business.phone
        const address = [business.city, branch.address || business.address]
          .filter(Boolean)
          .join(', ')
        const route = routeOf(business, branch.latitude, branch.longitude)

        return (
          <div key={branch.id} className={styles.branch}>
            <div className={styles.info}>
              <span className={styles.glyph} aria-hidden>
                <MapPin />
              </span>
              <span className={styles.infoText}>
                <span className={styles.infoLabel}>{isSeveral ? branch.name : t('Адрес')}</span>
                <span className={styles.infoValue}>{address}</span>
              </span>
              {isSeveral ? (
                <NextLink
                  href={`/${business.slug}/book?branch=${branch.id}`}
                  className={styles.infoAction}
                >
                  {t('Записаться')}
                </NextLink>
              ) : (
                route && (
                  <a href={route} target='_blank' rel='noreferrer' className={styles.infoAction}>
                    {t('Маршрут')}
                  </a>
                )
              )}
            </div>
            {phone && (
              <a href={`tel:${phone}`} className={styles.info}>
                <span className={styles.glyph} aria-hidden>
                  <Phone />
                </span>
                <span className={styles.infoText}>
                  <span className={styles.infoLabel}>{t('Телефон')}</span>
                  <span className={styles.infoValue}>{formatPhone(phone)}</span>
                </span>
                <span className={styles.infoAction}>{t('Позвонить')}</span>
              </a>
            )}
          </div>
        )
      })}
      {/* Today is what matters; the week opens on demand. */}
      <details className={styles.hoursBlock}>
        <summary className={styles.info}>
          <span className={styles.glyph} aria-hidden>
            <Clock />
          </span>
          <span className={styles.infoText}>
            <span className={styles.infoLabel}>{t('Часы')}</span>
            <span className={styles.infoValue}>
              {todayWeekday === null
                ? ' '
                : t('Сегодня {hours}', {
                    hours: hoursOf(t, business.hours, todayWeekday).toLowerCase(),
                  })}
            </span>
          </span>
          <CaretRight weight='bold' className={styles.infoChevron} aria-hidden />
        </summary>
        <ul className={styles.hours}>
          {WEEKDAYS_FULL.map((dayName, weekday) => (
            <li
              key={dayName}
              className={styles.hoursRow}
              data-today={weekday === todayWeekday || undefined}
            >
              <span>{capitalize(t.weekdayLong(weekdayKey(weekday)))}</span>
              <span>{hoursOf(t, business.hours, weekday)}</span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  )
}
