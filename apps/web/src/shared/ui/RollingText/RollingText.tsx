import type { CSSProperties } from 'react'
import styles from './RollingText.module.css'

interface RollingTextProps {
  /** The text to show («1 500 сом»): its digits roll to their new value, the rest stays put. */
  text: string
  className?: string
}

// A price that rolls like an odometer when it changes (an add-on, a discount): each digit is a
// column whose strip of 0–9 (drawn by CSS, so it is not in the text) slides to its value, and only
// the digits that change move. Columns are keyed from the right, so units stay units when the
// number grows a digit. The text itself stays in the DOM, transparent, for reading and for tests.
export const RollingText = ({ text, className }: RollingTextProps) => {
  const chars = [...text]

  return (
    <span className={className ? `${styles.root} ${className}` : styles.root}>
      {chars.map((char, index) => {
        const key = chars.length - index
        const digit = Number.parseInt(char, 10)
        if (Number.isNaN(digit)) {
          return (
            <span key={`c${key}`} className={styles.char}>
              {char}
            </span>
          )
        }

        return (
          <span
            key={`d${key}`}
            className={styles.digit}
            style={{ '--digit': digit } as CSSProperties}
          >
            {char}
          </span>
        )
      })}
    </span>
  )
}
