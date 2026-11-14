// Pictures hotlinked from an image CDN (the demo photos come from Unsplash) can be asked for at
// the size they are shown: a 170px card should not decode a 1600px cover on a phone.
const RESIZABLE_HOSTS = ['images.unsplash.com']

const resize = (url: string, width: number) => {
  try {
    const parsed = new URL(url)
    if (!RESIZABLE_HOSTS.includes(parsed.hostname)) return url
    const originalWidth = Number(parsed.searchParams.get('w'))
    const originalHeight = Number(parsed.searchParams.get('h'))
    parsed.searchParams.set('w', String(width))
    if (originalWidth && originalHeight) {
      parsed.searchParams.set('h', String(Math.round((originalHeight / originalWidth) * width)))
    }
    return parsed.toString()
  } catch {
    // Our own relative /api/media URLs are already resized when uploaded.
    return url
  }
}

/** `src` and a 1x/2x `srcSet` for a picture shown `width` CSS pixels wide. */
const sizedImage = (url: string, width: number) => {
  const small = resize(url, width)
  if (small === url) return { src: url }
  return { src: small, srcSet: `${small} 1x, ${resize(url, width * 2)} 2x` }
}

/** A full-width picture: candidates by width so a phone takes ~800px, a desktop 1600px. */
const fluidImage = (url: string, widths = [640, 960, 1280, 1600]) => {
  const first = resize(url, widths[0] ?? 640)
  if (first === url) return { src: url }
  return {
    src: resize(url, widths.at(-1) ?? 1600),
    srcSet: widths.map((width) => `${resize(url, width)} ${width}w`).join(', '),
    sizes: '100vw',
  }
}

const GRID_WIDTHS = [240, 360, 480, 640, 840]

/**
 * A catalog card's picture: candidates by width and the grid's own column sizes (2 / 3 / 4
 * columns), so a phone with a dense screen takes ~480px for a 180px card instead of 840px.
 */
const gridImage = (url: string) => {
  const first = resize(url, GRID_WIDTHS[0] ?? 240)
  if (first === url) return { src: url }
  return {
    src: resize(url, 480),
    srcSet: GRID_WIDTHS.map((width) => `${resize(url, width)} ${width}w`).join(', '),
    sizes: '(max-width: 767px) 50vw, (max-width: 1099px) 33vw, 300px',
  }
}

export { fluidImage, gridImage, sizedImage }
