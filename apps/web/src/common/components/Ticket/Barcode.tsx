import styles from './Ticket.module.css'

interface BarcodeProps {
  value: string
}

const BAR_COUNT = 46
const VIEW_HEIGHT = 40

const getBars = (value: string) => {
  const bars: { x: number; width: number }[] = []
  let x = 0
  let seed = [...value].reduce((hash, char) => (hash * 33 + char.charCodeAt(0)) >>> 0, 5381)

  for (let index = 0; index < BAR_COUNT; index += 1) {
    seed = (seed * 1103515245 + 12345) >>> 0
    const width = (seed % 3) + 1
    const gap = ((seed >> 4) % 2) + 1
    bars.push({ x, width })
    x += width + gap
  }

  return { bars, totalWidth: x }
}

export const Barcode = ({ value }: BarcodeProps) => {
  const { bars, totalWidth } = getBars(value)

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${VIEW_HEIGHT}`}
      preserveAspectRatio='none'
      className={styles.barcode}
      aria-hidden='true'
    >
      {bars.map((bar) => (
        <rect key={bar.x} x={bar.x} width={bar.width} height={VIEW_HEIGHT} fill='currentColor' />
      ))}
    </svg>
  )
}
