import { ToastProvider } from '@awaisa/ui/Toast'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import '@awaisa/tokens/tokens.css'
import '@awaisa/ui/styles.css'
import '@/common/styles/shell.css'
import { Footer } from '@/common/components/Footer/Footer'
import { Header } from '@/common/components/Header/Header'
import { TabBar } from '@/common/components/TabBar/TabBar'
import { COMPANY } from '@/constants/company'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: { default: `${COMPANY.name} — онлайн-запись`, template: `%s · ${COMPANY.name}` },
  description: COMPANY.tagline,
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f2f2f7' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
}

const RootLayout = ({ children }: LayoutProps<'/'>) => (
  <html lang='ru' className={inter.variable}>
    <body>
      <ToastProvider>
        <div className='root'>
          <Header />
          {children}
          <Footer />
          <TabBar />
        </div>
      </ToastProvider>
    </body>
  </html>
)

export default RootLayout
