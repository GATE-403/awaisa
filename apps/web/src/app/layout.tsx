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
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

const RootLayout = ({ children }: LayoutProps<'/'>) => (
  <html lang='ru'>
    <body className={inter.className}>
      <div className='root'>
        <Header />
        {children}
        <Footer />
        <TabBar />
      </div>
    </body>
  </html>
)

export default RootLayout
