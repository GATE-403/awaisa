import { Avatar as BaseAvatar } from '@base-ui/react/avatar'
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../utils/className'

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'

// Plain attributes (`data-*`, `aria-*`) reach the root, like any element's.
interface AvatarProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'className' | 'style'> {
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

// shadcn's avatar at the kit's sizes (32, 40, 56, 80). A person's own tint (the monogram colours
// in `style`) fills the fallback; without one it is shadcn's muted circle.
const Avatar = ({ name, src, size = 'md', className, style, fallback, ...props }: AvatarProps) => (
  <BaseAvatar.Root
    {...props}
    data-slot='avatar'
    data-size={size}
    data-tinted={style && '--system-monogram-from' in style ? '' : undefined}
    className={cn(
      'group/avatar relative flex size-10 shrink-0 rounded-full select-none after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken data-[size=sm]:size-8 data-[size=lg]:size-14 data-[size=xl]:size-20 dark:after:mix-blend-lighten',
      className,
    )}
    style={style}
  >
    {src && (
      <BaseAvatar.Image
        data-slot='avatar-image'
        src={src}
        alt={name}
        className='aspect-square size-full rounded-full object-cover'
      />
    )}
    <BaseAvatar.Fallback
      data-slot='avatar-fallback'
      className='flex size-full items-center justify-center overflow-hidden rounded-full bg-muted text-base text-muted-foreground group-data-tinted/avatar:bg-[linear-gradient(180deg,var(--system-monogram-from),var(--system-monogram-to))] group-data-tinted/avatar:text-white group-data-[size=sm]/avatar:text-xs group-data-[size=lg]/avatar:text-xl group-data-[size=xl]/avatar:text-3xl'
    >
      {fallback ?? getInitials(name)}
    </BaseAvatar.Fallback>
  </BaseAvatar.Root>
)

export type { AvatarProps, AvatarSize }
export { Avatar }
