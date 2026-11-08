import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {
  type ColorScheme,
  colors,
  controlHeight,
  duration,
  fontFamily,
  fontWeight,
  layout,
  radius,
  shadow,
  spacing,
  text,
} from '../src/index.ts'

const OUTPUT_FILE = join(import.meta.dirname, '../dist/tokens.css')

const toKebabCase = (value: string) => value.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)

const toVariables = (prefix: string, values: Record<string, string | number>, unit = '') =>
  Object.entries(values).map(([key, value]) => {
    const cssValue = typeof value === 'number' && value !== 0 ? `${value}${unit}` : value
    return `  --${prefix}-${toKebabCase(key)}: ${cssValue};`
  })

const toTextVariables = () =>
  Object.entries(text).flatMap(([key, { size, lineHeight }]) => [
    `  --text-${key}: ${size}px;`,
    `  --text-${key}-line-height: ${lineHeight}px;`,
  ])

const toColorVariables = (scheme: ColorScheme) => toVariables('color', scheme)

const block = (selector: string, lines: string[]) => `${selector} {\n${lines.join('\n')}\n}`

const css = [
  block(':root', [
    '  color-scheme: light;',
    ...toColorVariables(colors.light),
    ...toVariables('space', spacing, 'px'),
    ...toVariables('radius', radius, 'px'),
    ...toVariables('font', fontFamily),
    ...toTextVariables(),
    ...toVariables('font-weight', fontWeight),
    ...toVariables('control-height', controlHeight, 'px'),
    ...toVariables('shadow', shadow),
    ...toVariables('duration', duration, 'ms'),
    ...toVariables('layout', layout, 'px'),
    '  --focus-ring: 0 0 0 3px var(--color-ring);',
  ]),
  `@media (prefers-color-scheme: dark) {\n${block(":root:not([data-theme='light'])", [
    '  color-scheme: dark;',
    ...toColorVariables(colors.dark),
  ])}\n}`,
  block(":root[data-theme='dark']", ['  color-scheme: dark;', ...toColorVariables(colors.dark)]),
].join('\n\n')

mkdirSync(dirname(OUTPUT_FILE), { recursive: true })
writeFileSync(OUTPUT_FILE, `${css}\n`)
