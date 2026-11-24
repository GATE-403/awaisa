import type { MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import type { CSSProperties, ReactNode } from 'react'
import { useId } from 'react'
import styles from './Wreath.module.css'

type Rank = 1 | 2 | 3

// Gold, silver and bronze, each as a light-to-deep gradient so the leaves read as metal.
const METAL: Record<Rank, { light: string; deep: string; label: MessageDescriptor }> = {
  1: { light: '#ffe08a', deep: '#c8921a', label: msg`First place` },
  2: { light: '#f1f3f6', deep: '#9aa1ab', label: msg`Second place` },
  3: { light: '#f3b98a', deep: '#a0582a', label: msg`Third place` },
}

const LEAVES = 9

// One branch of laurel: leaves along an arc from the bottom up the left side, each turned along
// the arc and tilted outward; the right branch is its mirror.
const branch = () =>
  Array.from({ length: LEAVES }, (_, index) => {
    const t = index / (LEAVES - 1)
    const angle = (100 + t * 125) * (Math.PI / 180)
    const radius = 45
    const x = 50 + radius * Math.cos(angle)
    const y = 50 + radius * Math.sin(angle)
    const rotation = (angle * 180) / Math.PI + 90 - 28
    const size = 1 - t * 0.35
    return { x, y, rotation, rx: 3.4 * size, ry: 7.2 * size }
  })

const LEAF_POSITIONS = branch()

interface WreathProps {
  rank: Rank
  children: ReactNode
  /** Show the place number under the face (off in tight spots like review threads). */
  hasNumber?: boolean
  className?: string
}

/** An emperor's laurel wreath around a face, for the top three masters and clients. */
export const Wreath = ({ rank, children, hasNumber = true, className }: WreathProps) => {
  const { t } = useLingui()
  const id = useId()
  const metal = METAL[rank]
  const place = t(metal.label)

  return (
    <span
      className={className ? `${styles.wrap} ${className}` : styles.wrap}
      style={{ '--metal-deep': metal.deep } as CSSProperties}
      title={t`${place} on Awaisa`}
    >
      {children}
      <svg className={styles.laurel} viewBox='0 0 100 100' aria-hidden='true'>
        <defs>
          <linearGradient id={`${id}-metal`} x1='0' y1='0' x2='0' y2='1'>
            <stop offset='0%' stopColor={metal.light} />
            <stop offset='100%' stopColor={metal.deep} />
          </linearGradient>
        </defs>
        {[1, -1].map((side) => (
          <g key={side} transform={side === -1 ? 'translate(100 0) scale(-1 1)' : undefined}>
            <path
              d='M 47 96 A 46 46 0 0 1 12 28'
              fill='none'
              stroke={`url(#${id}-metal)`}
              strokeWidth='1.4'
              strokeLinecap='round'
            />
            {LEAF_POSITIONS.map((leaf) => (
              <ellipse
                key={`${leaf.x}-${leaf.y}`}
                cx={leaf.x}
                cy={leaf.y}
                rx={leaf.rx}
                ry={leaf.ry}
                transform={`rotate(${leaf.rotation} ${leaf.x} ${leaf.y})`}
                fill={`url(#${id}-metal)`}
              />
            ))}
          </g>
        ))}
      </svg>
      {hasNumber && (
        <span
          className={styles.number}
          style={{ background: `linear-gradient(${metal.light}, ${metal.deep})` }}
        >
          {rank}
        </span>
      )}
      <span className={styles.srOnly}>{place}</span>
    </span>
  )
}

interface WreathBadgeProps {
  rank: Rank
  className?: string
}

/** A small laurel emblem with the place inside, for picture cards where a frame would not fit. */
export const WreathBadge = ({ rank, className }: WreathBadgeProps) => (
  <span className={className ? `${styles.badge} ${className}` : styles.badge}>
    <Wreath rank={rank} hasNumber={false}>
      <span className={styles.badgeNumber}>{rank}</span>
    </Wreath>
  </span>
)
