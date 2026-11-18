// CSS colours for WebGL: shaders take numbers, the app speaks tokens. A token (`--system-blue`)
// is read from the root's computed style; any other value (`#ff9500`, `oklch(…)`, `white`) passes
// as it is. The browser itself parses the colour by painting one pixel, so every CSS colour works.

type Rgb = [number, number, number]

let probe: CanvasRenderingContext2D | null = null

const resolveColor = (color: string) =>
  color.startsWith('--')
    ? getComputedStyle(document.documentElement).getPropertyValue(color).trim()
    : color

/** A CSS colour or token as 0–1 RGB (black when it cannot be read). */
const toRgb = (color: string): Rgb => {
  probe ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  if (!probe) return [0, 0, 0]
  probe.clearRect(0, 0, 1, 1)
  probe.fillStyle = '#000'
  probe.fillStyle = resolveColor(color)
  probe.fillRect(0, 0, 1, 1)
  const [red = 0, green = 0, blue = 0] = probe.getImageData(0, 0, 1, 1).data
  return [red / 255, green / 255, blue / 255]
}

export type { Rgb }
export { resolveColor, toRgb }
