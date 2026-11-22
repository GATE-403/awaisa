import { clearLastNotificationResponseAsync, useLastNotificationResponse } from 'expo-notifications'
import { StatusBar } from 'expo-status-bar'
import { useCallback, useEffect, useRef, useState } from 'react'
import { KeyboardAvoidingView, Linking, Platform, StyleSheet } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview'
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes'
import { ErrorView } from './common/components/ErrorView/ErrorView'
import { LoadingView } from './common/components/LoadingView/LoadingView'
import { useAndroidBackHandler } from './common/hooks/useAndroidBackHandler'
import { useThemeColors } from './common/hooks/useThemeColors'
import { playHaptic } from './common/utils/haptics'
import { parseNativeMessage, toWebScript } from './common/utils/nativeBridge'
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
    <SafeAreaProvider>
      <SafeAreaView style={[styles.container, backgroundStyle]} edges={['top']}>
        <StatusBar style='auto' />
        {error && <ErrorView message={error} onRetry={handleRetry} />}
        {/* Android draws edge to edge, so the window no longer shrinks for the keyboard: the page
            stayed full height and panned up by the keyboard's height to reveal a field fixed at its
            foot (the cabinet's settings search), taking the whole page with it. Shrinking the
            WebView above the keyboard lets the page lay itself out like in a browser that resizes.
            iOS: WKWebView handles the keyboard itself. */}
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'android' ? 'padding' : undefined}
          enabled={Platform.OS === 'android'}
        >
          <AppWebView
            ref={webViewRef}
            style={[styles.container, backgroundStyle, error && styles.hidden]}
            source={{ uri: sourceUri }}
            injectedJavaScriptBeforeContentLoaded={NATIVE_APP_SCRIPT}
            onMessage={handleMessage}
            onNavigationStateChange={handleNavigationStateChange}
            onShouldStartLoadWithRequest={handleShouldStartLoad}
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
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hidden: { display: 'none' },
})
