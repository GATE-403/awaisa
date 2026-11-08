import type { Metadata } from 'next'
import { ServicesPage } from '@/features/services/ServicesPage'

export const metadata: Metadata = {
  title: 'Услуги и цены',
}

const ServicesRoute = () => <ServicesPage />

export default ServicesRoute
