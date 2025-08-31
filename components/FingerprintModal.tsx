import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import ModalOverlay from './ModalOverlay';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = 300;

interface FingerprintModalProps {
  visible: boolean;
  onClose: () => void;
  onAuthenticate: () => void;
  biometricType: string;
  loading?: boolean;
}

export default function FingerprintModal({
  visible,
  onClose,
  onAuthenticate,
  biometricType,
  loading = false,
}: FingerprintModalProps) {
  const slideAnim = useRef(new Animated.Value(MODAL_HEIGHT)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: MODAL_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const getBiometricIcon = () => {
    if (Platform.OS === 'ios') {
      return biometricType === 'Face ID' ? '🆔' : '👆';
    }
    return biometricType === 'Face Recognition' ? '🆔' : '👆';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <ModalOverlay visible={visible}>
        <TouchableWithoutFeedback onPress={onClose} style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalContainer,
                {
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.handle} />
              
              <View style={styles.content}>
                <Text style={styles.icon}>{getBiometricIcon()}</Text>
                
                <Text style={styles.title}>
                  Login with {biometricType}
                </Text>
                
                <Text style={styles.subtitle}>
                  Use your {biometricType.toLowerCase()} to quickly and securely access your account
                </Text>

                <TouchableOpacity
                  style={[styles.biometricButton, loading && styles.buttonDisabled]}
                  onPress={onAuthenticate}
                  disabled={loading}
                >
                  <Text style={styles.biometricButtonText}>
                    {loading ? 'Authenticating...' : `Use ${biometricType}`}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onClose}
                >
                  <Text style={styles.cancelButtonText}>
                    Use OTP Instead
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </TouchableWithoutFeedback>
      </ModalOverlay>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    minHeight: MODAL_HEIGHT,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  content: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  biometricButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  biometricButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
});