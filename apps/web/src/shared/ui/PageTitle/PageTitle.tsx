import styles from './PageTitle.module.css'

interface PageTitleProps {
  title: string
  subtitle?: string
  size?: 'md' | 'sm'
}

export const PageTitle = ({ title, subtitle, size = 'md' }: PageTitleProps) => (
  <h1 className={styles.title} data-size={size}>
    {title}
    {subtitle && <span className={styles.subtitle}> {subtitle}</span>}
  </h1>
)
