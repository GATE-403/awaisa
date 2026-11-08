import { ToastProvider } from '@awaisa/ui/Toast'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Suspense } from 'react'
import '@awaisa/tokens/tokens.css'
import '@awaisa/ui/styles.css'
import '@/common/styles/shell.css'
import { Footer } from '@/common/components/Footer/Footer'
import { Header } from '@/common/components/Header/Header'
import { HeaderFallback } from '@/common/components/Header/HeaderFallback'
import { TabBar } from '@/common/components/TabBar/TabBar'
import { THEME_BOOT_SCRIPT } from '@/common/utils/theme'
import { PLATFORM } from '@/constants/platform'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-inter',
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
  <html lang='ru' className={inter.variable} suppressHydrationWarning>
    <head>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static theme boot script, no user input */}
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
    </head>
    <body>
      <ToastProvider>
        <div className='root'>
          <Suspense fallback={<HeaderFallback />}>
            <Header />
          </Suspense>
          {children}
          <Footer />
          <Suspense>
            <TabBar />
          </Suspense>
        </div>
      </ToastProvider>
    </body>
  </html>
)

export default RootLayout
