'use client'

import type { MessageDescriptor } from '@lingui/core'
import { useLingui } from '@lingui/react/macro'
import type { ReactNode } from 'react'

interface LabelledSectionProps {
  label: MessageDescriptor
  className?: string
  children: ReactNode
}

// The landing is a server component and cannot translate an attribute: this section can.
export const LabelledSection = ({ label, className, children }: LabelledSectionProps) => {
  const { t } = useLingui()

  return (
    <section className={className} aria-label={t(label)}>
      {children}
    </section>
  )
}
