const palette = {
  white: '#ffffff',
  black: '#000000',
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
  },
  red: {
    50: '#fef2f2',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    950: '#450a0a',
  },
  amber: {
    400: '#fbbf24',
    500: '#f59e0b',
  },
  green: {
    50: '#f0fdf4',
    500: '#22c55e',
    600: '#16a34a',
    950: '#052e16',
  },
}

type ColorScheme = {
  background: string
  foreground: string
  surface: string
  subtle: string
  subtleHover: string
  mutedForeground: string
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
  rating: string
  overlay: string
}

const colors: Record<'light' | 'dark', ColorScheme> = {
  light: {
    background: palette.white,
    foreground: palette.neutral[950],
    surface: palette.white,
    subtle: palette.neutral[100],
    subtleHover: palette.neutral[200],
    mutedForeground: palette.neutral[500],
    border: palette.neutral[200],
    borderStrong: palette.neutral[400],
    control: palette.neutral[300],
    primary: palette.blue[600],
    primaryHover: palette.blue[700],
    primaryForeground: palette.white,
    primarySubtle: palette.blue[50],
    primarySubtleHover: palette.blue[100],
    link: palette.blue[700],
    ring: 'rgb(59 130 246 / 0.45)',
    danger: palette.red[600],
    dangerHover: palette.red[700],
    dangerForeground: palette.white,
    success: palette.green[600],
    rating: palette.amber[500],
    overlay: 'rgb(0 0 0 / 0.5)',
  },
  dark: {
    background: palette.neutral[950],
    foreground: palette.neutral[50],
    surface: palette.neutral[900],
    subtle: palette.neutral[800],
    subtleHover: palette.neutral[700],
    mutedForeground: palette.neutral[400],
    border: palette.neutral[800],
    borderStrong: palette.neutral[600],
    control: palette.neutral[700],
    primary: palette.blue[600],
    primaryHover: palette.blue[500],
    primaryForeground: palette.white,
    primarySubtle: palette.blue[950],
    primarySubtleHover: palette.blue[900],
    link: palette.blue[400],
    ring: 'rgb(96 165 250 / 0.5)',
    danger: palette.red[600],
    dangerHover: palette.red[500],
    dangerForeground: palette.white,
    success: palette.green[500],
    rating: palette.amber[400],
    overlay: 'rgb(0 0 0 / 0.7)',
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
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
}

const fontFamily = {
  sans: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans', sans-serif",
  mono: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
}

const text = {
  xs: { size: 12, lineHeight: 16 },
  sm: { size: 14, lineHeight: 20 },
  md: { size: 16, lineHeight: 24 },
  lg: { size: 18, lineHeight: 28 },
  xl: { size: 20, lineHeight: 28 },
  '2xl': { size: 24, lineHeight: 32 },
  '3xl': { size: 30, lineHeight: 36 },
  '4xl': { size: 36, lineHeight: 40 },
}

const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
}

const controlHeight = {
  sm: 32,
  md: 40,
  lg: 48,
}

const shadow = {
  sm: '0 1px 2px rgb(0 0 0 / 0.06)',
  md: '0 4px 12px rgb(0 0 0 / 0.08)',
  lg: '0 16px 48px rgb(0 0 0 / 0.18)',
}

const duration = {
  fast: 120,
  normal: 200,
}

const breakpoint = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
}

const layout = {
  containerWidth: 1200,
  headerHeight: 64,
}

export type { ColorScheme }
export {
  breakpoint,
  colors,
  controlHeight,
  duration,
  fontFamily,
  fontWeight,
  layout,
  palette,
  radius,
  shadow,
  spacing,
  text,
}
