'use client'

import { plural } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'

interface ServicesCountProps {
  count: number
  className: string
}

// The card itself renders on the server too; only the counted word needs the chosen language.
export const ServicesCount = ({ count, className }: ServicesCountProps) => {
  const { t } = useLingui()
  return (
    <span
      className={className}
    >{t`${plural(count, { one: '# service', other: '# services' })}`}</span>
  )
}
