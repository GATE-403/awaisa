import NextLink from 'next/link'
import styles from './TextTabs.module.css'

type TextTab = {
  href: string
  label: string
  isActive: boolean
}

interface TextTabsProps {
  label: string
  items: TextTab[]
}

// Underlined text tabs on a hairline, like the local nav on apple.com.
export const TextTabs = ({ label, items }: TextTabsProps) => (
  <nav aria-label={label} className={styles.tabs}>
    <div className={styles.list}>
      {items.map((item) => (
        <NextLink
          key={item.href}
          href={item.href}
          scroll={false}
          className={styles.tab}
          aria-current={item.isActive ? 'page' : undefined}
        >
          {item.label}
        </NextLink>
      ))}
    </div>
  </nav>
)

export type { TextTab }
