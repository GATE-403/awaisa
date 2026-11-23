import type { IconProps } from '@phosphor-icons/react'
import { forwardRef, useId } from 'react'

// «Образы»: a hand of cards, three fanned out to one side from a point at the bottom left like
// cards held in a hand («как стопка карт на руках»; a symmetric fan read as a phone in the
// middle). Drawn in Phosphor's own grid (256, a 16-wide round stroke), so it sits with the other
// glyphs and takes the same props: `weight` `fill` for the chosen tab fills the front card. Each
// card hides the lines of the ones behind it (masks), so no line crosses a card in front.
const CARD = { x: 96, y: 96, width: 96, height: 144, rx: 16 }
const PIVOT = '120 240'
/** Back to front. */
const ANGLES = [-48, -18, 12]
/** Centres the fan in the 256 grid, as large as the other glyphs (16–240). */
const SHIFT = 'translate(19 -41)'

/** Phosphor's stroke per weight in its 256 grid, so «light» reads like its neighbours. */
const STROKES: Record<string, number> = { thin: 8, light: 12, regular: 16, bold: 24 }

const at = (angle: number) => `rotate(${angle} ${PIVOT})`

export const FanCardsIcon = forwardRef<SVGSVGElement, IconProps>(
  (
    { weight = 'regular', size = '1em', color = 'currentColor', mirrored, children, ...props },
    ref,
  ) => {
    const id = useId()
    const isFilled = weight === 'fill'

    return (
      <svg
        ref={ref}
        xmlns='http://www.w3.org/2000/svg'
        width={size}
        height={size}
        viewBox='0 0 256 256'
        fill='none'
        stroke={color}
        strokeWidth={STROKES[weight] ?? 16}
        strokeLinecap='round'
        strokeLinejoin='round'
        transform={mirrored ? 'scale(-1, 1)' : undefined}
        aria-hidden='true'
        {...props}
      >
        {children}
        <g transform={SHIFT}>
          {ANGLES.slice(0, -1).map((angle, index) => (
            <mask
              key={angle}
              id={`${id}-${index}`}
              maskUnits='userSpaceOnUse'
              x='-64'
              y='-64'
              width='384'
              height='384'
            >
              <rect x='-64' y='-64' width='384' height='384' fill='white' stroke='none' />
              {/* Every card in front of this one, with a stroke's gap around it. */}
              {ANGLES.slice(index + 1).map((front) => (
                <rect
                  key={front}
                  {...CARD}
                  transform={at(front)}
                  fill='black'
                  stroke='black'
                  strokeWidth={30}
                />
              ))}
            </mask>
          ))}
          {ANGLES.map((angle, index) =>
            index < ANGLES.length - 1 ? (
              // The mask on a wrapper: on the rotated card itself it turned with the card.
              <g key={angle} mask={`url(#${id}-${index})`}>
                <rect {...CARD} transform={at(angle)} />
              </g>
            ) : (
              <rect key={angle} {...CARD} transform={at(angle)} fill={isFilled ? color : 'none'} />
            ),
          )}
        </g>
      </svg>
    )
  },
)

FanCardsIcon.displayName = 'FanCardsIcon'
