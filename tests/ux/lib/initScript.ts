// Runs in the page before any of its scripts (page.addInitScript). It records what a person
// would notice over time — paint and long tasks for «time to interactive», messages that vanish
// on their own, text that changes by itself — and gives checks one way to describe an element.

type UxInit = { textVars: Record<string, string> }

const uxInitScript = ({ textVars }: UxInit) => {
  type Toast = {
    text: string
    hasAction: boolean
    addedAt: number
    removedAt: number | null
    /** Gone while nobody touched anything: it left on a timer. */
    leftOnItsOwn: boolean
  }
  type Churn = { element: Element; count: number }

  const store = {
    fcp: 0,
    lastLongTaskEnd: 0,
    longTasks: 0,
    lastInputAt: 0,
    toasts: [] as Toast[],
    churn: new Map<Element, Churn>(),
  }
  const tracked = new WeakMap<Element, Toast>()
  ;(window as unknown as { __ux: typeof store }).__ux = store

  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        store.longTasks += 1
        store.lastLongTaskEnd = Math.max(store.lastLongTaskEnd, entry.startTime + entry.duration)
      }
    }).observe({ type: 'longtask', buffered: true })
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        if (entry.name === 'first-contentful-paint') store.fcp = entry.startTime
    }).observe({ type: 'paint', buffered: true })
  } catch {
    // Older engines: timings stay at zero and the performance check says so.
  }

  // Filled in below, once `open` exists: a toast the person touched did not leave on its own.
  let markTouched: (target: EventTarget | null) => void = () => {}
  for (const type of ['keydown', 'pointerdown', 'input', 'wheel', 'touchstart'])
    window.addEventListener(
      type,
      (event) => {
        store.lastInputAt = performance.now()
        markTouched(type === 'keydown' ? document.activeElement : event.target)
      },
      { capture: true, passive: true },
    )

  // Hashed CSS-module classes (Lightning CSS: «vqWx5G_card») of the element and its ancestors;
  // the report maps the hash back to the .module.css file and its component.
  const moduleClasses = (element: Element) => {
    const out: string[] = []
    let node: Element | null = element
    for (let depth = 0; node && depth < 10; depth += 1, node = node.parentElement)
      for (const name of node.classList)
        if (/^[A-Za-z0-9_-]{6}_[A-Za-z][\w-]*$/.test(name) && !out.includes(name)) out.push(name)
    return out.slice(0, 8)
  }

  const shortSelector = (element: Element) => {
    const parts: string[] = []
    let node: Element | null = element
    for (let depth = 0; node && depth < 4 && node !== document.body; depth += 1) {
      let part = node.tagName.toLowerCase()
      if (node.id) {
        parts.unshift(`${part}#${node.id}`)
        break
      }
      const local = [...node.classList].find((name) => /^[A-Za-z0-9_-]{6}_/.test(name))
      if (local) part += `.${local}`
      parts.unshift(part)
      node = node.parentElement
    }
    return parts.join(' > ')
  }

  const accessibleName = (element: Element) => {
    const el = element as HTMLElement
    const label = el.getAttribute('aria-label')
    if (label) return label.trim()
    const labelledBy = el.getAttribute('aria-labelledby')
    if (labelledBy)
      return labelledBy
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent ?? '')
        .join(' ')
        .trim()
    const labels = (el as HTMLInputElement).labels
    if (labels?.length)
      return [...labels]
        .map((item) => item.textContent ?? '')
        .join(' ')
        .trim()
    return (el.textContent || el.getAttribute('title') || el.getAttribute('placeholder') || '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  let nextId = 0
  const describe = (element: Element) => {
    if (!element.getAttribute('data-ux-id')) element.setAttribute('data-ux-id', String(++nextId))
    return {
      id: element.getAttribute('data-ux-id') as string,
      selector: shortSelector(element),
      name: accessibleName(element).slice(0, 80),
      classes: moduleClasses(element),
    }
  }
  ;(window as unknown as Record<string, unknown>).__uxDescribe = describe
  ;(window as unknown as Record<string, unknown>).__uxName = accessibleName

  const liveRoot = (node: Node) =>
    node instanceof Element ? node.closest('[aria-live], [role="status"], [role="alert"]') : null

  const open: [Element, Toast][] = []
  const touched = new WeakSet<Toast>()
  markTouched = (target) => {
    if (!(target instanceof Node)) return
    for (const [element, toast] of open) if (element.contains(target)) touched.add(toast)
  }
  const track = (element: Element, now: number) => {
    if (tracked.has(element) || !element.textContent?.trim()) return
    for (let parent = element.parentElement; parent; parent = parent.parentElement)
      if (tracked.has(parent)) return
    const toast: Toast = {
      text: element.textContent.replace(/\s+/g, ' ').trim().slice(0, 120),
      hasAction: Boolean(element.querySelector('button:not([aria-label="Открыть"]), a[href]')),
      addedAt: now,
      removedAt: null,
      leftOnItsOwn: false,
    }
    tracked.set(element, toast)
    open.push([element, toast])
    store.toasts.push(toast)
  }

  const observe = () => {
    new MutationObserver((records) => {
      const now = performance.now()
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue
          // A message in a live region (toasts, alerts): added into one, or arriving with one.
          if (node.parentElement && liveRoot(node.parentElement)) track(node, now)
          const regions = node.matches('[aria-live], [role="status"], [role="alert"]')
            ? [node, ...node.querySelectorAll('[aria-live], [role="status"], [role="alert"]')]
            : [...node.querySelectorAll('[aria-live], [role="status"], [role="alert"]')]
          for (const region of regions) for (const child of region.children) track(child, now)
        }
        if (record.removedNodes.length)
          for (const [element, toast] of open)
            if (toast.removedAt === null && !element.isConnected) {
              toast.removedAt = now
              toast.leftOnItsOwn = !touched.has(toast)
            }
        // Content replaced while nobody touched anything: rotating hints, tickers.
        if (
          record.type === 'childList' &&
          record.target instanceof Element &&
          record.addedNodes.length > 0 &&
          record.removedNodes.length > 0 &&
          now - store.lastInputAt > 1500 &&
          !liveRoot(record.target)
        ) {
          const entry = store.churn.get(record.target) ?? { element: record.target, count: 0 }
          entry.count += 1
          store.churn.set(record.target, entry)
        }
      }
    }).observe(document, { childList: true, subtree: true })
  }
  observe()

  // System «large text»: every font-size and line-height token scaled, like Android's textZoom.
  const vars = Object.entries(textVars)
  if (vars.length) {
    const css = `:root:root{${vars.map(([name, value]) => `${name}:${value} !important`).join(';')}}`
    const inject = () => {
      if (document.getElementById('ux-text-scale')) return
      const style = document.createElement('style')
      style.id = 'ux-text-scale'
      style.textContent = css
      ;(document.head ?? document.documentElement).append(style)
    }
    if (document.documentElement) inject()
    document.addEventListener('DOMContentLoaded', inject)
  }
}

export type { UxInit }
export { uxInitScript }
