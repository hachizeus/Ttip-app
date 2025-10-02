import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useTheme } from '../lib/theme-context'

import { fonts } from '../lib/fonts'

interface LogoutModalProps {
  visible: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function LogoutModal({ visible, onClose, onConfirm }: LogoutModalProps) {
  const { colors } = useTheme()


  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalContainer} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View style={styles.blurBackground} />
        <View style={styles.centerContainer}>
          <View style={[styles.content, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <Text style={[styles.title, { color: colors.text }]}>
                Logout
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.body}>
              <View style={styles.iconContainer}>
                <MaterialIcons name="logout" size={48} color="#FF3B30" />
              </View>
              <Text style={[styles.message, { color: colors.textSecondary }]}>
                Are you sure you want to logout?
              </Text>
              
              <View style={styles.buttons}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
                  onPress={onClose}
                >
                  <Text style={[styles.cancelText, { color: colors.text }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.button, styles.confirmButton]}
                  onPress={onConfirm}
                >
                  <Text style={styles.confirmText}>
                    Logout
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  content: {
    width: '85%',
    maxWidth: 450,
    minHeight: 200,
    maxHeight: 280,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.bold,
    fontWeight: '600' as const,
  },
  closeButton: {
    padding: 4,
    borderRadius: 20,
  },
  body: {
    padding: 20,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    fontFamily: fonts.regular,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  confirmButton: {
    backgroundColor: '#FF3B30',
  },
  confirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
})