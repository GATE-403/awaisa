import type { ComponentProps } from 'react'
import styles from './SectionCaption.module.css'

type CaptionTag = 'h2' | 'h3' | 'p' | 'legend' | 'span'

interface SectionCaptionProps extends Omit<ComponentProps<'h3'>, 'ref'> {
  as?: CaptionTag
  /** Over an inset group: 16pt in, in line with the rows' text (as in iOS Settings). */
  isInset?: boolean
}

// The small uppercase caption over a group — iOS Settings' section header. One look for sheets,
// the cabinet, the profile and the business page; a count or a link may sit inside it.
export const SectionCaption = ({
  as: Tag = 'h3',
  isInset = true,
  className,
  ...props
}: SectionCaptionProps) => (
  <Tag
    {...props}
    className={className ? `${styles.caption} ${className}` : styles.caption}
    data-inset={isInset || undefined}
  />
)
