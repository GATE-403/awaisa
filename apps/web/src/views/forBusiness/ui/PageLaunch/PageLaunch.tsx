'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { BusinessTile, pickTint } from '@/entities/business'
import { useT } from '@/shared/i18n'
import { LightWave } from '@/shared/ui/LightWave/LightWave'
import styles from './PageLaunch.module.css'

interface PageLaunchProps {
  name: string
  slug: string
  /** Called once the moment has passed: open the new page's cabinet. */
  onDone: () => void
}

const LEAVE_AFTER_WAVE = 2600
const LEAVE_QUICKLY = 900
/** Where the tile sits in the scene: the wave starts from it. */
const ORIGIN = { x: 0.5, y: 0.42 }

// The page going live is a moment of its own, like signing in or «Вы записаны»: the screen sinks
// into a dark scene, the place's tile lights up, a wave of light in the place's colour and the
// spectrum runs out from it, then the name rises with a glint over «Страница готова».
export const PageLaunch = ({ name, slug, onDone }: PageLaunchProps) => {
  const t = useT()
  const onDoneRef = useRef(onDone)
  const tint = pickTint(name)

  useEffect(() => {
    onDoneRef.current = onDone
  })

  useEffect(() => {
    const isCalm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const leave = window.setTimeout(
      () => onDoneRef.current(),
      isCalm ? LEAVE_QUICKLY : LEAVE_AFTER_WAVE,
    )
    return () => window.clearTimeout(leave)
  }, [])

  // On the body: the form's page is its own stacking context (the colour wash), which kept the
  // scene under the site header and footer.
  return createPortal(
    <output className={styles.scene} aria-live='polite' data-scene='dark'>
      <LightWave
        origin={ORIGIN}
        colors={[tint, 'var(--system-cyan)', 'var(--system-purple)', 'var(--system-pink)']}
        duration={1800}
        intensity={1.1}
        afterglow
      />
      <span className={styles.body}>
        <BusinessTile name={name} size='lg' className={styles.tile} />
        <span className={styles.name}>{name}</span>
        <span className={styles.note}>
          {t('Страница готова')} · awaisa.kg/{slug}
        </span>
      </span>
    </output>,
    document.body,
  )
}
