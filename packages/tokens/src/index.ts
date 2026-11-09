const palette = {
  white: '#ffffff',
  black: '#000000',
  light: {
    blue: '#0088ff',
    green: '#34c759',
    red: '#ff383c',
    orange: '#ff8d28',
    gray: '#8e8e93',
    gray2: '#aeaeb2',
    gray3: '#c7c7cc',
    gray4: '#d1d1d6',
    gray5: '#e5e5ea',
    gray6: '#f2f2f7',
  },
  dark: {
    blue: '#0091ff',
    green: '#30d158',
    red: '#ff4245',
    orange: '#ff9230',
    gray: '#98989f',
    gray2: '#636366',
    gray3: '#48484a',
    gray4: '#3a3a3c',
    gray5: '#2c2c2e',
    gray6: '#1c1c1e',
  },
}

type ColorScheme = {
  background: string
  foreground: string
  surface: string
  elevated: string
  sheet: string
  sheetSurface: string
  subtle: string
  subtleHover: string
  mutedForeground: string
  tertiaryForeground: string
  border: string
  borderStrong: string
  control: string
  primary: string
  primaryHover: string
  primaryForeground: string
  primarySubtle: string
  primarySubtleHover: string
  link: string
  ring: string
  danger: string
  dangerHover: string
  dangerForeground: string
  success: string
  highlight: string
  rating: string
  overlay: string
  material: string
  materialBorder: string
  contrast: string
  contrastHover: string
  contrastForeground: string
}

// System accents, label/fill alphas and materials follow Apple's macOS 26 UI kit (Figma).
// Fills that carry text (primary, link, muted text) stay darker for WCAG AA.
const colors: Record<'light' | 'dark', ColorScheme> = {
  light: {
    background: '#f5f5f7',
    foreground: '#1d1d1f',
    surface: palette.white,
    elevated: palette.white,
    sheet: palette.light.gray6,
    sheetSurface: palette.white,
    subtle: 'rgb(0 0 0 / 0.08)',
    subtleHover: 'rgb(0 0 0 / 0.1)',
    mutedForeground: '#6e6e73',
    tertiaryForeground: 'rgb(0 0 0 / 0.25)',
    border: 'rgb(60 60 67 / 0.18)',
    borderStrong: palette.light.gray3,
    control: palette.light.gray5,
    primary: '#0071e3',
    primaryHover: '#0077ed',
    primaryForeground: palette.white,
    primarySubtle: 'rgb(0 136 255 / 0.12)',
    primarySubtleHover: 'rgb(0 136 255 / 0.18)',
    link: '#0066cc',
    ring: 'rgb(0 136 255 / 0.4)',
    danger: palette.light.red,
    dangerHover: '#f52f32',
    dangerForeground: palette.white,
    success: palette.light.green,
    highlight: '#b64400',
    rating: palette.light.orange,
    overlay: 'rgb(0 0 0 / 0.32)',
    material: 'rgb(246 246 246 / 0.72)',
    materialBorder: 'rgb(255 255 255 / 0.6)',
    contrast: palette.white,
    contrastHover: '#e8e8ed',
    contrastForeground: '#1d1d1f',
  },
  dark: {
    background: palette.black,
    foreground: palette.white,
    surface: palette.dark.gray6,
    elevated: palette.dark.gray5,
    // Each layer up is lighter in the dark: page #000 → card #1C1C1E → sheet rows #2C2C2E.
    sheet: palette.dark.gray6,
    sheetSurface: palette.dark.gray5,
    subtle: 'rgb(255 255 255 / 0.1)',
    subtleHover: 'rgb(255 255 255 / 0.14)',
    mutedForeground: 'rgb(255 255 255 / 0.62)',
    tertiaryForeground: 'rgb(255 255 255 / 0.3)',
    border: 'rgb(84 84 88 / 0.6)',
    borderStrong: palette.dark.gray3,
    control: palette.dark.gray4,
    // Button fill with white text: a touch deeper than the dark system blue.
    primary: '#0a84ff',
    primaryHover: '#0a99ff',
    primaryForeground: palette.white,
    primarySubtle: 'rgb(0 145 255 / 0.2)',
    primarySubtleHover: 'rgb(0 145 255 / 0.28)',
    link: '#409cff',
    ring: 'rgb(0 145 255 / 0.5)',
    danger: palette.dark.red,
    dangerHover: '#ff4747',
    dangerForeground: palette.white,
    success: palette.dark.green,
    highlight: palette.dark.orange,
    rating: palette.dark.orange,
    overlay: 'rgb(0 0 0 / 0.56)',
    material: 'rgb(30 30 32 / 0.8)',
    materialBorder: 'rgb(255 255 255 / 0.08)',
    contrast: palette.white,
    contrastHover: '#e8e8ed',
    contrastForeground: '#1d1d1f',
  },
}

