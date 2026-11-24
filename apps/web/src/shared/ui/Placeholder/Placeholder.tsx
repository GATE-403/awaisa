import type { CSSProperties } from 'react'
import styles from './Placeholder.module.css'

interface TextLineProps {
  /** How long the line is, in characters of the text it stands for. */
  chars: number
  className?: string
}

// A bar sized to the font it sits in: put it inside the real heading or paragraph class, and the
// line keeps the height the text will have, so nothing moves when the text arrives.
const TextLine = ({ chars, className }: TextLineProps) => (
  <span
    aria-hidden='true'
    className={[styles.line, className].filter(Boolean).join(' ')}
    style={{ '--chars': chars } as CSSProperties}
  >
    {/* A zero-width space gives the bar a real line box, also inside flex rows. */}
    {'\u200b'}
  </span>
)

interface PictureProps {
  className?: string
}

// A picture still on its way: the frame's quiet fill with the mascot in the middle (the
// `data-picture-frame` rule in shell.css), breathing like the other placeholders.
const Picture = ({ className }: PictureProps) => (
  <span
    aria-hidden='true'
    data-picture-frame=''
    className={[styles.picture, className].filter(Boolean).join(' ')}
  />
)

interface BlockProps {
  className?: string
  style?: CSSProperties
}

// Any other shape - a capsule, a circle, a card - sized by the class given.
const Block = ({ className, style }: BlockProps) => (
  <span
    aria-hidden='true'
    className={[styles.block, className].filter(Boolean).join(' ')}
    style={style}
  />
)

export { Block, Picture, TextLine }
