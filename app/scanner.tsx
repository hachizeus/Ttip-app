import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native'
import { CameraView, Camera } from 'expo-camera'
import { router } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'
import { useTheme, ThemeProvider } from '../lib/theme-context'

function ScannerContent() {
  const { colors } = useTheme()
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [scanned, setScanned] = useState(false)

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync()
      setHasPermission(status === 'granted')
    }

    getCameraPermissions()
  }, [])

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScanned(true)
    
    // Extract worker ID from QR code data
    const workerIdMatch = data.match(/\/tip\/([^\/\?]+)/)
    if (workerIdMatch) {
      const workerId = workerIdMatch[1]
      router.push(`/tip/${workerId}`)
    } else {
      Alert.alert('Invalid QR Code', 'This is not a valid TTip QR code')
      setScanned(false)
    }
  }

  if (hasPermission === null) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.message, { color: colors.text }]}>Requesting camera permission...</Text>
      </View>
    )
  }

  if (hasPermission === false) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.message, { color: colors.text }]}>No access to camera</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan QR Code</Text>
      </View>

      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            <View style={styles.corner} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          
          <Text style={styles.instruction}>
            Point your camera at a TTip QR code
          </Text>
          
          {scanned && (
            <TouchableOpacity
              style={styles.scanAgainButton}
              onPress={() => setScanned(false)}
            >
              <Text style={styles.scanAgainText}>Tap to Scan Again</Text>
            </TouchableOpacity>
          )}
        </View>
      </CameraView>
    </View>
  )
}

export default function ScannerScreen() {
  return (
    <ThemeProvider>
      <ScannerContent />
    </ThemeProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#fff',
    borderWidth: 3,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    top: 0,
    left: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    left: 'auto',
    borderLeftWidth: 0,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    top: 'auto',
    borderTopWidth: 0,
    borderBottomWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    top: 'auto',
    left: 'auto',
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderBottomWidth: 3,
  },
  instruction: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 30,
    paddingHorizontal: 20,
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
  },
  scanAgainButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
  },
  scanAgainText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
})