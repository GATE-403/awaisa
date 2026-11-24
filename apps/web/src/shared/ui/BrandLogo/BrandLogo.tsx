import { useId } from 'react'

interface BrandLogoProps {
  className?: string
  /** Accepted (and ignored) so a logo can stand where a Phosphor glyph was. */
  weight?: string
  'aria-hidden'?: boolean | 'true'
}

// The services' own marks in their own colours - people know them by colour first. Brand colours
// are the one place a hard-coded colour is right: they belong to the brands, not to our theme.

const TelegramMark = ({ className }: BrandLogoProps) => (
  <svg viewBox='0 0 24 24' className={className} aria-hidden='true'>
    <circle cx='12' cy='12' r='12' fill='#29A9EB' />
    <path
      d='M5.43 11.87c3.5-1.52 5.83-2.53 7-3.02 3.33-1.39 4.03-1.63 4.48-1.64.1 0 .32.02.47.14.12.1.15.23.17.33.01.1.03.31.01.48-.18 1.9-.96 6.5-1.36 8.63-.17.9-.5 1.2-.82 1.23-.7.06-1.23-.46-1.9-.91-1.06-.7-1.66-1.13-2.69-1.81-1.19-.78-.42-1.21.26-1.92.18-.18 3.25-2.98 3.31-3.23.01-.03.01-.15-.06-.21-.07-.06-.17-.04-.25-.02-.1.02-1.79 1.14-5.06 3.35-.48.33-.91.49-1.3.48-.43-.01-1.25-.24-1.86-.44-.75-.24-1.35-.37-1.3-.79.03-.22.33-.44.9-.67z'
      fill='#fff'
    />
  </svg>
)

const WhatsappMark = ({ className }: BrandLogoProps) => (
  <svg viewBox='0 0 24 24' className={className} aria-hidden='true'>
    <circle cx='12' cy='12' r='12' fill='#25D366' />
    <path
      d='M12.01 5.4a6.6 6.6 0 0 0-5.66 9.98L5.4 18.6l3.3-.87a6.6 6.6 0 1 0 3.31-12.33zm0 12.08a5.47 5.47 0 0 1-2.8-.77l-.2-.12-2.07.55.55-2.02-.13-.21a5.48 5.48 0 1 1 4.65 2.57zm3-4.1c-.16-.08-.97-.48-1.12-.53-.15-.06-.26-.08-.37.08-.11.16-.43.53-.52.64-.1.11-.2.12-.36.04a4.5 4.5 0 0 1-2.24-1.96c-.17-.29.17-.27.48-.9.05-.1.03-.2-.01-.28l-.5-1.21c-.13-.32-.27-.27-.37-.28h-.31a.6.6 0 0 0-.44.2c-.15.17-.58.57-.58 1.38 0 .82.6 1.6.68 1.71.08.11 1.17 1.79 2.84 2.51 1.06.46 1.47.5 2 .42.32-.05.97-.4 1.11-.78.14-.39.14-.72.1-.79-.04-.06-.15-.1-.31-.18z'
      fill='#fff'
    />
  </svg>
)

const InstagramMark = ({ className }: BrandLogoProps) => {
  const gradient = useId()

  return (
    <svg viewBox='0 0 24 24' className={className} aria-hidden='true'>
      <defs>
        <radialGradient id={gradient} cx='30%' cy='107%' r='150%'>
          <stop offset='0' stopColor='#fdf497' />
          <stop offset='0.05' stopColor='#fdf497' />
          <stop offset='0.45' stopColor='#fd5949' />
          <stop offset='0.6' stopColor='#d6249f' />
          <stop offset='0.9' stopColor='#285aeb' />
        </radialGradient>
      </defs>
      <rect width='24' height='24' rx='6' fill={`url(#${gradient})`} />
      <rect
        x='5.5'
        y='5.5'
        width='13'
        height='13'
        rx='4'
        fill='none'
        stroke='#fff'
        strokeWidth='1.6'
      />
      <circle cx='12' cy='12' r='3.1' fill='none' stroke='#fff' strokeWidth='1.6' />
      <circle cx='16.1' cy='7.9' r='0.95' fill='#fff' />
    </svg>
  )
}

export type { BrandLogoProps }
export { InstagramMark, TelegramMark, WhatsappMark }
