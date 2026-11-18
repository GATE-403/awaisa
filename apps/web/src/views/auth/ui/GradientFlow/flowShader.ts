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

export { FLOW_FRAGMENT }
