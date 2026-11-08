import { type ColorScheme, colors } from '@awaisa/tokens'
import { useColorScheme } from 'react-native'

export const useThemeColors = (): ColorScheme => {
  const scheme = useColorScheme()

  return scheme === 'dark' ? colors.dark : colors.light
}
