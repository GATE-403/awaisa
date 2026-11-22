'use client'

import type { ReactNode } from 'react'
import { useT } from '@/shared/i18n'

interface LabelledSectionProps {
  label: string
  className?: string
  children: ReactNode
}

// The landing is a server component and cannot translate an attribute: this section can.
export const LabelledSection = ({ label, className, children }: LabelledSectionProps) => {
  const t = useT()

  return (
    <section className={className} aria-label={t(label)}>
      {children}
    </section>
  )
}
