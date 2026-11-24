import type { BusinessKind } from '@/shared/api/types'

type ServiceTemplate = {
  name: string
  durationMinutes: number
  price: number
  isPopular?: boolean
}

// Starter menus with typical Bishkek prices: the owner unticks what they don't do and fixes prices.
const SERVICE_TEMPLATES: Record<BusinessKind, ServiceTemplate[]> = {
  barber: [
    { name: "Men's haircut", durationMinutes: 45, price: 900, isPopular: true },
    { name: 'Стрижка машинкой', durationMinutes: 30, price: 600 },
    { name: 'Beard', durationMinutes: 30, price: 500 },
    { name: 'Haircut and beard', durationMinutes: 75, price: 1300, isPopular: true },
    { name: 'Детская стрижка', durationMinutes: 30, price: 600 },
    { name: 'Королевское бритьё', durationMinutes: 45, price: 800 },
  ],
  beauty: [
    { name: 'Женская стрижка', durationMinutes: 60, price: 1200, isPopular: true },
    { name: 'Styling', durationMinutes: 45, price: 900 },
    { name: 'Окрашивание в один тон', durationMinutes: 120, price: 3500 },
    { name: 'Мелирование', durationMinutes: 150, price: 4500 },
    { name: 'Брови: коррекция и окрашивание', durationMinutes: 45, price: 800, isPopular: true },
    { name: 'Макияж', durationMinutes: 60, price: 2000 },
  ],
  nails: [
    { name: 'Маникюр с покрытием', durationMinutes: 90, price: 1200, isPopular: true },
    { name: 'Маникюр без покрытия', durationMinutes: 45, price: 600 },
    { name: 'Педикюр с покрытием', durationMinutes: 90, price: 1500 },
    { name: 'Наращивание', durationMinutes: 150, price: 2500 },
    { name: 'Снятие покрытия', durationMinutes: 20, price: 300 },
  ],
  spa: [
    { name: 'Классический массаж', durationMinutes: 60, price: 2000, isPopular: true },
    { name: 'Массаж спины', durationMinutes: 30, price: 1200 },
    { name: 'Антицеллюлитный массаж', durationMinutes: 60, price: 2500 },
    { name: 'Facial care', durationMinutes: 60, price: 2200 },
    { name: 'SPA-программа', durationMinutes: 120, price: 4500 },
  ],
  health: [
    { name: 'Первичная консультация', durationMinutes: 30, price: 1500, isPopular: true },
    { name: 'Повторный приём', durationMinutes: 30, price: 1000 },
    { name: 'Массаж лечебный', durationMinutes: 45, price: 1800 },
  ],
  other: [],
}

export type { ServiceTemplate }
export { SERVICE_TEMPLATES }
