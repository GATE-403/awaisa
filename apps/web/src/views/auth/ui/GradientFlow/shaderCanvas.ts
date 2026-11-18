import { toRgb } from '@/shared/lib/cssColor'

// One full-screen fragment shader on a canvas, animated until stopped: the shared runner for the
// sign-in screen's living colour. No library.

const VERTEX = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`

/** Shader uniform name → CSS colour or token (`--system-blue`). */
type Colors = Record<string, string>

/**
 * Runs `fragment` (uniforms `r` — size in pixels, `t` — seconds, plus a vec3 per colour) on
 * `canvas` at half resolution; returns a stop function, or null without WebGL. `isStill` draws
 * one frame at `stillAt` seconds.
 */
const runShader = (
  canvas: HTMLCanvasElement,
  fragment: string,
  colors: Colors,
  { isStill = false, stillAt = 4 }: { isStill?: boolean; stillAt?: number } = {},
): (() => void) | null => {
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
  let frame = 0
  const draw = (now: number) => {
    gl.uniform1f(time, isStill ? stillAt : (now - start) / 1000)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    if (!isStill) frame = requestAnimationFrame(draw)
  }
  frame = requestAnimationFrame(draw)

  return () => {
    cancelAnimationFrame(frame)
    observer.disconnect()
  }
}

export type { Colors }
export { runShader }
