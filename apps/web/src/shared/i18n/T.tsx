'use client'

import { useT } from './useT'

interface TProps {
  children: string
  vars?: Record<string, string | number>
}

/** Translated text for server components, which cannot call `useT()`: `<T>Отзывы</T>`. */
export const T = ({ children, vars }: TProps) => {
  const t = useT()
  return t(children, vars)
}
