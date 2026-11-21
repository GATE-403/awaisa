'use client'

import { useT } from '@/shared/i18n'

interface ServicesCountProps {
  count: number
  className: string
}

// The card itself renders on the server too; only the counted word needs the chosen language.
export const ServicesCount = ({ count, className }: ServicesCountProps) => {
  const t = useT()
  return <span className={className}>{t.count(count, ['услуга', 'услуги', 'услуг'])}</span>
}
