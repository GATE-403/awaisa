import styles from './PageTitle.module.css'

interface PageTitleProps {
  title: string
  subtitle?: string
}

export const PageTitle = ({ title, subtitle }: PageTitleProps) => (
  <h1 className={styles.title}>
    {title}
    {subtitle && <span className={styles.subtitle}> {subtitle}</span>}
  </h1>
)
