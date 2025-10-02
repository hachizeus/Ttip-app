import * as Haptics from 'expo-haptics'

export function useHapticFeedback() {
  const impact = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }
  
  return { impact }
}