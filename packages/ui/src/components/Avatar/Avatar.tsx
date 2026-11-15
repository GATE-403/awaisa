import { Avatar as BaseAvatar } from '@base-ui/react/avatar'
import type { CSSProperties, ReactNode } from 'react'
import { cx } from '../../utils/className'
import styles from './Avatar.module.css'

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'

interface AvatarProps {
  name: string
  src?: string
  size?: AvatarSize
  className?: string
  /** E.g. the person's own monogram tint (`--system-monogram-from` / `-to`). */
  style?: CSSProperties
  /** Drawn when there is no photo (an app's mascot); the initials of the name otherwise. */
  fallback?: ReactNode
}

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

const Avatar = ({ name, src, size = 'md', className, style, fallback }: AvatarProps) => (
  <BaseAvatar.Root data-size={size} className={cx(styles.root, className)} style={style}>
    {src && <BaseAvatar.Image src={src} alt={name} className={styles.image} />}
    <BaseAvatar.Fallback className={styles.fallback}>
      {fallback ?? getInitials(name)}
    </BaseAvatar.Fallback>
  </BaseAvatar.Root>
)

export type { AvatarProps, AvatarSize }
export { Avatar }
