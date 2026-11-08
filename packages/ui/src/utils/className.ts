type ClassValue = string | false | null | undefined

type StateClassName<State> = string | ((state: State) => string | undefined) | undefined

const cx = (...classes: ClassValue[]) => classes.filter(Boolean).join(' ') || undefined

const mergeClassName = <State>(base: string | undefined, className: StateClassName<State>) => {
  if (typeof className !== 'function') return cx(base, className)

  return (state: State) => cx(base, className(state))
}

export type { ClassValue, StateClassName }
export { cx, mergeClassName }
