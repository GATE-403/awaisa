import { useEffect } from 'react'
import { BackHandler } from 'react-native'

export const useAndroidBackHandler = (canGoBack: boolean, onBack: () => void) => {
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack) return false

      onBack()
      return true
    })

    return () => subscription.remove()
  }, [canGoBack, onBack])
}
