'use client'

import { type ComponentProps, useId } from 'react'
import styles from './LiveMascot.module.css'
import { MASCOT_PATH } from './Mascot'

interface LiveMascotProps extends ComponentProps<'svg'> {}

/** The body alone: the mascot's outline without its eye holes. */
const BODY_PATH = `${MASCOT_PATH.slice(0, MASCOT_PATH.indexOf('Z') + 1)}`

// The mascot that lives where a place is empty: it hops in, blinks a few times, glances aside and
// jumps when pointed at or tapped. The eyes are a mask over the body (in `Mascot` they are holes
// cut into one path), so they can close and move on their own. Every loop is short and finite (no
// endless animation on a page), and under reduced motion it stands still like `Mascot`.
export const LiveMascot = ({ className, ...props }: LiveMascotProps) => {
  const maskId = useId()

  return (
    <svg
      viewBox='0 0 30 32'
      fill='currentColor'
      aria-hidden='true'
      className={className ? `${styles.mascot} ${className}` : styles.mascot}
      {...props}
    >
      <mask id={maskId} maskUnits='userSpaceOnUse' x='0' y='0' width='30' height='32'>
        <path d={BODY_PATH} fill='white' />
        <g className={styles.eyes}>
          <ellipse className={styles.eye} cx='15.94' cy='14.59' rx='3.08' ry='4.2' fill='black' />
          <ellipse className={styles.eye} cx='24.65' cy='14.59' rx='3.08' ry='4.2' fill='black' />
        </g>
      </mask>
      <g className={styles.body}>
        <rect width='30' height='32' mask={`url(#${maskId})`} />
      </g>
    </svg>
  )
}