type SystemColors = {
  red: string
  orange: string
  yellow: string
  green: string
  mint: string
  teal: string
  cyan: string
  blue: string
  indigo: string
  purple: string
  pink: string
  brown: string
  monogramFrom: string
  monogramTo: string
}

const systemColors: Record<'light' | 'dark', SystemColors> = {
  light: {
    red: '#ff383c',
    orange: '#ff8d28',
    yellow: '#ffcc00',
    green: '#34c759',
    mint: '#00c8b3',
    teal: '#00c3d0',
    cyan: '#00c0e8',
    blue: '#0088ff',
    indigo: '#6155f5',
    purple: '#cb30e0',
    pink: '#ff2d55',
    brown: '#ac7f5e',
    monogramFrom: '#a5abb8',
    monogramTo: '#858994',
  },
  dark: {
    red: '#ff4245',
    orange: '#ff9230',
    yellow: '#ffd600',
    green: '#30d158',
    mint: '#00dac3',
    teal: '#00d2e0',
    cyan: '#3cd3fe',
    blue: '#0091ff',
    indigo: '#6d7cff',
    purple: '#db34f2',
    pink: '#ff375f',
    brown: '#b78a66',
    monogramFrom: '#6c6c70',
    monogramTo: '#48484a',
  },
}

const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
}

const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  '2xl': 28,
  full: 9999,
}

const fontFamily = {
  sans: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', var(--font-inter, 'Inter'), 'Segoe UI', Roboto, 'Noto Sans', sans-serif",
  display:
    "-apple-system, BlinkMacSystemFont, 'SF Pro Display', var(--font-inter, 'Inter'), 'Segoe UI', Roboto, 'Noto Sans', sans-serif",
  mono: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
}

const text = {
  xs: { size: 12, lineHeight: 16 },
  footnote: { size: 13, lineHeight: 18 },
  sm: { size: 15, lineHeight: 20 },
  md: { size: 17, lineHeight: 22 },
  lg: { size: 20, lineHeight: 25 },
  xl: { size: 22, lineHeight: 28 },
  '2xl': { size: 28, lineHeight: 34 },
  '3xl': { size: 34, lineHeight: 41 },
  '4xl': { size: 48, lineHeight: 52 },
}

const fontWeight = {
  regular: 400,
  medium: 500,
  // SF Pro's "emphasized" weight in macOS 26 text styles.
  semibold: 590,
  bold: 700,
}

const letterSpacing = {
  tight: '-0.022em',
  title: '-0.012em',
  normal: '-0.004em',
}

const controlHeight = {
  sm: 34,
  md: 44,
  lg: 52,
}

const shadow = {
  // Control depth, like macOS push buttons: a crisp contact shadow plus a soft spread.
  xs: '0 0.5px 1px rgb(0 0 0 / 0.16), 0 1px 3px rgb(0 0 0 / 0.08)',
  // Top-edge highlight on filled controls.
  bevel: 'inset 0 1px 0 rgb(255 255 255 / 0.2)',
  sm: '2px 4px 12px rgb(0 0 0 / 0.08)',
  md: '2px 4px 16px rgb(0 0 0 / 0.16)',
  lg: '0 12px 32px rgb(0 0 0 / 0.12), 0 32px 64px rgb(0 0 0 / 0.16)',
}

const blur = {
  material: 'saturate(180%) blur(30px)',
}

const duration = {
  fast: 150,
  normal: 250,
}

const easing = {
  standard: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  spring: 'cubic-bezier(0.34, 1.36, 0.64, 1)',
}

const breakpoint = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
}

const layout = {
  containerWidth: 1120,
  headerHeight: 64,
}

export type { ColorScheme, SystemColors }
export {
  blur,
  breakpoint,
  colors,
  controlHeight,
  duration,
  easing,
  fontFamily,
  fontWeight,
  layout,
  letterSpacing,
  palette,
  radius,
  shadow,
  spacing,
  systemColors,
  text,
}
