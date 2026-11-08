import { ActivityIndicator, StyleSheet, View } from 'react-native'

export const LoadingView = () => (
  <View style={styles.container}>
    <ActivityIndicator size='large' />
  </View>
)

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
