'use client'

import { type RefObject, useEffect } from 'react'

const DURATION = 560
// The step a radio belongs to (its `name`) is the stack card it lands on.
const STEPS = ['service', 'specialist']

const ease = (progress: number) => 1 - (1 - progress) ** 3
const lerp = (from: number, to: number, progress: number) => from + (to - from) * progress

// The picked card's picture flies into the stack card it becomes: a tap on a service or a master
// sends a copy of its photo (or face) from where it was to the small square on the new front
// card, so the eye follows the choice instead of watching one card vanish and another appear.
// The square is followed every frame: the card lands from below and the sheet scrolls to its top
// meanwhile. The copy is a fixed clone above the sheet; the square stays hidden until it arrives.
export const useCardFlight = (ref: RefObject<HTMLElement | null>) => {
  useEffect(() => {
    const screen = ref.current
    if (!screen || matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // On `click`, caught on the way down: React picks the radio on the click and redraws the
    // step at once, so by the native `change` the card is gone from the page.
    const handleClick = (event: Event) => {
      const input = event.target
      if (!(input instanceof HTMLInputElement) || input.type !== 'radio' || !input.checked) return
      if (!STEPS.includes(input.name)) return
      const card = input.closest('label')
      const source = card?.querySelector<HTMLElement>('[data-card-media]') ?? card
      if (!source) return
      fly(screen, source, input.name)
    }

    screen.addEventListener('click', handleClick, true)
    return () => screen.removeEventListener('click', handleClick, true)
  }, [ref])
}

const fly = (screen: HTMLElement, source: HTMLElement, step: string) => {
  const from = source.getBoundingClientRect()
  if (!from.width || !from.height) return
  const fromRadius = Number.parseFloat(getComputedStyle(source).borderRadius) || 12
  const clone = source.cloneNode(true) as HTMLElement
  for (const control of clone.querySelectorAll('input, button')) control.remove()
  Object.assign(clone.style, {
    position: 'fixed',
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    margin: '0',
    zIndex: '61',
    objectFit: 'cover',
    overflow: 'hidden',
    borderRadius: `${fromRadius}px`,
    pointerEvents: 'none',
    transition: 'none',
    animation: 'none',
    willChange: 'left, top, width, height',
  })
  clone.setAttribute('aria-hidden', 'true')
  document.body.append(clone)

  let target: HTMLElement | null = null
  const start = performance.now()
  const finish = () => {
    clone.remove()
    if (target) target.style.visibility = ''
  }

  const frame = (now: number) => {
    if (!target) {
      target = screen.querySelector<HTMLElement>(`[data-flight-target="${step}"]`)
      if (target) target.style.visibility = 'hidden'
    }
    const progress = Math.min(1, (now - start) / DURATION)
    const to = target?.getBoundingClientRect()
    if (!to || progress >= 1) {
      // No square to land on yet: keep the copy in place a moment, then let it go.
      if (progress >= 1) finish()
      else requestAnimationFrame(frame)
      return
    }
    const eased = ease(progress)
    const toRadius = Number.parseFloat(getComputedStyle(target as HTMLElement).borderRadius) || 12
    Object.assign(clone.style, {
      left: `${lerp(from.left, to.left, eased)}px`,
      top: `${lerp(from.top, to.top, eased)}px`,
      width: `${lerp(from.width, to.width, eased)}px`,
      height: `${lerp(from.height, to.height, eased)}px`,
      borderRadius: `${lerp(fromRadius, toRadius, eased)}px`,
    })
    requestAnimationFrame(frame)
  }

  requestAnimationFrame(frame)
  // A page that draws no frames (hidden, throttled) never leaves a copy behind.
  window.setTimeout(finish, DURATION + 400)
}
