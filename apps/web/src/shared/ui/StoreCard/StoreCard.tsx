import { Plus } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import type { ReactNode } from 'react'
import styles from './StoreCard.module.css'

interface StoreCardProps {
  href?: string
  eyebrow?: string
  isHighlighted?: boolean
  title: ReactNode
  description?: ReactNode
  footer?: ReactNode
  media?: ReactNode
  tone?: 'light' | 'dark'
  height?: 'md' | 'sm' | 'auto' | 'compact'
  className?: string
}

export const StoreCard = ({
  href,
  eyebrow,
  isHighlighted = false,
  title,
  description,
  footer,
  media,
  tone = 'light',
  height = 'md',
  className,
}: StoreCardProps) => {
  const body = (
    <>
      <span className={styles.text}>
        {eyebrow && (
          <span className={styles.eyebrow} data-highlighted={isHighlighted || undefined}>
            {eyebrow}
          </span>
        )}
        <span className={styles.title}>{title}</span>
        {description && <span className={styles.description}>{description}</span>}
      </span>
      {media && <span className={styles.media}>{media}</span>}
      {(footer || href) && (
        <span className={styles.footer}>
          <span className={styles.footerContent}>{footer}</span>
          {href && (
            <span className={styles.plus} aria-hidden='true'>
              <Plus weight='bold' />
            </span>
          )}
        </span>
      )}
    </>
  )
  const classes = className ? `${styles.card} ${className}` : styles.card

  if (!href) {
    return (
      <div className={classes} data-tone={tone} data-height={height}>
        {body}
      </div>
    )
  }

  return (
    <NextLink href={href} className={classes} data-tone={tone} data-height={height}>
      {body}
    </NextLink>
  )
}
