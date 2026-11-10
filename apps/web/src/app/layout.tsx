import { ToastProvider } from '@awaisa/ui/Toast'
import type { Metadata, Viewport } from 'next'
import { Inter, Onest } from 'next/font/google'
import { Suspense } from 'react'
import '@awaisa/tokens/tokens.css'
import '@awaisa/ui/styles.css'
import '@/shared/styles/shell.css'
import { ResumeBooking } from '@/features/bookingDraft'
import { PLATFORM } from '@/shared/config/platform'
import { THEME_BOOT_SCRIPT } from '@/shared/lib/theme'
import { Footer, FooterGate } from '@/widgets/Footer'
import { Header, HeaderFallback } from '@/widgets/Header'
import { TabBar } from '@/widgets/TabBar'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-inter',
})

// Headings: Onest reads well in Cyrillic and Latin and has a calm, geometric character.
const onest = Onest({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-onest',
})

export const metadata: Metadata = {
  title: { default: `${PLATFORM.name} — онлайн-запись`, template: `%s · ${PLATFORM.name}` },
  description: PLATFORM.tagline,
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f5f7' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
}

const RootLayout = ({ children }: LayoutProps<'/'>) => (
  // The boot script sets data-theme before hydration, so React must not compare that attribute.
  <html lang='ru' className={`${inter.variable} ${onest.variable}`} suppressHydrationWarning>
    <head>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static theme boot script, no user input */}
      <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
    </head>
    <body>
      <ToastProvider>
        <div className='root'>
          <Suspense fallback={<HeaderFallback />}>
            <Header />
          </Suspense>
          {children}
          <Suspense>
            <FooterGate>
              <Footer />
            </FooterGate>
          </Suspense>
          <Suspense>
            <TabBar />
            <ResumeBooking />
          </Suspense>
        </div>
      </ToastProvider>
    </body>
  </html>
)

export default RootLayout
