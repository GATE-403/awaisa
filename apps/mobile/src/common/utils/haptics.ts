import {
  ImpactFeedbackStyle,
  impactAsync,
  NotificationFeedbackType,
  notificationAsync,
  selectionAsync,
} from 'expo-haptics'
import type { HapticStyle } from './nativeBridge'

// The web asks for feedback by meaning (success, error…); this maps it to the platform's taptic patterns.
export const playHaptic = async (style: HapticStyle) => {
  try {
    if (style === 'selection') return await selectionAsync()
    if (style === 'impact') return await impactAsync(ImpactFeedbackStyle.Medium)
    const type = {
      success: NotificationFeedbackType.Success,
      warning: NotificationFeedbackType.Warning,
      error: NotificationFeedbackType.Error,
    }[style]
    await notificationAsync(type)
  } catch {
    // Devices without a taptic engine simply stay quiet.
  }
}
