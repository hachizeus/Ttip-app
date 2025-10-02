import React from 'react'
import { View } from 'react-native'

interface ScreenTransitionProps {
  children: React.ReactNode
}

export default function ScreenTransition({ children }: ScreenTransitionProps) {
  return <View>{children}</View>
}