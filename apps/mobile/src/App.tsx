import { clearLastNotificationResponseAsync, useLastNotificationResponse } from 'expo-notifications'
import { StatusBar } from 'expo-status-bar'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Linking, Platform, StyleSheet } from 'react-native'
import {
  KeyboardAvoidingView,
  KeyboardEvents,
  KeyboardProvider,
} from 'react-native-keyboard-controller'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview'
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes'
import { ErrorView } from './common/components/ErrorView/ErrorView'
import { LoadingView } from './common/components/LoadingView/LoadingView'
import { useAndroidBackHandler } from './common/hooks/useAndroidBackHandler'
import { useThemeColors } from './common/hooks/useThemeColors'
import { playHaptic } from './common/utils/haptics'
import { type KeyboardMode, parseNativeMessage, toWebScript } from './common/utils/nativeBridge'
import { getNotificationPath, getPushState } from './common/utils/pushNotifications'
import { NATIVE_APP_SCRIPT, WEB_ORIGIN, WEB_URL } from './constants/webApp'

// react-native-webview types props as `WebViewProps & P` with `P = undefined`, which TS 6 reduces to `never`.
const AppWebView = WebView<object>
type AppWebView = WebView<object>

export const App = () => {
  const webViewRef = useRef<AppWebView>(null)
  const [canGoBack, setCanGoBack] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Where the WebView starts: the site, or the screen a tapped push opened the app with.
  const [sourceUri, setSourceUri] = useState(WEB_URL)
  const isLoadedRef = useRef(false)
  // The page asks for `overlay` while the booking sheet is open (see `KeyboardMode`).
  const [keyboardMode, setKeyboardMode] = useState<KeyboardMode>('resize')
  const notificationResponse = useLastNotificationResponse()
  const themeColors = useThemeColors()
  const goBack = useCallback(() => webViewRef.current?.goBack(), [])
  const backgroundStyle = { backgroundColor: themeColors.background }

  useAndroidBackHandler(canGoBack, goBack)

  // A tapped booking push opens its day in the cabinet or «Мой день»; also when it launched the app.
  useEffect(() => {
    const path = getNotificationPath(notificationResponse)
    if (!path) return
    const url = `${WEB_ORIGIN}${path}`
    if (isLoadedRef.current) {
      webViewRef.current?.injectJavaScript(`window.location.assign(${JSON.stringify(url)}); true;`)
    } else {
      setSourceUri(url)
    }
    // Handled once: the next launch starts on the site, not on this push again.
    void clearLastNotificationResponseAsync()
  }, [notificationResponse])

  // Android: the keyboard's height goes to the page as it starts to show or hide, with how long it
  // takes, so a page in `overlay` mode moves with it (its `keyboardDidShow` came only once the
  // keyboard was up, so the page caught up afterwards). The height is the keyboard's final one,
  // read from the window insets when its animation starts. iOS: WKWebView handles the keyboard,
  // the page reads its visual viewport.
  useEffect(() => {
    if (Platform.OS !== 'android') return
    const send = (height: number, duration: number) =>
      webViewRef.current?.injectJavaScript(
        toWebScript({ type: 'keyboard', height: Math.round(height), duration }),
      )
    const shown = KeyboardEvents.addListener('keyboardWillShow', (event) =>
      send(event.height, event.duration),
    )
    const hidden = KeyboardEvents.addListener('keyboardWillHide', (event) =>
      send(0, event.duration),
    )

    return () => {
      shown.remove()
      hidden.remove()
    }
  }, [])

  const answerPush = async (shouldAsk: boolean) => {
    const state = await getPushState(shouldAsk)
    webViewRef.current?.injectJavaScript(toWebScript(state))
  }

  const handleMessage = (event: WebViewMessageEvent) => {
    const message = parseNativeMessage(event.nativeEvent.data)
    if (message?.type === 'openExternal') void Linking.openURL(message.url)
    if (message?.type === 'haptic') void playHaptic(message.style)
    if (message?.type === 'pushStatus') void answerPush(false)
    if (message?.type === 'pushEnable') void answerPush(true)
    if (message?.type === 'keyboardMode') setKeyboardMode(message.mode)
  }

  const handleNavigationStateChange = (navigation: WebViewNavigation) => {
    setCanGoBack(navigation.canGoBack)
  }

  const handleShouldStartLoad = (request: ShouldStartLoadRequest) => {
    if (request.url.startsWith(WEB_ORIGIN) || request.url === 'about:blank') return true

    void Linking.openURL(request.url)
    return false
  }

  const handleRetry = () => {
    setError(null)
    webViewRef.current?.reload()
  }

  return (
    // Expo draws edge to edge (react-native-edge-to-edge), which keyboard-controller follows by
    // itself: the keyboard's height is the whole part of the screen it covers, the box the WebView
    // fills. Its own translucency props are ignored there.
    <KeyboardProvider>
      <SafeAreaProvider>
        <SafeAreaView style={[styles.container, backgroundStyle]} edges={['top']}>
          <StatusBar style='auto' />
          {error && <ErrorView message={error} onRetry={handleRetry} />}
          {/* Android draws edge to edge, so the window no longer shrinks for the keyboard: the page
            stayed full height and panned up by the keyboard's height to reveal a field fixed at its
            foot (the cabinet's settings search), taking the whole page with it. Shrinking the
            WebView above the keyboard lets the page lay itself out like in a browser that resizes.
            keyboard-controller's view follows the keyboard frame by frame. iOS: WKWebView handles
            the keyboard itself. A page that moves itself for the keyboard
            (the booking sheet) asks for `overlay`: the WebView keeps its size, so the long page
            under the sheet is not laid out again while the keyboard slides in. */}
          <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'android' ? 'padding' : undefined}
            enabled={Platform.OS === 'android' && keyboardMode === 'resize'}
          >
            <AppWebView
              ref={webViewRef}
              style={[styles.container, backgroundStyle, error && styles.hidden]}
              source={{ uri: sourceUri }}
              injectedJavaScriptBeforeContentLoaded={NATIVE_APP_SCRIPT}
              onMessage={handleMessage}
              onNavigationStateChange={handleNavigationStateChange}
              onShouldStartLoadWithRequest={handleShouldStartLoad}
              // A new page starts in `resize`: one that left without saying so (a reload, a full
              // navigation) must not leave the next page's fields under the keyboard.
              onLoadStart={() => setKeyboardMode('resize')}
              onLoadEnd={() => {
                isLoadedRef.current = true
              }}
              onError={(event) => setError(event.nativeEvent.description)}
              onHttpError={(event) => setError(`HTTP ${event.nativeEvent.statusCode}`)}
              renderLoading={() => <LoadingView />}
              startInLoadingState
              allowsBackForwardNavigationGestures
              pullToRefreshEnabled
              sharedCookiesEnabled
              setSupportMultipleWindows={false}
            // iOS: no «˄ ˅ Готово» bar over the keyboard, like a native app. WKWebView in the app
            // left it out when it lifted a field over the keyboard, so the cabinet's search at the
            // window's foot stayed half under it. A tap outside the field closes the keyboard.
            hideKeyboardAccessoryView
              // Development builds only: Chrome's remote DevTools can then profile the page on the
              // phone (chrome://inspect).
              webviewDebuggingEnabled={__DEV__}
            />
          </KeyboardAvoidingView>
        </SafeAreaView>
      </SafeAreaProvider>
    </KeyboardProvider>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hidden: { display: 'none' },
})
