// Slow waves of colour like light through tinted glass: diagonal bands bent into S-curves, a
// dark trough between the warm and the cool, and a fine film grain. The bands are laid out from
// the canvas's foot (`BAND` pixels up), so however tall the screen is, the colour reaches its
// top as sky.

const FLOW_FRAGMENT = `precision highp float;
uniform vec2 r;
uniform float t;
uniform vec3 c0;
uniform vec3 c1;
uniform vec3 c2;
uniform vec3 c3;
uniform vec3 c4;
const float BAND=330.;
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
  float y=1.-gl_FragCoord.y/BAND;
  float warp=.17*sin(x*2.3+t*.3+1.)+.05*sin(x*4.1-t*.4+2.);
  y+=warp-(uv.x-.5)*.26;
  vec3 c=ramp(y);
  c+=(hash(gl_FragCoord.xy+fract(t))-.5)*.05;
  gl_FragColor=vec4(c,1.);
}`

// What the wave of light leaves behind: from the top edge, every few seconds, a faint front of
// the same light runs down and splits into the system colours, with a glow trailing after it —
// laid over the page colour `b`, so the screen keeps its theme under the light.
const GLOW_FRAGMENT = `precision highp float;
uniform vec2 r;
uniform float t;
uniform vec3 b;
uniform vec3 c0;
uniform vec3 c1;
uniform vec3 c2;
uniform vec3 c3;
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
float band(float d,float f,float w){float x=(d-f)/w;return exp(-x*x);}
vec3 tint(float a){
  float f=fract(a)*4.;
  vec3 c=mix(c0,c1,smoothstep(0.,1.,f));
  c=mix(c,c2,smoothstep(1.,2.,f));
  c=mix(c,c3,smoothstep(2.,3.,f));
  return mix(c,c0,smoothstep(3.,4.,f));
}
void main(){
  vec2 uv=gl_FragCoord.xy/r;
  vec2 p=(uv-vec2(.5,1.02))*vec2(r.x/r.y,1.);
  float a=atan(p.x,-p.y);
  float d=length(p*vec2(1.,.92));
  vec3 glow=vec3(0.);
  for(int k=0;k<2;k++){
    float e=fract(t*.11+float(k)*.5);
    float f=e*1.7;
    float dd=d+(sin(a*7.+t*1.5)*.012+sin(a*3.-t)*.018)*smoothstep(0.,.3,f);
    float w=.04+.08*e;
    float front=band(dd,f,w);
    float trail=smoothstep(f,0.,dd)*exp(-(f-dd)*2.2)*.6;
    glow+=tint(a*.3+e*.8+t*.03)*(front+trail)*(1.-e);
  }
  glow+=tint(t*.05)*exp(-d*3.)*.35;
  vec3 c=mix(b,min(glow*1.4,vec3(1.)),clamp(length(glow),0.,.55));
  c+=(hash(gl_FragCoord.xy+fract(t))-.5)*.03;
  gl_FragColor=vec4(c,1.);
}`

export { FLOW_FRAGMENT, GLOW_FRAGMENT }
