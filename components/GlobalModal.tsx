import React from 'react';
import { Modal, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { BlurView } from 'expo-blur';

interface GlobalModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  blurIntensity?: number;
}

export default function GlobalModal({ 
  visible, 
  onClose, 
  children, 
  blurIntensity = 80 
}: GlobalModalProps) {
  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="fade" 
      presentationStyle="overFullScreen"
      statusBarTranslucent
    >
      <StatusBar backgroundColor="transparent" barStyle="light-content" translucent />
      <TouchableOpacity 
        style={styles.container} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <BlurView intensity={blurIntensity} tint="dark" style={styles.blurBackground} />
        {children}
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
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
  },
});