import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';

interface ModalOverlayProps {
  visible: boolean;
  children: React.ReactNode;
}

export default function ModalOverlay({ visible, children }: ModalOverlayProps) {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <BlurView intensity={20} style={styles.blurContainer}>
        <View style={styles.darkOverlay} />
      </BlurView>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  blurContainer: {
    flex: 1,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});