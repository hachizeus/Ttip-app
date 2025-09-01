import { Platform } from 'react-native'

// M-Pesa uses SF Pro on iOS and Roboto on Android
export const fonts = {
  regular: Platform.select({
    ios: 'SF Pro Text',
    android: 'Roboto',
    default: 'System'
  }),
  medium: Platform.select({
    ios: 'SF Pro Text',
    android: 'Roboto-Medium',
    default: 'System'
  }),
  bold: Platform.select({
    ios: 'SF Pro Text',
    android: 'Roboto-Bold',
    default: 'System'
  }),
  light: Platform.select({
    ios: 'SF Pro Text',
    android: 'Roboto-Light',
    default: 'System'
  }),
  thin: Platform.select({
    ios: 'SF Pro Text',
    android: 'Roboto-Thin',
    default: 'System'
  })
}

export const fontWeights = {
  thin: '100',
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700'
}