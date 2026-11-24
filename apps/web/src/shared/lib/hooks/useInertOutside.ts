'use client'

import { type RefObject, useEffect } from 'react'

// A full-screen layer over the site (the booking sheet) keeps the keyboard and screen readers
// inside it: everything around it, up to <body>, is inert while it is on screen — Tab used to
// walk into the dimmed header behind the scrim. Live regions (toasts) and elements marked
// `data-keep-interactive` (the scrim that closes the layer) stay usable. An effect, like
// `usePageScrollLock`: React Activity runs the cleanup when it hides the route.
// `delayMs` waits for a layer that slides in: making the page inert restyles all of it, which on a
// phone cost frames of the slide.
const DIALOGS = '[role="dialog"], [role="alertdialog"]'

export const useInertOutside = (ref: RefObject<HTMLElement | null>, key?: unknown, delayMs = 0) => {
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` re-runs it when the layer's element is replaced
  useEffect(() => {
    const layer = ref.current
    if (!layer) return
    const made: HTMLElement[] = []
    const makeInert = () => {
      for (let node: HTMLElement | null = layer; node && node !== document.body; ) {
        const parent: HTMLElement | null = node.parentElement
        if (!parent) break
        for (const sibling of parent.children) {
          if (sibling === node || !(sibling instanceof HTMLElement) || sibling.inert) continue
          if (sibling.matches('script, style, [data-keep-interactive], [aria-live]')) continue
          if (sibling.querySelector('[aria-live]')) continue
          // A dialog opened from inside the layer while the delay ran (the waitlist sheet over the
          // booking sheet, portalled into <body>) lies above it: made inert with the page, it never
          // answered a tap again. The page itself is walked only now, since it may stream in later.
          if (sibling.matches(DIALOGS) || sibling.querySelector(DIALOGS)) continue
          sibling.inert = true
          made.push(sibling)
        }
        node = parent
      }
    }
    const timer = delayMs ? window.setTimeout(makeInert, delayMs) : 0
    if (!delayMs) makeInert()

    return () => {
      window.clearTimeout(timer)
      for (const element of made) element.inert = false
    }
  }, [ref, key, delayMs])
}
