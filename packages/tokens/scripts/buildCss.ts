import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {
  blur,
  type ColorScheme,
  colors,
  controlHeight,
  duration,
  easing,
  fontFamily,
  fontWeight,
  layout,
  letterSpacing,
  radius,
  shadow,
  spacing,
  systemColors,
  text,
} from '../src/index.ts'

const OUTPUT_FILE = join(import.meta.dirname, '../dist/tokens.css')

const toKebabCase = (value: string) => value.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)

const toVariables = (prefix: string, values: Record<string, string | number>, unit = '') =>
  Object.entries(values).map(([key, value]) => {
    const cssValue = typeof value === 'number' && value !== 0 ? `${value}${unit}` : value
    return `  --${prefix}-${toKebabCase(key)}: ${cssValue};`
  })

// Type in rem (16px = 1rem): the same sizes at the default, but the browser's own «font size»
// setting (and zoom-free large text) now reaches the text. Line heights follow in rem too, or
// larger letters would overlap their lines.
const toRem = (px: number) => `${Number((px / 16).toFixed(4))}rem`

const toTextVariables = () =>
  Object.entries(text).flatMap(([key, { size, lineHeight }]) => [
    `  --text-${key}: ${toRem(size)};`,
    `  --text-${key}-line-height: ${toRem(lineHeight)};`,
  ])

const toColorVariables = (scheme: ColorScheme) => toVariables('color', scheme)

const block = (selector: string, lines: string[]) => `${selector} {\n${lines.join('\n')}\n}`

// As specific as the theme blocks, and later, so it wins in either theme.
const A11Y_ROOT = ":root, :root[data-theme], :root:not([data-theme='light'])"

const css = [
  block(':root', [
    '  color-scheme: light;',
    ...toColorVariables(colors.light),
    ...toVariables('system', systemColors.light),
    ...toVariables('space', spacing, 'px'),
    ...toVariables('radius', radius, 'px'),
    ...toVariables('font', fontFamily),
    ...toTextVariables(),
    ...toVariables('font-weight', fontWeight),
    ...toVariables('tracking', letterSpacing),
    ...toVariables('control-height', controlHeight, 'px'),
    ...toVariables('shadow', shadow),
    ...toVariables('duration', duration, 'ms'),
    ...toVariables('ease', easing),
    ...toVariables('blur', blur),
    ...toVariables('layout', layout, 'px'),
    '  --focus-ring: 0 0 0 3px var(--color-ring);',
  ]),
  `@media (prefers-color-scheme: dark) {\n${block(":root:not([data-theme='light'])", [
    '  color-scheme: dark;',
    ...toColorVariables(colors.dark),
    ...toVariables('system', systemColors.dark),
  ])}\n}`,
  block(":root[data-theme='dark']", [
    '  color-scheme: dark;',
    ...toColorVariables(colors.dark),
    ...toVariables('system', systemColors.dark),
  ]),
  // One screen that is dark in either theme (the sign-in's light scene): its controls and text
  // take the dark colours, the rest of the app keeps the person's theme.
  block("[data-scene='dark']", [
    '  color-scheme: dark;',
    ...toColorVariables(colors.dark),
    ...toVariables('system', systemColors.dark),
  ]),
  // Touch devices that are not iOS (Android): live blur under sticky bars is recomputed on every
  // scrolled frame and stutters on mid-range phones, so panes there are solid. iOS keeps glass.
  `@supports not (-webkit-touch-callout: none) {\n@media (pointer: coarse) {\n${block(A11Y_ROOT, [
    '  --blur-material: none;',
    '  --color-material: var(--color-sheet);',
    '  --color-chrome: var(--color-sheet);',
  ])}\n}\n}`,
  // Accessibility settings: solid panes instead of glass, stronger edges and secondary text.
  `@media (prefers-reduced-transparency: reduce) {\n${block(A11Y_ROOT, [
    '  --blur-material: none;',
    '  --color-material: var(--color-sheet);',
    '  --color-chrome: var(--color-sheet);',
  ])}\n}`,
  `@media (prefers-contrast: more) {\n${block(A11Y_ROOT, [
    '  --blur-material: none;',
    '  --color-material: var(--color-sheet);',
    '  --color-chrome: var(--color-sheet);',
    '  --color-material-border: var(--color-border-strong);',
    '  --color-border: var(--color-border-strong);',
    '  --color-muted-foreground: color-mix(in srgb, var(--color-foreground) 82%, transparent);',
  ])}\n}`,
].join('\n\n')

mkdirSync(dirname(OUTPUT_FILE), { recursive: true })
writeFileSync(OUTPUT_FILE, `${css}\n`)
