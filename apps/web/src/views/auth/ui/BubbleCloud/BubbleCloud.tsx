import type { CSSProperties } from 'react'
import { sizedImage } from '@/shared/lib/imageSizes'
import { Mascot } from '@/shared/ui/Mascot/Mascot'
import styles from './BubbleCloud.module.css'

interface BubbleCloudProps {
  /** Work photos from «Образы»; until they arrive (or without any) the bubbles are tints. */
  pictures: string[]
}

// Where each bubble sits in the cloud (% of the box) and how big it is (px); the mascot holds
// the middle. Drawn once, so the cloud keeps its shape on every screen.
const BUBBLES = [
  { x: 6, y: 40, size: 76 },
  { x: 22, y: 16, size: 92 },
  { x: 44, y: 6, size: 70 },
  { x: 64, y: 14, size: 98 },
  { x: 88, y: 34, size: 74 },
  { x: 14, y: 70, size: 84 },
  { x: 36, y: 50, size: 104 },
  { x: 66, y: 56, size: 112 },
  { x: 90, y: 76, size: 70 },
]

const TINTS = [
  'var(--color-primary)',
  'var(--color-rating)',
  'var(--color-success)',
  'var(--color-highlight)',
  'var(--color-danger)',
]

const BUBBLE_PX = 112

// The sign-in screen's hero: finished work as glossy round pictures around the mascot — what
// the app is for, before a word is read.
export const BubbleCloud = ({ pictures }: BubbleCloudProps) => (
  <div className={styles.cloud} aria-hidden='true'>
    {BUBBLES.map((bubble, index) => {
      const picture = pictures[index]
      const style = {
        '--x': `${bubble.x}%`,
        '--y': `${bubble.y}%`,
        '--size': `${bubble.size}px`,
        '--tint': TINTS[index % TINTS.length],
        '--delay': `${(index % 4) * -1.3}s`,
      } as CSSProperties

      return (
        <span key={bubble.x * 100 + bubble.y} className={styles.bubble} style={style}>
          {picture && (
            // biome-ignore lint/performance/noImgElement: hotlinked CDN pictures, sized by sizedImage
            <img {...sizedImage(picture, BUBBLE_PX)} alt='' className={styles.picture} />
          )}
        </span>
      )
    })}
    <span className={styles.mascot}>
      <Mascot />
    </span>
  </div>
)
