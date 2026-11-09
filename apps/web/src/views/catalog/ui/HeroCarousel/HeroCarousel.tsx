'use client'

import { ArrowRight, CaretLeft, CaretRight } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { type CSSProperties, useEffect, useState } from 'react'
import { formatPrice } from '@/entities/booking'
import { BusinessTile } from '@/entities/business'
import type { Offer } from '@/shared/api/types'
import styles from './HeroCarousel.module.css'

interface HeroCarouselProps {
  offers: Offer[]
}

const ROTATE_MS = 7000

type Slide = {
  id: string
  eyebrow: string
  title: string
  text: string
  href: string
  action: string
  from: string
  to: string
  showOffers?: boolean
}

const SLIDES: Slide[] = [
  {
    id: 'today',
    eyebrow: 'Сегодня',
    title: 'Свободно уже сегодня',
    text: 'Запишитесь на вечер — без звонков и ожидания.',
    href: '/?sort=soon',
    action: 'Смотреть время',
    from: 'var(--system-blue)',
    to: 'var(--system-indigo)',
    showOffers: true,
  },
  {
    id: 'map',
    eyebrow: 'Рядом',
    title: 'Салоны в пяти минутах',
    text: 'Ближайшие места и свободное время — на карте.',
    href: '/map',
    action: 'Открыть карту',
    from: 'var(--system-green)',
    to: 'var(--system-teal)',
  },
  {
    id: 'business',
    eyebrow: 'Для бизнеса',
    title: 'Ваш салон — в каталоге',
    text: 'Страница с онлайн-записью за пять минут. Бесплатно.',
    href: '/business',
    action: 'Подключить',
    from: 'var(--system-pink)',
    to: 'var(--system-orange)',
  },
]

// The store's main banner: big, colourful, rotating, with real offers inside the first slide.
export const HeroCarousel = ({ offers }: HeroCarouselProps) => {
  const [index, setIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const slide = SLIDES[index] ?? SLIDES[0]
  const picks = offers.slice(0, 3)

  // biome-ignore lint/correctness/useExhaustiveDependencies: restart the timer whenever the slide changes
  useEffect(() => {
    if (isPaused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setTimeout(
      () => setIndex((value) => (value + 1) % SLIDES.length),
      ROTATE_MS,
    )

    return () => window.clearTimeout(timer)
  }, [index, isPaused])

  if (!slide) return null

  const go = (delta: number) => setIndex((value) => (value + delta + SLIDES.length) % SLIDES.length)

  return (
    <section
      className={styles.carousel}
      aria-roledescription='карусель'
      aria-label='Подборки'
      onPointerEnter={() => setIsPaused(true)}
      onPointerLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <article
        key={slide.id}
        className={styles.slide}
        style={{ '--from': slide.from, '--to': slide.to } as CSSProperties}
        aria-roledescription='слайд'
        aria-label={`${index + 1} из ${SLIDES.length}: ${slide.title}`}
      >
        <div className={styles.copy}>
          <p className={styles.eyebrow}>{slide.eyebrow}</p>
          <h2 className={styles.title}>{slide.title}</h2>
          <p className={styles.text}>{slide.text}</p>
          <NextLink href={slide.href} className={styles.action}>
            {slide.action}
            <ArrowRight weight='bold' aria-hidden />
          </NextLink>
        </div>
        {slide.showOffers && picks.length > 0 && (
          <ul className={styles.picks}>
            {picks.map((offer) => (
              <li key={offer.id}>
                <NextLink href={`/${offer.slug}/book?service=${offer.id}`} className={styles.pick}>
                  <span className={styles.pickPrice}>от {formatPrice(offer.price)}</span>
                  <span className={styles.pickName}>{offer.name}</span>
                  <span className={styles.pickMedia}>
                    {offer.coverUrl ? (
                      // biome-ignore lint/performance/noImgElement: already resized WebP from our API
                      <img src={offer.coverUrl} alt='' loading='lazy' />
                    ) : (
                      <BusinessTile name={offer.businessName} size='md' />
                    )}
                  </span>
                  <span className={styles.pickPlace}>{offer.businessName}</span>
                </NextLink>
              </li>
            ))}
          </ul>
        )}
      </article>

      <div className={styles.controls}>
        <button type='button' className={styles.arrow} onClick={() => go(-1)} aria-label='Назад'>
          <CaretLeft weight='bold' aria-hidden />
        </button>
        <span className={styles.dots}>
          {SLIDES.map((item, dotIndex) => (
            <button
              key={item.id}
              type='button'
              className={styles.dot}
              aria-label={`Слайд ${dotIndex + 1}: ${item.title}`}
              aria-current={dotIndex === index || undefined}
              onClick={() => setIndex(dotIndex)}
            />
          ))}
        </span>
        <button type='button' className={styles.arrow} onClick={() => go(1)} aria-label='Вперёд'>
          <CaretRight weight='bold' aria-hidden />
        </button>
      </div>
    </section>
  )
}
