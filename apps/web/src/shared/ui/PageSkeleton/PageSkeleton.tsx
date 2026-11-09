import { Skeleton } from '@awaisa/ui/Skeleton'
import { Container } from '@/shared/ui/Container/Container'
import styles from './PageSkeleton.module.css'

export const PageSkeleton = () => (
  <Container className={styles.page} aria-busy='true'>
    <Skeleton className={styles.title} />
    <Skeleton className={styles.block} />
  </Container>
)
