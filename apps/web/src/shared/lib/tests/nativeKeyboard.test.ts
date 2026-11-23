import { afterEach, describe, expect, it, vi } from 'vitest'
import { holdKeyboardOverlay } from '../nativeKeyboard'

const posted: string[] = []

const asAndroidApp = () => {
  vi.stubGlobal('window', {
    __NATIVE_APP__: { platform: 'android', version: '1.0.0' },
    ReactNativeWebView: { postMessage: (message: string) => posted.push(message) },
  })
}

const modes = () => posted.map((message) => JSON.parse(message).mode)

afterEach(() => {
  vi.unstubAllGlobals()
  posted.length = 0
})

describe('holdKeyboardOverlay', () => {
  it('asks for overlay once and gives the WebView back when the last holder lets go', () => {
    asAndroidApp()
    const sheet = holdKeyboardOverlay()
    const search = holdKeyboardOverlay()
    expect(modes()).toEqual(['overlay'])

    sheet()
    expect(modes()).toEqual(['overlay'])
    // A second release of the same hold counts once.
    sheet()
    search()
    expect(modes()).toEqual(['overlay', 'resize'])
  })

  it('does nothing outside the Android app', () => {
    vi.stubGlobal('window', {
      __NATIVE_APP__: { platform: 'ios', version: '1.0.0' },
      ReactNativeWebView: { postMessage: (message: string) => posted.push(message) },
    })
    holdKeyboardOverlay()()
    expect(posted).toEqual([])
  })
})
