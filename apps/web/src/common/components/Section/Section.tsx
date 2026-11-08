import { ChevronRight } from 'lucide-react'
import NextLink from 'next/link'
import type { ReactNode } from 'react'
import styles from './Section.module.css'

interface SectionProps {
  id?: string
  title: string
  description?: string
  actionHref?: string
  actionLabel?: string
  children: ReactNode
}

export const Section = ({
  id,
  title,
  description,
  actionHref,
  actionLabel = 'Все',
  children,
}: SectionProps) => {
  const headingId = `${id ?? title}-title`

  return (
    <section id={id} aria-labelledby={headingId} className={styles.section}>
      <div className={styles.header}>
        <div className={styles.titles}>
          <h2 id={headingId} className={styles.title}>
            {title}
          </h2>
          {description && <p className={styles.description}>{description}</p>}
        </div>
        {actionHref && (
          <NextLink href={actionHref} className={styles.action}>
            {actionLabel}
            <ChevronRight className={styles.actionIcon} aria-hidden />
          </NextLink>
        )}
      </div>
      {children}
    </section>
  )
}
