'use client'

import { CaretRight, Clock, MapPin, Phone } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { findDay, formatClock, WEEKDAYS_FULL, weekdayOf } from '@/entities/business'
import type { Business, WorkingDay } from '@/shared/api/types'
import { formatPhone } from '@/shared/lib/formatPhone'
import { useToday } from '@/shared/lib/hooks/useToday'
import { BranchesMap } from './BranchesMap'
import styles from './Place.module.css'

interface VisitSectionProps {
  business: Business
}

const hoursOf = (hours: WorkingDay[], weekday: number) => {
  const day = findDay(hours, weekday)
  return day ? `${formatClock(day.opensMinutes)}–${formatClock(day.closesMinutes)}` : 'Выходной'
}

const routeOf = (business: Business, latitude: number | null, longitude: number | null) =>
  latitude !== null && longitude !== null
    ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
    : business.mapUrl || null

// Settings-style facts: a coloured glyph, a small label, the value — hours, address, phone.
export const VisitSection = ({ business }: VisitSectionProps) => {
  const today = useToday()
  const todayWeekday = today ? weekdayOf(today.dayKey) : null
  const isSeveral = business.branches.length > 1
  const pinned = business.branches.some(
    (branch) => branch.latitude !== null && branch.longitude !== null,
  )

  return (
    <section id='visit' className={`${styles.card} ${styles.visit}`} aria-label='Как нас найти'>
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
              <span className={styles.glyph} data-tone='blue' aria-hidden>
                <MapPin weight='fill' />
              </span>
              <span className={styles.infoText}>
                <span className={styles.infoLabel}>{isSeveral ? branch.name : 'Адрес'}</span>
                <span className={styles.infoValue}>{address}</span>
              </span>
              {isSeveral ? (
                <NextLink
                  href={`/${business.slug}/book?branch=${branch.id}`}
                  className={styles.infoAction}
                >
                  Записаться
                </NextLink>
              ) : (
                route && (
                  <a href={route} target='_blank' rel='noreferrer' className={styles.infoAction}>
                    Маршрут
                  </a>
                )
              )}
            </div>
            {phone && (
              <a href={`tel:${phone}`} className={styles.info}>
                <span className={styles.glyph} data-tone='green' aria-hidden>
                  <Phone weight='fill' />
                </span>
                <span className={styles.infoText}>
                  <span className={styles.infoLabel}>Телефон</span>
                  <span className={styles.infoValue}>{formatPhone(phone)}</span>
                </span>
                <span className={styles.infoAction}>Позвонить</span>
              </a>
            )}
          </div>
        )
      })}
      {/* Today is what matters; the week opens on demand. */}
      <details className={styles.hoursBlock}>
        <summary className={styles.info}>
          <span className={styles.glyph} data-tone='orange' aria-hidden>
            <Clock weight='fill' />
          </span>
          <span className={styles.infoText}>
            <span className={styles.infoLabel}>Часы</span>
            <span className={styles.infoValue}>
              {todayWeekday === null
                ? ' '
                : `Сегодня ${hoursOf(business.hours, todayWeekday).toLowerCase()}`}
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
              <span>{dayName}</span>
              <span>{hoursOf(business.hours, weekday)}</span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  )
}
