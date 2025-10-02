import React from 'react'
import { View, Text, Modal } from 'react-native'

interface LanguageModalProps {
  visible: boolean
  onClose: () => void
}

export default function LanguageModal({ visible, onClose }: LanguageModalProps) {
  return (
    <Modal visible={visible} onRequestClose={onClose}>
      <View>
        <Text>Language Selection</Text>
      </View>
    </Modal>
  )
}