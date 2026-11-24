import { ToastProvider } from '@awaisa/ui/Toast'
import { msg, ph } from '@lingui/core/macro'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Suspense } from 'react'
import '@awaisa/tokens/tokens.css'
import '@awaisa/ui/styles.css'
import '@/shared/styles/shell.css'
import { ChannelTracker } from '@/features/bookingChannel'
import { ResumeBooking } from '@/features/bookingDraft'
import { InviteRefCapture } from '@/features/invite'
import { PLATFORM } from '@/shared/config/platform'
import { LinguiClientProvider } from '@/shared/i18n/LinguiClientProvider'
import { INTL_LOCALES, LOCALES } from '@/shared/i18n/locales'
import { getLocale, initLingui } from '@/shared/i18n/server'
import { baseOpenGraph } from '@/shared/lib/seo/businessMetadata'
import { SITE_TAGLINE } from '@/shared/lib/seo/seoText'
import { SITE_URL } from '@/shared/lib/seo/siteUrl'
import { THEME_BOOT_SCRIPT } from '@/shared/lib/theme'
import { ErrorReporter } from '@/shared/ui/ErrorReporter/ErrorReporter'
import { Splash } from '@/shared/ui/Splash/Splash'
import { BookingOriginTracker } from '@/views/booking'
import { Footer, FooterGate } from '@/widgets/Footer'
import { Header, HeaderFallback } from '@/widgets/Header'
import { TabBar } from '@/widgets/TabBar'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-inter',
})

export const generateMetadata = async (): Promise<Metadata> => {
  const i18n = await initLingui()
  const title = i18n._(msg`${ph({ platform: PLATFORM.name })} - online booking`)
  const description = i18n._(SITE_TAGLINE)

  return {
    title: { default: title, template: `%s · ${PLATFORM.name}` },
    description,
    metadataBase: new URL(SITE_URL),
    openGraph: { ...baseOpenGraph(i18n), title, description },
    twitter: { card: 'summary_large_image' },
  }
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

// Every language is prerendered; the proxy only ever sends these.
export const generateStaticParams = () => LOCALES.map((lang) => ({ lang }))

const RootLayout = async ({ children, modal }: LayoutProps<'/[lang]'>) => {
  await initLingui()
  const locale = await getLocale()
  return (
    // The boot script sets data-theme before hydration, so React must not compare that attribute.
    <html
      lang={INTL_LOCALES[locale]}
      className={inter.variable}
      // Next turns smooth scrolling off while navigating, so a new page starts at the top at once.
      data-scroll-behavior='smooth'
      suppressHydrationWarning
    >
      <head />
      <body>
        {/* The theme before the first paint, as raw HTML in a hidden wrapper: the browser runs it
          while parsing the server's HTML, and React never sees a <script> element - so a client
          re-render of the root (an extension's mismatch, a slot change) does not warn about one,
          and nothing in <head> gets matched against scripts extensions inject there. */}
        <div
          hidden
          suppressHydrationWarning
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static theme boot script, no user input
          dangerouslySetInnerHTML={{ __html: `<script>${THEME_BOOT_SCRIPT}</script>` }}
        />
        <Splash />
        <LinguiClientProvider locale={locale}>
          <ToastProvider>
            <div className='root'>
              <Suspense fallback={<HeaderFallback />}>
                <Header />
              </Suspense>
              {children}
              {modal}
              <Suspense>
                <FooterGate>
                  <Footer />
                </FooterGate>
              </Suspense>
              <Suspense>
                <TabBar />
                <ResumeBooking />
                <InviteRefCapture />
                <ChannelTracker />
                <ErrorReporter />
                <BookingOriginTracker />
              </Suspense>
            </div>
          </ToastProvider>
        </LinguiClientProvider>
      </body>
    </html>
  )
}

export default RootLayout
