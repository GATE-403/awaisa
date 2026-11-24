'use client'

import { useLingui } from '@lingui/react'
import { useMemo } from 'react'
import { makeFormat } from './format'

/** Dates and lengths in the page's language (`format.dayLong(key)`, `format.duration(45)`). */
export const useFormat = () => {
  const { i18n } = useLingui()
  return useMemo(() => makeFormat(i18n), [i18n])
}
