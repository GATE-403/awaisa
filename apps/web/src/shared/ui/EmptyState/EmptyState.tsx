import type { ReactNode } from 'react'
import styles from './EmptyState.module.css'

interface EmptyStateProps {
  title?: string
  text: ReactNode
  /** The next step («Добавить услугу», «В каталог») under the text. */
  action?: ReactNode
  /** The mascot or a UI glyph above the title. */
  icon?: ReactNode
  /**
   * `card` — a surface card in the middle of a section (lists, tabs, the cabinet);
   * `inline` — one quiet line where a list would be (search results, a short thread).
   */
  variant?: 'card' | 'inline'
  /** Inline only: centred under a centred head (the leaderboard). */
  isCentered?: boolean
  /** Over a dark stage («Работы»): light text. */
  isOnDark?: boolean
  className?: string
}

// What a place with nothing in it says — an invitation with the next step, not an apology. One
// look everywhere: the profile, the cabinet, the master's day, the catalog, the map, the feed.
export const EmptyState = ({
  title,
  text,
  action,
  icon,
  variant = 'card',
  isCentered = false,
  isOnDark = false,
  className,
}: EmptyStateProps) => {
  const rootClass = className ? `${styles.root} ${className}` : styles.root
  const flags = {
    'data-variant': variant,
    'data-centered': isCentered || undefined,
    'data-on-dark': isOnDark || undefined,
  }

  if (variant === 'inline' && !title && !action && !icon) {
    return (
      <p className={rootClass} {...flags}>
        {text}
      </p>
    )
  }

  return (
    <div className={rootClass} {...flags}>
      {icon && <span className={styles.icon}>{icon}</span>}
      {title && <p className={styles.title}>{title}</p>}
      <p className={styles.text}>{text}</p>
      {action}
    </div>
  )
}
