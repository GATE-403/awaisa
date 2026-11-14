import NextLink from 'next/link'
import styles from './TextTabs.module.css'

type TextTab = {
  label: string
  isActive: boolean
  /** A link tab (the view lives in the URL)… */
  href?: string
  /** …or a button tab over local state. */
  onSelect?: () => void
  /** A small muted count beside the label. */
  count?: number | string
  /** Button tabs: the tab's id and the panel it controls. */
  id?: string
  controls?: string
}

interface TextTabsProps {
  label: string
  items: TextTab[]
  /** `lg` for a page's main switch (the catalog's «Места · Услуги»). */
  size?: 'md' | 'lg'
}

// Underlined text tabs (only the chosen one marked, no rule under them), like the local nav on apple.com — the one tab style of the
// app: links when the view is in the URL, buttons (role=tab) when it is local state.
export const TextTabs = ({ label, items, size = 'md' }: TextTabsProps) => {
  const isButtons = items.some((item) => !item.href)
  const content = items.map((item) => {
    const inner = (
      <>
        {item.label}
        {item.count !== undefined && <span className={styles.count}>{item.count}</span>}
      </>
    )
    if (item.href) {
      return (
        <NextLink
          key={item.href}
          href={item.href}
          scroll={false}
          className={styles.tab}
          aria-current={item.isActive ? 'page' : undefined}
        >
          {inner}
        </NextLink>
      )
    }
    return (
      <button
        key={item.label}
        type='button'
        role='tab'
        id={item.id}
        aria-controls={item.controls}
        aria-selected={item.isActive}
        aria-current={item.isActive ? 'page' : undefined}
        className={styles.tab}
        onClick={item.onSelect}
      >
        {inner}
      </button>
    )
  })

  return isButtons ? (
    <div className={styles.tabs} data-size={size}>
      <div className={styles.list} role='tablist' aria-label={label}>
        {content}
      </div>
    </div>
  ) : (
    <nav aria-label={label} className={styles.tabs} data-size={size}>
      <div className={styles.list}>{content}</div>
    </nav>
  )
}

export type { TextTab }
