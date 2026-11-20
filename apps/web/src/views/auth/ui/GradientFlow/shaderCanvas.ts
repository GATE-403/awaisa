import { toRgb } from '@/shared/lib/cssColor'

// One full-screen fragment shader on a canvas, animated until stopped: the shared runner for the
// sign-in screen's living colour. No library.

const VERTEX = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`

/** Shader uniform name → CSS colour or token (`--system-blue`). */
type Colors = Record<string, string>

interface ShaderOptions {
  /** One frame at `stillAt` seconds (reduced motion). */
  isStill?: boolean
  stillAt?: number
  /** Frames per second: slow light needs no 60, and half the frames keep laptops and phones cool. */
  fps?: number
  /** Feeds `m`, the pointer from the window's centre (−0.5…0.5 each way), eased toward it. */
  followsPointer?: boolean
  /** Float uniforms the page moves later with `set`; each eases toward its new value. */
  params?: Record<string, number>
}

interface ShaderHandle {
  stop: () => void
  /** Eases a float uniform from `params` toward `value` (at once in a still frame). */
  set: (name: string, value: number) => void
}

// How far the eased pointer closes the gap each frame (at 60 fps): a slow, weighty follow.
const POINTER_EASE = 0.06
// Params move a little faster than the pointer: a step change should read as one gesture.
const PARAM_EASE = 0.045

/**
 * Runs `fragment` (uniforms `r` (size in pixels), `t` (seconds), `m` (the eased pointer), a vec3
 * per colour and a float per param) on `canvas` at half resolution; returns a handle to stop it and
 * move its params, or null without WebGL.
 */
const runShader = (
  canvas: HTMLCanvasElement,
  fragment: string,
  colors: Colors,
  {
    isStill = false,
    stillAt = 4,
    fps = 30,
    followsPointer = false,
    params = {},
  }: ShaderOptions = {},
): ShaderHandle | null => {
  const gl = canvas.getContext('webgl')
  if (!gl) return null

  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)
    if (!shader) return null
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null
  }
  const vertex = compile(gl.VERTEX_SHADER, VERTEX)
  const pixels = compile(gl.FRAGMENT_SHADER, fragment)
  const program = gl.createProgram()
  if (!vertex || !pixels || !program) return null
  gl.attachShader(program, vertex)
  gl.attachShader(program, pixels)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null
  // biome-ignore lint/correctness/useHookAtTopLevel: WebGL's useProgram, not a React hook
  gl.useProgram(program)

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const position = gl.getAttribLocation(program, 'p')
  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
  for (const [name, color] of Object.entries(colors)) {
    gl.uniform3f(gl.getUniformLocation(program, name), ...toRgb(color))
  }
  const size = gl.getUniformLocation(program, 'r')
  const time = gl.getUniformLocation(program, 't')
  const pointer = gl.getUniformLocation(program, 'm')
  const values = Object.fromEntries(
    Object.entries(params).map(([name, value]) => [
      name,
      { location: gl.getUniformLocation(program, name), now: value, target: value },
    ]),
  )

  const target = { x: 0, y: 0 }
  const eased = { x: 0, y: 0 }
  const handlePointerMove = (event: PointerEvent) => {
    target.x = event.clientX / window.innerWidth - 0.5
    target.y = 0.5 - event.clientY / window.innerHeight
  }
  const isFollowing = followsPointer && !isStill
  if (isFollowing) window.addEventListener('pointermove', handlePointerMove, { passive: true })

  // Soft colour needs few pixels: half resolution, scaled up by the browser.
  const resize = () => {
    canvas.width = Math.max(1, Math.round(canvas.clientWidth / 2))
    canvas.height = Math.max(1, Math.round(canvas.clientHeight / 2))
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.uniform2f(size, canvas.width, canvas.height)
  }
  resize()
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)

  const start = performance.now()
  const frameMs = 1000 / fps
  let frame = 0
  let drawnAt = -Infinity
  const draw = (now: number) => {
    if (!isStill) frame = requestAnimationFrame(draw)
    if (now - drawnAt < frameMs - 1) return
    drawnAt = now
    eased.x += (target.x - eased.x) * POINTER_EASE * (60 / fps)
    eased.y += (target.y - eased.y) * POINTER_EASE * (60 / fps)
    gl.uniform2f(pointer, eased.x, eased.y)
    for (const value of Object.values(values)) {
      value.now += (value.target - value.now) * PARAM_EASE * (60 / fps)
      gl.uniform1f(value.location, value.now)
    }
    gl.uniform1f(time, isStill ? stillAt : (now - start) / 1000)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
  frame = requestAnimationFrame(draw)

  return {
    stop: () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      if (isFollowing) window.removeEventListener('pointermove', handlePointerMove)
    },
    set: (name, target) => {
      const value = values[name]
      if (!value) return
      value.target = target
      if (!isStill) return
      value.now = target
      drawnAt = -Infinity
      frame = requestAnimationFrame(draw)
    },
  }
}

export type { Colors, ShaderHandle, ShaderOptions }
export { runShader }
