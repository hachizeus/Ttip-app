import React from 'react'
import { TouchableOpacity, StyleSheet } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'

interface FloatingActionButtonProps {
  onPress: () => void
  icon?: string
  color?: string
}

export default function FloatingActionButton({ 
  onPress, 
  icon = 'qr-code', 
  color = '#0052CC' 
}: FloatingActionButtonProps) {
  return (
    <TouchableOpacity style={[styles.fab, { backgroundColor: color }]} onPress={onPress}>
      <MaterialIcons name={icon as any} size={24} color="#fff" />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
})