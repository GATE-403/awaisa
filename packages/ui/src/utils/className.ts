import { type ClassValue as ClsxValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

type ClassValue = string | false | null | undefined

type StateClassName<State> = string | ((state: State) => string | undefined) | undefined

const cx = (...classes: ClassValue[]) => classes.filter(Boolean).join(' ') || undefined

// shadcn's `cn`: later Tailwind classes win over earlier ones (`px-2` after `px-4`).
const cn = (...inputs: ClsxValue[]) => twMerge(clsx(inputs))

// Base UI takes a class name or a function of the part's state; the kit's classes go first.
const mergeClassName = <State>(base: string | undefined, className: StateClassName<State>) => {
  if (typeof className !== 'function') return cn(base, className)

  return (state: State) => cn(base, className(state))
}

export type { ClassValue, StateClassName }
export { cn, cx, mergeClassName }
