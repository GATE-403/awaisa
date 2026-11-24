// A feature spans two columns: the whole width on phones, two of three or four further up.
const BIG_TILE_IMAGE = {
  sizes: '(max-width: 767px) 100vw, (max-width: 1099px) 66vw, 600px',
  widths: [360, 480, 640, 840, 1280],
}

// How long a tap on a work waits for a second one (a like) before it opens «Looks»: the deck's.
const DOUBLE_TAP_MS = 300

export { BIG_TILE_IMAGE, DOUBLE_TAP_MS }
