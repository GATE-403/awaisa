import { StatusBar } from 'expo-status-bar'
import { useCallback, useRef, useState } from 'react'
import { Linking, StyleSheet } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview'
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes'
import { ErrorView } from './common/components/ErrorView/ErrorView'
import { LoadingView } from './common/components/LoadingView/LoadingView'
import { useAndroidBackHandler } from './common/hooks/useAndroidBackHandler'
import { useThemeColors } from './common/hooks/useThemeColors'
import { parseNativeMessage } from './common/utils/nativeBridge'
import { NATIVE_APP_SCRIPT, WEB_ORIGIN, WEB_URL } from './constants/webApp'

// react-native-webview types props as `WebViewProps & P` with `P = undefined`, which TS 6 reduces to `never`.
const AppWebView = WebView<object>
type AppWebView = WebView<object>

export const App = () => {
  const webViewRef = useRef<AppWebView>(null)
  const [canGoBack, setCanGoBack] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const themeColors = useThemeColors()
  const goBack = useCallback(() => webViewRef.current?.goBack(), [])
  const backgroundStyle = { backgroundColor: themeColors.background }

  useAndroidBackHandler(canGoBack, goBack)

  const handleMessage = (event: WebViewMessageEvent) => {
    const message = parseNativeMessage(event.nativeEvent.data)
    if (message?.type === 'openExternal') void Linking.openURL(message.url)
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
        <AppWebView
          ref={webViewRef}
          style={[styles.container, backgroundStyle, error && styles.hidden]}
          source={{ uri: WEB_URL }}
          injectedJavaScriptBeforeContentLoaded={NATIVE_APP_SCRIPT}
          onMessage={handleMessage}
          onNavigationStateChange={handleNavigationStateChange}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          onError={(event) => setError(event.nativeEvent.description)}
          onHttpError={(event) => setError(`HTTP ${event.nativeEvent.statusCode}`)}
          renderLoading={() => <LoadingView />}
          startInLoadingState
          allowsBackForwardNavigationGestures
          pullToRefreshEnabled
          sharedCookiesEnabled
          setSupportMultipleWindows={false}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hidden: { display: 'none' },
})
