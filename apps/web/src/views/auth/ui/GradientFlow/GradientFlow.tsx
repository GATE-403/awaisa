'use client'

import { useEffect, useRef } from 'react'
import { FLOW_FRAGMENT } from './flowShader'
import styles from './GradientFlow.module.css'
import { runShader, type ShaderHandle } from './shaderCanvas'

interface GradientFlowProps {
  /** How far the prism is turned: one step per sign-in step, so each step moves the light. */
  turn?: number
  /** 0…1: the beam flares over the screen (signed in), the source of the closing wave. */
  flare?: number
}

// The sign-in's light behind the whole screen, drawn by a shader; paused off screen, one still
// frame under reduced motion, a CSS fallback without WebGL.
export const GradientFlow = ({ turn = 0, flare = 0 }: GradientFlowProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const handleRef = useRef<ShaderHandle | null>(null)
  // The latest values, so a shader restarted after being off screen starts where the page is.
  const paramsRef = useRef({ k: turn, f: flare })
  paramsRef.current = { k: turn, f: flare }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const isStill = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && !handleRef.current) {
        handleRef.current = runShader(
          canvas,
          FLOW_FRAGMENT,
          {},
          {
            isStill,
            followsPointer: true,
            params: paramsRef.current,
          },
        )
      }
      if (!entry?.isIntersecting && handleRef.current) {
        handleRef.current.stop()
        handleRef.current = null
      }
    })
    observer.observe(canvas)

    return () => {
      observer.disconnect()
      handleRef.current?.stop()
      handleRef.current = null
    }
  }, [])

  useEffect(() => {
    handleRef.current?.set('k', turn)
  }, [turn])

  useEffect(() => {
    handleRef.current?.set('f', flare)
  }, [flare])

  return (
    <div className={styles.flow} aria-hidden='true'>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  )
}
