import { controlHeight, fontWeight, radius, spacing, text } from '@awaisa/tokens'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useThemeColors } from '../../hooks/useThemeColors'

interface ErrorViewProps {
  message: string
  onRetry: () => void
}

export const ErrorView = ({ message, onRetry }: ErrorViewProps) => {
  const themeColors = useThemeColors()

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Text style={[styles.title, { color: themeColors.foreground }]}>Не удалось загрузить</Text>
      <Text style={[styles.message, { color: themeColors.mutedForeground }]}>{message}</Text>
      <Pressable
        style={[styles.button, { backgroundColor: themeColors.primary }]}
        onPress={onRetry}
      >
        <Text style={[styles.buttonText, { color: themeColors.primaryForeground }]}>Повторить</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
    gap: spacing[3],
  },
  title: {
    fontSize: text.lg.size,
    lineHeight: text.lg.lineHeight,
    fontWeight: String(fontWeight.semibold) as '600',
  },
  message: { fontSize: text.sm.size, lineHeight: text.sm.lineHeight, textAlign: 'center' },
  button: {
    justifyContent: 'center',
    height: controlHeight.md,
    paddingHorizontal: spacing[4],
    borderRadius: radius.lg,
  },
  buttonText: {
    fontSize: text.sm.size,
    lineHeight: text.sm.lineHeight,
    fontWeight: String(fontWeight.medium) as '500',
  },
})
