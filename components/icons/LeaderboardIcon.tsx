import React from 'react'
import Svg, { Path } from 'react-native-svg'

interface LeaderboardIconProps {
  size?: number
  color?: string
  focused?: boolean
}

export default function LeaderboardIcon({ size = 24, color = '#000', focused = false }: LeaderboardIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6.5,12h-4a.5.5,0,0,0-.5.5V20H7V12.5A.5.5,0,0,0,6.5,12Z" fill="none" stroke={color} strokeWidth="1.5" strokeOpacity={focused ? 1 : 0.6} />
      <Path d="M14,4H10a.5.5,0,0,0-.5.5V20h5V4.5A.5.5,0,0,0,14,4Z" fill="none" stroke={color} strokeWidth="1.5" strokeOpacity={focused ? 1 : 0.6} />
      <Path d="M21.5,8h-4a.5.5,0,0,0-.5.5V20h5V8.5A.5.5,0,0,0,21.5,8Z" fill="none" stroke={color} strokeWidth="1.5" strokeOpacity={focused ? 1 : 0.6} />
    </Svg>
  )
}