// Light through a prism on a dark wall, over the whole screen: a broad diagonal band rising from
// the bottom left to the top right, its colours split across its width (blue and cyan on the
// upper side, a white core, yellow, orange and red on the lower side) and warming along its length
// toward the bottom left, like the owner's reference photo. A fainter second band echoes it. Fine
// film grain over all.
//
// It moves like light through a prism someone turns in their hand («добавь анимацию»):
// - on open the band sweeps in from the right and settles, brightening (`INTRO` seconds);
// - soft waves of light run along it, like glints through moving glass;
// - the spectrum breathes: the colours spread apart, then close back toward white;
// - it leans and drifts after the pointer (`m`, eased in the runner), as if the prism turned;
// - each sign-in step turns the prism a little further (`k`: number → code → name), so the light
//   moves with the person instead of standing still behind the code;
// - signed in, the beam flares wide and bright and sweeps across the screen (`f` 0 → 1): the
//   sign-in's one burst of light.
//
// Light is added onto a near-black base, so it never mixes into grey («грязный цвет»).

const FLOW_FRAGMENT = `precision highp float;
uniform vec2 r;
uniform float t;
uniform vec2 m;
uniform float k;
uniform float f;
const float INTRO=2.4;
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
vec3 band(vec2 q,float angle,float offset,float width,float spread,float power){
  vec2 dir=vec2(cos(angle),sin(angle));
  float along=dot(q,dir);
  float across=dot(q,vec2(-dir.y,dir.x))-offset+.07*along*along;
  float s=across/(width*(1.+.45*(.4-along)));
  vec3 spectrum=vec3(
    exp(-(s+spread)*(s+spread)*1.5),
    exp(-s*s*1.5),
    exp(-(s-spread)*(s-spread)*1.5)
  );
  spectrum*=mix(vec3(1.15,.85,.55),vec3(.55,.8,1.25),smoothstep(-.7,.7,along));
  float glint=.82+.18*sin(along*11.-t*1.4)+.1*sin(along*27.+s*1.5-t*2.3);
  float core=exp(-s*s*3.5)*.55*glint;
  float fade=smoothstep(-1.,-.35,along)*smoothstep(1.05,.4,along);
  return (spectrum*glint+core)*fade*power;
}
void main(){
  vec2 uv=gl_FragCoord.xy/r;
  vec2 q=vec2((uv.x-.5)*r.x/r.y,uv.y-.5);
  float intro=smoothstep(0.,INTRO,t);
  intro=1.-pow(1.-intro,3.);
  vec3 c=vec3(.03,.035,.06)+vec3(.02,.03,.08)*uv.y;
  float sweep=(1.-intro)*.9;
  float lean=m.x*.12-m.y*.05+k*.3+f*.45;
  float drift=m.x*.08+m.y*.06-k*.22+f*.1;
  float flare=1.+f*1.3;
  float spread=.85+.25*sin(t*.42);
  float breathe=.9+.1*sin(t*.5);
  c+=band(q,.98+.04*sin(t*.17)+lean,.2+.04*sin(t*.11)+drift-sweep,.075*(1.+f*1.1),spread,.95*breathe*intro*flare);
  c+=band(q,1.04+.03*sin(t*.13+1.)+lean*.7,-.34+.03*sin(t*.09)+drift*.6-sweep*1.3,.04*(1.+f*.9),spread*.9,.22*intro*flare);
  c+=(hash(gl_FragCoord.xy+fract(t))-.5)*.04;
  gl_FragColor=vec4(c,1.);
}`

export { FLOW_FRAGMENT }
