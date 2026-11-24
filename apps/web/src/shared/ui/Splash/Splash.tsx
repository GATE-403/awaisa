import { useLingui } from '@lingui/react/macro'
import { WORDMARK_PATH } from '@/shared/ui/Logo/Logo'
import { MASCOT_PATH } from '@/shared/ui/Mascot/Mascot'
import styles from './Splash.module.css'

const SEEN_KEY = 'awaisa:splash:v1'
// Long enough to read as a greeting, not a flash; the page is usually ready before it ends.
const MIN_MS = 900
const MAX_MS = 2500
const FADE_MS = 320

// Hides at once for a tab that has seen it (and for automated browsers - tests never wait); otherwise once the page is parsed (at least MIN_MS
// after it started, at most MAX_MS), fading out through `data-splash` on <html>.
const SCRIPT = `(()=>{const r=document.documentElement;if(navigator.webdriver){r.dataset.splash='done';return}try{if(sessionStorage.getItem('${SEEN_KEY}')){r.dataset.splash='done';return}sessionStorage.setItem('${SEEN_KEY}','1')}catch(e){}const t=performance.now();let g=0;const out=()=>{if(g)return;g=1;setTimeout(()=>{r.dataset.splash='out';setTimeout(()=>{r.dataset.splash='done'},${FADE_MS})},Math.max(0,${MIN_MS}-(performance.now()-t)))};document.addEventListener('DOMContentLoaded',out,{once:true});setTimeout(out,${MAX_MS})})()`

const markup = (text: string) => `<div class="${styles.splash}" aria-hidden="true">
<div class="${styles.stage}"><svg class="${styles.mascot}" viewBox="0 0 30 32" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="${MASCOT_PATH}"/></svg><span class="${styles.shadow}"></span></div>
<svg class="${styles.wordmark}" viewBox="0 0 32 6" fill="currentColor"><path d="${WORDMARK_PATH}"/></svg>
<p class="${styles.text}">${text}</p>
</div><script>${SCRIPT}</script>`

// The first screen of a visit (a new tab, or the app's launch): the mascot hopping over its
// shadow, the wordmark and one line - plain HTML painted before any script loads, so it covers
// the page while it streams in. Later navigations keep the page skeletons.
export const Splash = () => {
  const { t } = useLingui()

  return (
    <div
      suppressHydrationWarning
      // biome-ignore lint/security/noDangerouslySetInnerHtml: static markup and script, no user input
      dangerouslySetInnerHTML={{ __html: markup(t`Book specialists, no calls`) }}
    />
  )
}
