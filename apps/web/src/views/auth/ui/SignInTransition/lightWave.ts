// A wave of light from the top edge, like two phones sharing a contact: a wobbling front that
// splits into colours as it runs down the screen, with a fading glow behind it. One fragment
// shader on a full-screen quad; no library.

const VERTEX = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`

const FRAGMENT = `precision highp float;
uniform vec2 r;
uniform float t;
float band(float d,float f,float w){float x=(d-f)/w;return exp(-x*x);}
void main(){
  vec2 uv=gl_FragCoord.xy/r;
  vec2 p=(uv-vec2(.5,1.02))*vec2(r.x/r.y,1.);
  float a=atan(p.x,-p.y);
  float d=length(p*vec2(1.,.92));
  float e=1.-pow(1.-clamp(t/1.5,0.,1.),3.);
  float f=e*1.35;
  float wob=sin(a*7.+t*6.)*.012+sin(a*13.-t*9.)*.007+sin(a*3.+t*2.)*.018;
  float dd=d+wob*smoothstep(0.,.25,f);
  float w=.022+.05*e;
  vec3 c=vec3(band(dd,f+.03,w),band(dd,f,w),band(dd,f-.03,w));
  c=mix(c,vec3(band(dd,f,w*.45)),.55);
  vec3 tint=.5+.5*cos(6.2831*(a*.35+t*.25+vec3(0.,.33,.67)));
  c*=mix(vec3(1.),tint,.55);
  c+=smoothstep(f,0.,dd)*exp(-(f-dd)*2.2)*.38*tint;
  c+=exp(-d*9.)*smoothstep(0.,.15,t)*smoothstep(.6,.2,t)*1.4*vec3(.85,.9,1.);
  gl_FragColor=vec4(c*1.5*smoothstep(2.6,1.8,t),1.);
}`

const DURATION = 2.6

/** Plays the wave on `canvas` once; returns a stop function, or null when WebGL is missing. */
const playLightWave = (canvas: HTMLCanvasElement): (() => void) | null => {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false })
  if (!gl) return null

  const ratio = Math.min(2, window.devicePixelRatio || 1)
  canvas.width = Math.round(canvas.clientWidth * ratio)
  canvas.height = Math.round(canvas.clientHeight * ratio)

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
  gl.uniform2f(gl.getUniformLocation(program, 'r'), canvas.width, canvas.height)
  gl.viewport(0, 0, canvas.width, canvas.height)
  const time = gl.getUniformLocation(program, 't')

  const start = performance.now()
  let frame = 0
  const draw = (now: number) => {
    const seconds = (now - start) / 1000
    gl.uniform1f(time, seconds)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    if (seconds < DURATION) frame = requestAnimationFrame(draw)
  }
  frame = requestAnimationFrame(draw)

  return () => cancelAnimationFrame(frame)
}

export { playLightWave }
