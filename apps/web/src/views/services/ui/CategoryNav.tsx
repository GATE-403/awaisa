'use client'

import { useEffect, useRef, useState } from 'react'
import { useT } from '@/shared/i18n'
import { useRootFlag } from '@/shared/lib/hooks/useRootFlag'
import { Container } from '@/shared/ui/Container/Container'
import tabs from '@/shared/ui/TextTabs/TextTabs.module.css'
import styles from './CategoryNav.module.css'

type CategoryNavItem = {
  id: string
  name: string
}

interface CategoryNavProps {
  items: CategoryNavItem[]
}

const ACTIVE_ZONE = '-35% 0px -55% 0px'

export const CategoryNav = ({ items }: CategoryNavProps) => {
  const t = useT()
  const [activeId, setActiveId] = useState(items[0]?.id ?? null)
  const barRef = useRef<HTMLElement>(null)
  const [isStuck, setIsStuck] = useState(false)
  useRootFlag(isStuck ? 'category-nav' : null)
  const idsKey = items.map((item) => item.id).join(',')

  useEffect(() => {
    const sections = idsKey
      .split(',')
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null)

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting)
        if (visible) setActiveId(visible.target.id)
      },
      { rootMargin: ACTIVE_ZONE },
    )

    for (const section of sections) observer.observe(section)
    return () => observer.disconnect()
  }, [idsKey])

  // The tabs lie on the page; pinned under the business bar they take its material.
  useEffect(() => {
    const bar = barRef.current
    if (!bar) return
    const top = Number.parseFloat(getComputedStyle(bar).top) || 0
    const observer = new IntersectionObserver(
      ([entry]) =>
        setIsStuck(
          entry ? entry.intersectionRatio < 1 && entry.boundingClientRect.top < top + 2 : false,
        ),
      { rootMargin: `-${Math.ceil(top) + 2}px 0px 0px 0px`, threshold: 1 },
    )
    observer.observe(bar)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!activeId) return
    document
      .querySelector(`[data-category-link="${activeId}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [activeId])

  return (
    // The app's text tabs (only the chosen one underlined), as links to the sections.
    <nav
      ref={barRef}
      aria-label={t('Категории')}
      className={styles.bar}
      data-category-nav=''
      data-stuck={isStuck || undefined}
    >
      <Container className={`${tabs.list} ${styles.list}`}>
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            data-category-link={item.id}
            aria-current={item.id === activeId ? 'page' : undefined}
            className={tabs.tab}
            onClick={() => setActiveId(item.id)}
          >
            {item.name}
          </a>
        ))}
      </Container>
    </nav>
  )
}
