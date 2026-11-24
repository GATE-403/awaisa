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
    { name: 'Clipper cut', durationMinutes: 30, price: 600 },
    { name: 'Beard', durationMinutes: 30, price: 500 },
    { name: 'Haircut and beard', durationMinutes: 75, price: 1300, isPopular: true },
    { name: "Kids' haircut", durationMinutes: 30, price: 600 },
    { name: 'Royal shave', durationMinutes: 45, price: 800 },
  ],
  beauty: [
    { name: "Women's haircut", durationMinutes: 60, price: 1200, isPopular: true },
    { name: 'Styling', durationMinutes: 45, price: 900 },
    { name: 'Single-colour dye', durationMinutes: 120, price: 3500 },
    { name: 'Highlights', durationMinutes: 150, price: 4500 },
    { name: 'Brows: shaping and tint', durationMinutes: 45, price: 800, isPopular: true },
    { name: 'Make-up', durationMinutes: 60, price: 2000 },
  ],
  nails: [
    { name: 'Manicure with gel polish', durationMinutes: 90, price: 1200, isPopular: true },
    { name: 'Manicure without polish', durationMinutes: 45, price: 600 },
    { name: 'Pedicure with gel polish', durationMinutes: 90, price: 1500 },
    { name: 'Nail extensions', durationMinutes: 150, price: 2500 },
    { name: 'Polish removal', durationMinutes: 20, price: 300 },
  ],
  spa: [
    { name: 'Classic massage', durationMinutes: 60, price: 2000, isPopular: true },
    { name: 'Back massage', durationMinutes: 30, price: 1200 },
    { name: 'Anti-cellulite massage', durationMinutes: 60, price: 2500 },
    { name: 'Facial care', durationMinutes: 60, price: 2200 },
    { name: 'SPA programme', durationMinutes: 120, price: 4500 },
  ],
  health: [
    { name: 'First consultation', durationMinutes: 30, price: 1500, isPopular: true },
    { name: 'Follow-up visit', durationMinutes: 30, price: 1000 },
    { name: 'Therapeutic massage', durationMinutes: 45, price: 1800 },
  ],
  other: [],
}

export type { ServiceTemplate }
export { SERVICE_TEMPLATES }
