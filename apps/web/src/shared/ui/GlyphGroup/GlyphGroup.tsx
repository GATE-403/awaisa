import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './GlyphGroup.module.css'

interface GlyphGroupProps {
  children: ReactNode
  label?: string
}

interface GlyphButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** The glyph (a Phosphor icon in its regular weight). */
  icon: ReactNode
  /** Said by screen readers and shown as a tooltip. */
  label: string
  /** Folded away (and out of reach) until it is wanted; it unfolds smoothly when it comes. */
  isHidden?: boolean
}

// One fill capsule of thin glyph buttons, like the cabinet toolbar's (a macOS 26 toolbar group):
// for a few secondary actions beside one primary button. Any button inside — a menu's trigger
// too — takes the glyph look.
export const GlyphGroup = ({ children, label }: GlyphGroupProps) => (
  // biome-ignore lint/a11y/useSemanticElements: a fieldset would add a legend for three buttons.
  <span className={styles.group} role='group' aria-label={label}>
    {children}
  </span>
)

export const GlyphButton = ({
  icon,
  label,
  isHidden,
  type = 'button',
  ...props
}: GlyphButtonProps) => (
  <button
    type={type}
    aria-label={label}
    title={label}
    data-hidden={isHidden || undefined}
    inert={isHidden}
    {...props}
  >
    {icon}
  </button>
)
