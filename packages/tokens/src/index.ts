const palette = {
  white: '#ffffff',
  black: '#000000',
  light: {
    blue: '#007aff',
    green: '#34c759',
    red: '#ff3b30',
    orange: '#ff9500',
    gray: '#8e8e93',
    gray2: '#aeaeb2',
    gray3: '#c7c7cc',
    gray4: '#d1d1d6',
    gray5: '#e5e5ea',
    gray6: '#f2f2f7',
  },
  dark: {
    blue: '#0a84ff',
    green: '#30d158',
    red: '#ff453a',
    orange: '#ff9f0a',
    gray: '#8e8e93',
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

const colors: Record<'light' | 'dark', ColorScheme> = {
  light: {
    background: '#f5f5f7',
    foreground: '#1d1d1f',
    surface: palette.white,
    elevated: palette.white,
    subtle: 'rgb(118 118 128 / 0.12)',
    subtleHover: 'rgb(118 118 128 / 0.2)',
    mutedForeground: '#6e6e73',
    tertiaryForeground: 'rgb(60 60 67 / 0.36)',
    border: 'rgb(60 60 67 / 0.18)',
    borderStrong: palette.light.gray3,
    control: palette.light.gray5,
    primary: '#0071e3',
    primaryHover: '#0077ed',
    primaryForeground: palette.white,
    primarySubtle: 'rgb(0 122 255 / 0.12)',
    primarySubtleHover: 'rgb(0 122 255 / 0.18)',
    link: '#0066cc',
    ring: 'rgb(0 122 255 / 0.4)',
    danger: palette.light.red,
    dangerHover: '#e0352b',
    dangerForeground: palette.white,
    success: palette.light.green,
    highlight: '#b64400',
    rating: palette.light.orange,
    overlay: 'rgb(0 0 0 / 0.32)',
    material: 'rgb(255 255 255 / 0.8)',
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
    subtle: 'rgb(118 118 128 / 0.24)',
    subtleHover: 'rgb(118 118 128 / 0.32)',
    mutedForeground: 'rgb(235 235 245 / 0.64)',
    tertiaryForeground: 'rgb(235 235 245 / 0.32)',
    border: 'rgb(84 84 88 / 0.6)',
    borderStrong: palette.dark.gray3,
    control: palette.dark.gray4,
    primary: palette.dark.blue,
    primaryHover: '#409cff',
    primaryForeground: palette.white,
    primarySubtle: 'rgb(10 132 255 / 0.2)',
    primarySubtleHover: 'rgb(10 132 255 / 0.28)',
    link: '#409cff',
    ring: 'rgb(10 132 255 / 0.5)',
    danger: palette.dark.red,
    dangerHover: '#ff6961',
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
    red: '#ff3b30',
    orange: '#ff9500',
    yellow: '#ffcc00',
    green: '#34c759',
    mint: '#00c7be',
    teal: '#30b0c7',
    cyan: '#32ade6',
    blue: '#007aff',
    indigo: '#5856d6',
    purple: '#af52de',
    pink: '#ff2d55',
    brown: '#a2845e',
    monogramFrom: '#a5abb8',
    monogramTo: '#858994',
  },
  dark: {
    red: '#ff453a',
    orange: '#ff9f0a',
    yellow: '#ffd60a',
    green: '#30d158',
    mint: '#63e6e2',
    teal: '#40c8e0',
    cyan: '#64d2ff',
    blue: '#0a84ff',
    indigo: '#5e5ce6',
    purple: '#bf5af2',
    pink: '#ff375f',
    brown: '#ac8e68',
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
  semibold: 600,
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
  sm: '2px 4px 12px rgb(0 0 0 / 0.08)',
  md: '2px 4px 16px rgb(0 0 0 / 0.16)',
  lg: '0 12px 32px rgb(0 0 0 / 0.12), 0 32px 64px rgb(0 0 0 / 0.16)',
}

const blur = {
  material: 'saturate(180%) blur(24px)',
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
