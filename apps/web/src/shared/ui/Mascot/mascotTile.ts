import { MASCOT_PATH } from './Mascot'

// A tile for patterns of mascots (an empty cover, the «Мои бизнесы» head): the mascot twice per
// 96px tile, the second turned a little and set half a tile over, so the rows do not line up like
// wallpaper. Use it as a CSS mask (`mask-image: var(--mascot-tile)`) and colour it with the
// background under the mask.
export const MASCOT_TILE = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'>` +
    `<path transform='translate(12 10) scale(0.8)' fill-rule='evenodd' d='${MASCOT_PATH}'/>` +
    `<path transform='translate(60 58) rotate(-14 12 13) scale(0.8)' fill-rule='evenodd' d='${MASCOT_PATH}'/>` +
    '</svg>',
)}")`
