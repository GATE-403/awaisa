import { t } from './useT'

interface TProps {
  children: string
  vars?: Record<string, string | number>
}

/** User-facing text in server components, marked like `t()`: `<T>Reviews</T>`. */
export const T = ({ children, vars }: TProps) => t(children, vars)
