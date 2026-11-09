import { ArrowRight } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import type { CSSProperties } from 'react'
import { StoreShelf } from '@/common/components/StoreShelf/StoreShelf'
import styles from './PromoBanners.module.css'

const BANNERS = [
  {
    href: '/?sort=soon',
    eyebrow: 'Сегодня',
    title: 'Свободно уже сегодня.',
    text: 'Места, где можно записаться на ближайшие часы.',
    action: 'Показать',
    tint: 'var(--system-blue)',
  },
  {
    href: '/map',
    eyebrow: 'Карта',
    title: 'Салоны рядом с вами.',
    text: 'Ближайшие места и свободное время — на одной карте.',
    action: 'Открыть карту',
    tint: 'var(--system-green)',
  },
  {
    href: '/business',
    eyebrow: 'Для бизнеса',
    title: 'Ваш салон — здесь.',
    text: 'Страница с услугами и онлайн-записью за пять минут, без абонплаты.',
    action: 'Подключить',
    tint: 'var(--system-indigo)',
  },
]

// Editorial banners, like the top of a store: wide, colourful, one action each.
export const PromoBanners = () => (
  <StoreShelf
    title='Сейчас.'
    subtitle='Что можно сделать прямо сейчас.'
    label='Подборки'
    size='wide'
  >
    {BANNERS.map((banner) => (
      <li key={banner.href}>
        <NextLink
          href={banner.href}
          className={styles.banner}
          style={{ '--tint': banner.tint } as CSSProperties}
        >
          <span className={styles.eyebrow}>{banner.eyebrow}</span>
          <span className={styles.title}>{banner.title}</span>
          <span className={styles.text}>{banner.text}</span>
          <span className={styles.action}>
            {banner.action}
            <ArrowRight weight='bold' aria-hidden />
          </span>
        </NextLink>
      </li>
    ))}
  </StoreShelf>
)
