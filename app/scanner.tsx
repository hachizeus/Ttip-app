import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native'
import { CameraView, Camera } from 'expo-camera'
import { router } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'
import NetInfo from '@react-native-community/netinfo'
import { useTheme, ThemeProvider } from '../lib/theme-context'
import OfflineTipModal from '../components/OfflineTipModal'

function ScannerContent() {
  const { colors } = useTheme()
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [scanned, setScanned] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [showOfflineModal, setShowOfflineModal] = useState(false)
  const [selectedWorker, setSelectedWorker] = useState<{id: string, name: string} | null>(null)

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync()
      setHasPermission(status === 'granted')
    }

    getCameraPermissions()
    
    // Network listener
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false)
    })
    
    return () => unsubscribe()
  }, [])

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned) return // Prevent multiple scans
    setScanned(true)
    
    try {
      // Try to parse as enhanced QR code first
      const qrData = JSON.parse(data)
      if (qrData.workerId && qrData.workerName) {
        // Enhanced offline QR code
        setSelectedWorker({ id: qrData.workerId, name: qrData.workerName })
        setShowOfflineModal(true)
        return
      }
    } catch {
      // Not JSON, try URL parsing
    }
    
    // Extract worker ID from QR code data
    let workerIdMatch = data.match(/\/tip\/([^\/\?]+)/)
    let workerId = null
    
    if (workerIdMatch) {
      workerId = workerIdMatch[1]
    } else {
      // Try ttip:// protocol format
      const ttipMatch = data.match(/ttip:\/\/offline-tip\/([^\?]+)/)
      if (ttipMatch) {
        workerId = ttipMatch[1]
      }
    }
    
    if (workerId) {
      console.log('🔍 Found workerId:', workerId, 'isOnline:', isOnline)
      // Always show offline modal for better control
      setSelectedWorker({ id: workerId, name: 'Worker' })
      setShowOfflineModal(true)
    } else {
      // Handle any other QR code - show content and allow user to decide
      Alert.alert(
        'QR Code Scanned', 
        `Content: ${data}`,
        [
          { text: 'Scan Again', onPress: () => setTimeout(() => setScanned(false), 500) },
          { text: 'Close', onPress: () => router.back() }
        ]
      )
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
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.overlay}>
          <View style={styles.scanFrame}>
            <View style={styles.scanArea}>
              <View style={styles.corner} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>
          
          <View style={styles.instructionContainer}>
            <MaterialIcons name="qr-code-scanner" size={32} color="#fff" style={styles.scanIcon} />
            <Text style={styles.instruction}>
              Position QR code within the frame
            </Text>
            <Text style={styles.subInstruction}>
              The code will be scanned automatically
            </Text>
            {!isOnline && (
              <View style={styles.offlineIndicator}>
                <MaterialIcons name="wifi-off" size={16} color="#ff9800" />
                <Text style={styles.offlineText}>Offline Mode</Text>
              </View>
            )}
          </View>
          
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
      
      {selectedWorker && (
        <OfflineTipModal
          visible={showOfflineModal}
          onClose={() => {
            console.log('🚪 Closing modal')
            setShowOfflineModal(false)
            setSelectedWorker(null)
            setScanned(false)
          }}
          workerId={selectedWorker.id}
          workerName={selectedWorker.name}
          isOnline={isOnline}
        />
      )}
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
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanArea: {
    width: 280,
    height: 280,
    position: 'relative',
    backgroundColor: 'transparent',
    borderRadius: 20,
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#00C851',
    borderWidth: 4,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    top: 0,
    left: 0,
    borderTopLeftRadius: 20,
  },
  topRight: {
    top: 0,
    right: 0,
    left: 'auto',
    borderLeftWidth: 0,
    borderRightWidth: 4,
    borderTopRightRadius: 20,
  },
  bottomLeft: {
    bottom: 0,
    top: 'auto',
    borderTopWidth: 0,
    borderBottomWidth: 4,
    borderBottomLeftRadius: 20,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    top: 'auto',
    left: 'auto',
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 4,
    borderBottomWidth: 4,
    borderBottomRightRadius: 20,
  },
  instructionContainer: {
    alignItems: 'center',
    marginTop: 40,
    paddingHorizontal: 40,
  },
  scanIcon: {
    marginBottom: 12,
  },
  instruction: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  subInstruction: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    textAlign: 'center',
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
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 16,
  },
  offlineText: {
    color: '#ff9800',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
})