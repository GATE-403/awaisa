import type { ReactNode } from 'react'
import styles from './ProfileHead.module.css'

interface ProfileHeadProps {
  /** The face: a `PersonAvatar` (or a button holding one); it is drawn 80pt. */
  face: ReactNode
  /** The words beside it: `ProfileHeadText`, or a link around it. */
  children: ReactNode
  /** What closes the row on the right: actions, a gear. */
  end?: ReactNode
  className?: string
}

interface ProfileHeadTextProps {
  name: string
  /** The status emoji, beside the name (a lone emoji on its own line read as noise). */
  emoji?: string
  /** One quiet line: «Уровень 4 · 17 визитов · 11 мест». */
  meta?: ReactNode
  /** The page's title on the profile itself; a plain line elsewhere. */
  isHeading?: boolean
  /** Lines under the meta (a note that the profile is hidden, «о себе» in a preview). */
  children?: ReactNode
}

// A person's head in one look everywhere - the profile, its preview in «Оформление» and the
// account row on «Записи» («оставь один дизайн и вынеси в компоненты»): the face on the left, the
// name with the status emoji and one quiet line of facts to its right, like a contact row.
export const ProfileHead = ({ face, children, end, className }: ProfileHeadProps) => (
  <div className={className ? `${styles.head} ${className}` : styles.head}>
    <span className={styles.face}>{face}</span>
    <div className={styles.text}>{children}</div>
    {end}
  </div>
)

export const ProfileHeadText = ({
  name,
  emoji,
  meta,
  isHeading = false,
  children,
}: ProfileHeadTextProps) => {
  const Name = isHeading ? 'h1' : 'p'
  return (
    <>
      <Name className={styles.name}>
        {name}
        {emoji && <span className={styles.emoji}> {emoji}</span>}
      </Name>
      {meta && <p className={styles.meta}>{meta}</p>}
      {children}
    </>
  )
}
