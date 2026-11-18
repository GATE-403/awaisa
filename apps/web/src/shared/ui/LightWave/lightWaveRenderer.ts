import { type Rgb, toRgb } from '@/shared/lib/cssColor'

// A wave of light, like two iPhones sharing a contact: a flash at the origin, then a wobbling
// front that runs out to the farthest corner, splitting into the palette's colours like light
// through a prism, with a glow trailing behind it. With `afterglow` the same light keeps passing
// faintly from the origin until the canvas is taken away. One fragment shader on a full-screen
// quad, no library; colours are uniforms, so any palette works.

const MAX_COLORS = 6

const VERTEX = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'

const FRAGMENT = `precision mediump float;
uniform vec2 r;
uniform float t;
uniform vec2 o;
uniform vec3 pal[${MAX_COLORS}];
uniform float n;
uniform float dur;
uniform float reach;
uniform float glow;
uniform float amp;
float band(float d,float f,float w){float x=(d-f)/w;return exp(-x*x);}
vec3 palette(float x){
  float s=fract(x)*n;
  float i=floor(s);
  float j=mod(i+1.,n);
  vec3 a=pal[0];
  vec3 b=pal[0];
  for(int k=0;k<${MAX_COLORS};k++){
    if(float(k)==i)a=pal[k];
    if(float(k)==j)b=pal[k];
  }
  return mix(a,b,smoothstep(0.,1.,fract(s)));
}
vec3 front(float d,float f,float w,float s,float ph){
  vec3 c=palette(ph+.08)*band(d,f+.03*s,w)+palette(ph)*band(d,f,w)+palette(ph-.08)*band(d,f-.03*s,w);
  return c*.8+vec3(band(d,f,w*.45))*.55;
}
void main(){
  vec2 uv=vec2(gl_FragCoord.x/r.x,1.-gl_FragCoord.y/r.y);
  vec2 p=(uv-o)*vec2(r.x/r.y,1.);
  float a=atan(p.x,p.y);
  float d=length(p*vec2(1.,.92));
  float s=reach/1.35;
  float ph=a*.35+t*.25;
  float e=1.-pow(1.-clamp(t/dur,0.,1.),3.);
  float f=e*reach;
  float dd=d+(sin(a*7.+t*6.)*.012+sin(a*13.-t*9.)*.007+sin(a*3.+t*2.)*.018)*smoothstep(0.,.25,f);
  float w=(.022+.05*e)*s;
  vec3 c=front(dd,f,w,s,ph);
  c+=palette(ph)*smoothstep(f,0.,dd)*exp(-(f-dd)/s*2.2)*.38;
  c+=exp(-d/s*9.)*smoothstep(0.,.15,t)*smoothstep(.6,.2,t)*1.4*vec3(.85,.9,1.);
  c*=1.5*smoothstep(dur+1.1,dur+.3,t);
  if(glow>0.){
    vec3 g=vec3(0.);
    float since=t-dur*.6;
    for(int k=0;k<2;k++){
      float e2=fract(since*.11+float(k)*.5);
      float f2=e2*reach*1.2;
      float d2=d+(sin(a*7.+t*1.5)*.012+sin(a*3.-t)*.018)*smoothstep(0.,.3,f2);
      float w2=(.04+.08*e2)*s;
      g+=palette(a*.3+e2*.8+t*.03)*(band(d2,f2,w2)+smoothstep(f2,0.,d2)*exp(-(f2-d2)/s*2.2)*.6)*(1.-e2);
    }
    g+=palette(t*.05)*exp(-d/s*3.)*.35;
    c+=g*.55*glow*smoothstep(0.,1.,since);
  }
  c=min(c*amp,vec3(1.));
  gl_FragColor=vec4(c,max(c.r,max(c.g,c.b)));
}`

type LightWaveOptions = {
  /** Where the light comes from, as a share of the box: x 0–1 left to right, y 0–1 top to bottom. */
  origin: { x: number; y: number }
  /** 2–6 CSS colours or tokens, cycled around the front. */
  colors: string[]
  /** The main wave, in milliseconds. */
  duration: number
  /** Keep faint fronts of the same light coming after the wave, until stopped. */
  afterglow: boolean
  /** 0–1.5: how bright the light is. */
  intensity: number
  /** Called once when the main wave has passed. */
  onDone?: () => void
}

type NavigatorHints = Navigator & {
  deviceMemory?: number
  connection?: { saveData?: boolean }
}

