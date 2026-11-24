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
  fill: string
  /** The mascot drawn on a picture frame while its picture loads (or when there is none). */
  placeholderMark: string
  fillHover: string
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
  dangerText: string
  dangerStrong: string
  success: string
  highlight: string
  rating: string
  overlay: string
  material: string
  materialBorder: string
  materialHighlight: string
  chrome: string
  segmentKnob: string
  scrollEdge: string
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
    // Bordered Neutral controls (buttons, segmented track) in the macOS 26 kit.
    fill: 'rgb(0 0 0 / 0.05)',
    placeholderMark: 'rgb(0 0 0 / 0.12)',
    fillHover: 'rgb(0 0 0 / 0.08)',
    mutedForeground: '#6e6e73',
    tertiaryForeground: 'rgb(0 0 0 / 0.25)',
    border: 'rgb(60 60 67 / 0.18)',
    borderStrong: palette.light.gray3,
    control: palette.light.gray5,
    // macOS 26 accent (#0D6FFF), a hair deeper so white labels pass AA.
    primary: '#0a6cf0',
    // Darker on hover, not lighter: white text keeps AA (#0d6fff was 4.4:1).
    primaryHover: '#0a66e6',
    primaryForeground: palette.white,
    primarySubtle: 'rgb(0 136 255 / 0.12)',
    primarySubtleHover: 'rgb(0 136 255 / 0.18)',
    // apple.com's #0066cc a hair deeper: it read 4.2–4.5:1 on grey fills (toast action, today).
    link: '#0060c2',
    ring: 'rgb(0 136 255 / 0.4)',
    danger: palette.light.red,
    dangerHover: '#f52f32',
    dangerForeground: palette.white,
    // Red label on light fills: the accessible variant of system red.
    dangerText: '#d70015',
    // A red fill that carries white text (calendar leaf), the same in both themes.
    dangerStrong: '#d70015',
    success: palette.light.green,
    highlight: '#b64400',
    rating: palette.light.orange,
    overlay: 'rgb(0 0 0 / 0.32)',
    material: 'rgb(246 246 246 / 0.72)',
    materialBorder: 'rgb(255 255 255 / 0.6)',
    // The lit top edge of a material pane: light falls from above.
    materialHighlight: 'rgb(255 255 255 / 0.75)',
    // Sticky bars (header, business bar, section chips): one nearly solid material, so stacked
    // bars read as one sheet instead of glass over glass in different tones.
    chrome: 'rgb(250 250 252 / 0.94)',
    // The raised knob of a segmented control: white on light, a lighter gray on dark (macOS 26).
    segmentKnob: palette.white,
    // Content dims as it slides under a bar (scroll edge effect) instead of a hard hairline.
    scrollEdge: 'rgb(0 0 0 / 0.07)',
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
    fill: 'rgb(255 255 255 / 0.1)',
    placeholderMark: 'rgb(255 255 255 / 0.14)',
    fillHover: 'rgb(255 255 255 / 0.14)',
    mutedForeground: 'rgb(255 255 255 / 0.62)',
    tertiaryForeground: 'rgb(255 255 255 / 0.3)',
    border: 'rgb(84 84 88 / 0.6)',
    borderStrong: palette.dark.gray3,
    control: palette.dark.gray4,
    // Button fill with white text: the light theme's accent. The dark system blue #0a84ff gave
    // white labels only 3.6:1 (Lighthouse color-contrast); this keeps them at 4.8:1, hover 5.2:1.
    primary: '#0a6cf0',
    primaryHover: '#0a66e6',
    primaryForeground: palette.white,
    primarySubtle: 'rgb(0 145 255 / 0.2)',
    primarySubtleHover: 'rgb(0 145 255 / 0.28)',
    link: '#409cff',
    ring: 'rgb(0 145 255 / 0.5)',
    danger: palette.dark.red,
    dangerHover: '#ff4747',
    dangerForeground: palette.white,
    dangerText: '#ff6961',
    dangerStrong: '#d70015',
    success: palette.dark.green,
    highlight: palette.dark.orange,
    rating: palette.dark.orange,
    overlay: 'rgb(0 0 0 / 0.56)',
    material: 'rgb(30 30 32 / 0.8)',
    materialBorder: 'rgb(255 255 255 / 0.08)',
    materialHighlight: 'rgb(255 255 255 / 0.1)',
    chrome: 'rgb(24 24 26 / 0.95)',
    segmentKnob: '#636366',
    scrollEdge: 'rgb(0 0 0 / 0.5)',
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
  // Every one-line control (buttons, fields, selects, search) is a capsule; only containers are rounded rects.
  control: 9999,
}

const fontFamily = {
  sans: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', var(--font-inter, 'Inter'), 'Segoe UI', Roboto, 'Noto Sans', sans-serif",
  // Headings in SF Pro Display like iOS (narrow, tight); Inter where SF is not available.
  display:
    "-apple-system, BlinkMacSystemFont, 'SF Pro Display', var(--font-inter, 'Inter'), 'Segoe UI', Roboto, sans-serif",
  mono: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
}

const text = {
  xs: { size: 12, lineHeight: 16 },
  footnote: { size: 13, lineHeight: 18 },
  sm: { size: 15, lineHeight: 20 },
  // Heading scale (iOS): page title → section → group/card title. Each level is a clear step down.
  title1: { size: 28, lineHeight: 34 },
  title2: { size: 22, lineHeight: 28 },
  title3: { size: 17, lineHeight: 22 },
  // Body text everywhere (rows, sheets, forms, lists) - one size across the app.
  body: { size: 15, lineHeight: 20 },
  // Text fields: 16px is the smallest size iOS does not zoom into on focus.
  input: { size: 16, lineHeight: 21 },
  md: { size: 17, lineHeight: 22 },
  lg: { size: 20, lineHeight: 25 },
  xl: { size: 22, lineHeight: 28 },
  '2xl': { size: 28, lineHeight: 34 },
  '3xl': { size: 34, lineHeight: 41 },
  '4xl': { size: 48, lineHeight: 52 },
  // macOS 26 page header.
  display: { size: 56, lineHeight: 60 },
}

const fontWeight = {
  regular: 400,
  // macOS 26 control labels use 510.
  medium: 510,
  // SF Pro's "emphasized" weight in macOS 26 text styles.
  semibold: 590,
  bold: 700,
}

// Tracking is size-specific, like SF Pro: large type pulls in, small type opens up.
const letterSpacing = {
  display: '-0.02em',
  tight: '-0.022em',
  title: '-0.012em',
  normal: '-0.004em',
  caption: '0.006em',
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
  // Layered like real light: a tight contact shadow plus a wide ambient one, so cards rest on the page.
  sm: '0 0.5px 1px rgb(0 0 0 / 0.05), 0 2px 6px rgb(0 0 0 / 0.04), 0 8px 24px rgb(0 0 0 / 0.05)',
  md: '0 1px 2px rgb(0 0 0 / 0.08), 0 6px 16px rgb(0 0 0 / 0.08), 0 18px 40px rgb(0 0 0 / 0.1)',
  lg: '0 2px 6px rgb(0 0 0 / 0.08), 0 12px 32px rgb(0 0 0 / 0.12), 0 32px 64px rgb(0 0 0 / 0.16)',
  // Material panes: the lit top edge, then a soft lift. Heavier panes get md/lg on top.
  material: 'inset 0 0.5px 0 var(--color-material-highlight)',
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
