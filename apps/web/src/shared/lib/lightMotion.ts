// Android phones (a touch screen that is not iOS, the same test as `tokens.css`): effects that
// redraw a large area or restyle many elements every frame are left out there, since mid-range
// phones (a Samsung A55) stuttered under them. Read in effects and handlers only, never in render.
let isLight: boolean | undefined

// Asked once: it is read on every scrolled frame by the time ruler.
const prefersLightMotion = () => {
  isLight ??=
    matchMedia('(pointer: coarse)').matches && !CSS.supports('-webkit-touch-callout', 'none')
  return isLight
}

export { prefersLightMotion }