// The light is soft, so it never needs the screen's own density: CSS pixels at most, half of them
// on weak devices (little memory, few cores, data saver). The phones this matters on are the ones
// that would drop frames at full size.
const pickScale = () => {
  const hints = navigator as NavigatorHints
  const isWeak =
    (hints.deviceMemory ?? 8) <= 4 ||
    (hints.hardwareConcurrency ?? 8) <= 4 ||
    hints.connection?.saveData === true
  return isWeak ? 0.5 : 0.75
}

const MIN_SCALE = 0.3
// After this many frames slower than SLOW_FRAME_MS the canvas drops to a smaller size.
const SLOW_FRAMES = 6
const SLOW_FRAME_MS = 24
const FADE_AFTER_WAVE_S = 1.2

/** Plays the wave on `canvas`; returns a stop function, or null without WebGL. */
const startLightWave = (
  canvas: HTMLCanvasElement,
  { origin, colors, duration, afterglow, intensity, onDone }: LightWaveOptions,
): (() => void) | null => {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  })
  if (!gl) return null

  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)
    if (!shader) return null
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null
  }
  const vertex = compile(gl.VERTEX_SHADER, VERTEX)
  const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT)
  const program = gl.createProgram()
  if (!vertex || !fragment || !program) return null
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null
  // biome-ignore lint/correctness/useHookAtTopLevel: WebGL's useProgram, not a React hook
  gl.useProgram(program)

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const position = gl.getAttribLocation(program, 'p')
  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

  const palette = colors.slice(0, MAX_COLORS).map(toRgb)
  const padded: Rgb[] = Array.from(
    { length: MAX_COLORS },
    (_, index) => palette[index] ?? palette[0] ?? [1, 1, 1],
  )
  gl.uniform3fv(gl.getUniformLocation(program, 'pal'), padded.flat())
  gl.uniform1f(gl.getUniformLocation(program, 'n'), Math.max(1, palette.length))
  gl.uniform2f(gl.getUniformLocation(program, 'o'), origin.x, origin.y)
  gl.uniform1f(gl.getUniformLocation(program, 'dur'), duration / 1000)
  gl.uniform1f(gl.getUniformLocation(program, 'glow'), afterglow ? 1 : 0)
  gl.uniform1f(gl.getUniformLocation(program, 'amp'), intensity)
  const size = gl.getUniformLocation(program, 'r')
  const reach = gl.getUniformLocation(program, 'reach')
  const time = gl.getUniformLocation(program, 't')

  let scale = pickScale()
  const resize = () => {
    const width = Math.max(1, Math.round(canvas.clientWidth * scale))
    const height = Math.max(1, Math.round(canvas.clientHeight * scale))
    canvas.width = width
    canvas.height = height
    gl.viewport(0, 0, width, height)
    gl.uniform2f(size, width, height)
    // Out to the farthest corner, in the shader's units (the box's height is 1).
    const aspect = width / height
    const dx = Math.max(origin.x, 1 - origin.x) * aspect
    const dy = Math.max(origin.y, 1 - origin.y)
    gl.uniform1f(reach, Math.hypot(dx, dy) * 1.05)
  }
  resize()
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)

  const start = performance.now()
  const end = afterglow ? Number.POSITIVE_INFINITY : duration / 1000 + FADE_AFTER_WAVE_S
  let frame = 0
  let last = start
  let slowFrames = 0
  let isDoneCalled = false

  const draw = (now: number) => {
    const seconds = (now - start) / 1000
    if (now - last > SLOW_FRAME_MS) slowFrames += 1
    else slowFrames = 0
    last = now
    if (slowFrames >= SLOW_FRAMES && scale > MIN_SCALE) {
      scale = Math.max(MIN_SCALE, scale * 0.7)
      slowFrames = 0
      resize()
    }
    gl.uniform1f(time, seconds)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    if (!isDoneCalled && seconds * 1000 >= duration) {
      isDoneCalled = true
      onDone?.()
    }
    if (seconds < end) frame = requestAnimationFrame(draw)
    else gl.clear(gl.COLOR_BUFFER_BIT)
  }
  frame = requestAnimationFrame(draw)

  return () => {
    cancelAnimationFrame(frame)
    observer.disconnect()
    // Give the GPU memory back at once instead of waiting for garbage collection — on phones
    // the browser keeps only a few contexts alive.
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
}

export type { LightWaveOptions }
export { MAX_COLORS, startLightWave }
