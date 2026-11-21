'use client'

import { useT } from '@/shared/i18n'

interface CountedProps {
  count: number
  forms: [one: string, few: string, many: string]
  /** The word alone, for layouts that show the number separately (bold «6» over «услуг»). */
  isWordOnly?: boolean
}

// A counted word in the chosen language, for the page's server components: «6 услуг» · «6 кызмат».
export const Counted = ({ count, forms, isWordOnly }: CountedProps) => {
  const t = useT()
  const text = t.count(count, forms)

  return isWordOnly ? text.slice(String(count).length + 1) : text
}
