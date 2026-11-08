import { Avatar as BaseAvatar } from '@base-ui/react/avatar'
import { cx } from '../../utils/className'
import styles from './Avatar.module.css'

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'

interface AvatarProps {
  name: string
  src?: string
  size?: AvatarSize
  className?: string
}

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

const Avatar = ({ name, src, size = 'md', className }: AvatarProps) => (
  <BaseAvatar.Root data-size={size} className={cx(styles.root, className)}>
    {src && <BaseAvatar.Image src={src} alt={name} className={styles.image} />}
    <BaseAvatar.Fallback className={styles.fallback}>{getInitials(name)}</BaseAvatar.Fallback>
  </BaseAvatar.Root>
)

export type { AvatarProps, AvatarSize }
export { Avatar }
