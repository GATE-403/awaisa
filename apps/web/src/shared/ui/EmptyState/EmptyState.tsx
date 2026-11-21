import type { ReactNode } from 'react'
import { Mascot } from '../Mascot/Mascot'
import styles from './EmptyState.module.css'

interface EmptyStateProps {
  title?: string
  text: ReactNode
  /** The next step («Добавить услугу», «В каталог») under the text. */
  action?: ReactNode
  /** A glyph above the title in place of the quiet mascot every titled empty place has. */
  icon?: ReactNode
  /**
   * The same look in two sizes: `card` (the default) for a section with nothing in it yet,
   * `inline`: compact, where a list or results would be (search, a short thread).
   */
  variant?: 'card' | 'inline'
  /** Over a dark stage («Образы»): light text. */
  isOnDark?: boolean
  className?: string
}

// What a place with nothing in it says: an invitation with the next step, not an apology. One look
// everywhere, like iOS's «content unavailable» view («унифицировать в один»): no card or fill under
// it, centred where the content would be, the quiet mascot over a title, a line or two of muted text
// and the next step. The compact size keeps the same centred text without the mascot and title.
export const EmptyState = ({
  title,
  text,
  action,
  icon,
  variant = 'card',
  isOnDark = false,
  className,
}: EmptyStateProps) => {
  const rootClass = className ? `${styles.root} ${className}` : styles.root
  const mark = icon ?? (title ? <Mascot /> : null)

  return (
    <div className={rootClass} data-size={variant} data-on-dark={isOnDark || undefined}>
      {mark && <span className={styles.icon}>{mark}</span>}
      {title && <p className={styles.title}>{title}</p>}
      <p className={styles.text}>{text}</p>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}
