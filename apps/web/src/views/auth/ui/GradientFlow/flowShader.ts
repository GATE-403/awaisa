// Slow waves of colour like light through tinted glass: diagonal bands bent into S-curves, a
// dark trough between the warm and the cool, and a fine film grain on top.

const VERTEX = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`

const FRAGMENT = `precision highp float;
uniform vec2 r;
uniform float t;
uniform vec3 c0;
uniform vec3 c1;
uniform vec3 c2;
uniform vec3 c3;
uniform vec3 c4;
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
vec3 ramp(float y){
  vec3 c=mix(c0,c1,smoothstep(.12,.40,y));
  c=mix(c,c2,smoothstep(.34,.52,y));
  c=mix(c,c2*vec3(1.,.45,.3),smoothstep(.52,.66,y));
  c=mix(c,vec3(0.),smoothstep(.60,.80,y));
  c=mix(c,c3,smoothstep(.82,1.05,y));
  return mix(c,c4,smoothstep(1.,1.25,y));
}
void main(){
  vec2 uv=gl_FragCoord.xy/r;
  float x=uv.x*1.6;
  float y=1.-uv.y;
  float warp=.17*sin(x*2.3+t*.3+1.)+.05*sin(x*4.1-t*.4+2.);
  y+=warp-(uv.x-.5)*.26;
  vec3 c=ramp(y);
  c+=(hash(gl_FragCoord.xy+fract(t))-.5)*.05;
  gl_FragColor=vec4(c,1.);
}`

type Palette = [string, string, string, string, string]

const toRgb = (color: string): [number, number, number] => {
  const probe = document.createElement('canvas').getContext('2d')
  if (!probe) return [0, 0, 0]
  probe.fillStyle = color
  probe.fillRect(0, 0, 1, 1)
  const [red = 0, green = 0, blue = 0] = probe.getImageData(0, 0, 1, 1).data
  return [red / 255, green / 255, blue / 255]
}

/** Runs the flow on `canvas` until stopped; null when WebGL is missing. `isStill` draws one frame. */
const startFlow = (
  canvas: HTMLCanvasElement,
  palette: Palette,
  isStill: boolean,
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
  palette.forEach((color, index) => {
    gl.uniform3f(gl.getUniformLocation(program, `c${index}`), ...toRgb(color))
  })
  const size = gl.getUniformLocation(program, 'r')
  const time = gl.getUniformLocation(program, 't')

  // A gradient this soft needs few pixels: half resolution, scaled up by the browser.
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
    gl.uniform1f(time, isStill ? 4 : (now - start) / 1000)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    if (!isStill) frame = requestAnimationFrame(draw)
  }
  frame = requestAnimationFrame(draw)

  return () => {
    cancelAnimationFrame(frame)
    observer.disconnect()
  }
}

export type { Palette }
export { startFlow }
