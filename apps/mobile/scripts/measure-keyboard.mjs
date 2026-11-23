#!/usr/bin/env node
// Frame rate while the keyboard slides in, measured on a phone attached by USB, in the app's WebView
// (Expo Go or a development build with `webviewDebuggingEnabled`). Open the screen to measure in the
// app first, then:
//
//   node apps/mobile/scripts/measure-keyboard.mjs --field '[name="phone"]' [--runs 3] [--modes overlay,resize]
//
// Each run taps the field with adb, records every animation frame of the page for 1.2 s from the
// focus, then takes the caret away. `overlay` is how the page meets the keyboard now; `resize`
// is the baseline: the page's own requests for `overlay` are held back, so the app shrinks the
// WebView. Judge speed on a production build of the web app (`pnpm build && pnpm start`).
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    field: { type: 'string' },
    runs: { type: 'string', default: '3' },
    modes: { type: 'string', default: 'overlay,resize' },
    port: { type: 'string', default: '9333' },
  },
})
if (!values.field) {
  console.error(
    'Usage: measure-keyboard.mjs --field <css selector> [--runs 3] [--modes overlay,resize]',
  )
  process.exit(1)
}

const WINDOW_MS = 1200
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const findAdb = () => {
  const sdk = process.env.ANDROID_HOME ?? join(homedir(), 'Library/Android/sdk')
  const inSdk = join(sdk, 'platform-tools/adb')
  return existsSync(inSdk) ? inSdk : 'adb'
}
const ADB = findAdb()
const adb = (...args) => execFileSync(ADB, args, { encoding: 'utf8' }).trim()

// The newest WebView DevTools socket on the phone, forwarded to a local port.
const sockets = adb('shell', 'cat', '/proc/net/unix').match(/webview_devtools_remote_\d+/g)
if (!sockets) {
  console.error('No WebView DevTools socket: is the app open with webviewDebuggingEnabled?')
  process.exit(1)
}
const socket = sockets.sort().at(-1)
adb('forward', `tcp:${values.port}`, `localabstract:${socket}`)

const pages = await (await fetch(`http://localhost:${values.port}/json`)).json()
const target = pages.find((page) => page.type === 'page')
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true })
  ws.addEventListener('error', reject, { once: true })
})
let nextId = 0
const evaluate = (expression) =>
  new Promise((resolve, reject) => {
    const id = ++nextId
    const onMessage = (event) => {
      const message = JSON.parse(event.data)
      if (message.id !== id) return
      ws.removeEventListener('message', onMessage)
      if (message.result?.exceptionDetails) reject(new Error(message.result.exceptionDetails.text))
      else resolve(message.result?.result?.value)
    }
    ws.addEventListener('message', onMessage)
    ws.send(
      JSON.stringify({
        id,
        method: 'Runtime.evaluate',
        params: { expression, awaitPromise: true, returnByValue: true },
      }),
    )
  })

// The WebView fills the screen below the status bar: page pixels to screen pixels.
const [screenWidth, screenHeight] = adb('shell', 'wm', 'size')
  .match(/(\d+)x(\d+)/)
  .slice(1)
  .map(Number)

const field = JSON.stringify(values.field)

const run = async (mode) => {
  const point = await evaluate(`(() => {
    const field = document.querySelector(${field})
    if (!field) throw new Error('No field ' + ${field})
    field.scrollIntoView({ block: 'center' })
    const box = field.getBoundingClientRect()
    return { x: box.left + box.width / 2, y: box.top + box.height / 2, dpr: devicePixelRatio, height: innerHeight, width: innerWidth }
  })()`)
  await evaluate(`(() => {
    const port = window.ReactNativeWebView
    port.__post ??= port.postMessage.bind(port)
    // The baseline keeps the WebView resizing: the page's own «overlay» is not passed on.
    port.postMessage = ${mode === 'resize'}
      ? (message) => { if (!message.includes('"overlay"')) port.__post(message) }
      : port.__post
    port.__post(JSON.stringify({ type: 'keyboardMode', mode: '${mode}' }))
    const record = (window.__keyboardRun = { frames: [], isOn: true, keyboard: [] })
    const loop = (time) => {
      if (!record.isOn) return
      record.frames.push(time)
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
    addEventListener('focusin', () => { record.focus ??= performance.now() }, { once: true })
    addEventListener('awaisa:native', (event) => record.keyboard.push([performance.now(), event.detail]))
    return true
  })()`)
  await sleep(500)
  const scale = screenWidth / point.width
  const top = screenHeight - point.height * scale
  adb(
    'shell',
    'input',
    'tap',
    String(Math.round(point.x * scale)),
    String(Math.round(top + point.y * scale)),
  )
  await sleep(WINDOW_MS + 400)
  const result = await evaluate(`(() => {
    const record = window.__keyboardRun
    record.isOn = false
    const start = record.focus
    if (start === undefined) return null
    const frames = record.frames.filter((time) => time >= start && time <= start + ${WINDOW_MS})
    const gaps = frames.slice(1).map((time, index) => time - frames[index])
    const shown = record.keyboard.find(([, detail]) => detail.type === 'keyboard' && detail.height > 0)
    return {
      fps: Math.round(frames.length / (${WINDOW_MS} / 1000)),
      maxGap: Math.round(Math.max(0, ...gaps)),
      over50: gaps.filter((gap) => gap > 50).length,
      keyboardAfter: shown ? Math.round(shown[0] - start) : null,
    }
  })()`)
  await evaluate(`(() => {
    document.activeElement?.blur()
    const port = window.ReactNativeWebView
    port.postMessage = port.__post
    return true
  })()`)
  await sleep(1200)
  return result
}

const modes = values.modes.split(',')
const rows = []
for (let index = 0; index < Number(values.runs); index++) {
  for (const mode of modes) {
    const result = await run(mode)
    if (!result) console.warn(`${mode}: the tap missed the field, run skipped`)
    else rows.push({ mode, ...result })
  }
}
ws.close()
adb('forward', '--remove', `tcp:${values.port}`)

const median = (numbers) => [...numbers].sort((a, b) => a - b)[Math.floor(numbers.length / 2)]
// biome-ignore lint/suspicious/noConsole: a command-line tool prints its table
console.table(rows)
for (const mode of modes) {
  const own = rows.filter((row) => row.mode === mode)
  if (own.length === 0) continue
  process.stdout.write(
    `${mode}: median ${median(own.map((row) => row.fps))} fps, longest frame ${Math.max(...own.map((row) => row.maxGap))} ms, frames over 50 ms ${own.reduce((sum, row) => sum + row.over50, 0)}\n`,
  )
}
