import { Skeleton } from '@awaisa/ui/Skeleton'
import styles from './Shelf.module.css'

interface ShelfSkeletonProps {
  count?: number
  height?: number
}

export const ShelfSkeleton = ({ count = 4, height = 140 }: ShelfSkeletonProps) => (
  <div className={styles.shelf} data-columns={4} aria-hidden>
    {Array.from({ length: count }, (_, index) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders never reorder
      <Skeleton key={index} style={{ height }} />
    ))}
  </div>
)
