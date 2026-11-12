'use client'

import { useEffect, useState } from 'react'
import { useRootFlag } from '@/shared/lib/hooks/useRootFlag'
import { Container } from '@/shared/ui/Container/Container'
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
  const [activeId, setActiveId] = useState(items[0]?.id ?? null)
  useRootFlag('category-nav')
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

  useEffect(() => {
    if (!activeId) return
    document
      .querySelector(`[data-category-link="${activeId}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [activeId])

  return (
    <nav aria-label='Категории' className={styles.bar} data-category-nav=''>
      <Container className={styles.list}>
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            data-category-link={item.id}
            aria-current={item.id === activeId ? 'true' : undefined}
            className={styles.chip}
            onClick={() => setActiveId(item.id)}
          >
            {item.name}
          </a>
        ))}
      </Container>
    </nav>
  )
}
