import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { router } from 'expo-router'
import { fonts, fontWeights } from '../../lib/fonts'

export default function ExploreScreen() {
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned] = useState(false)

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScanned(true)
    
    try {
      const qrData = JSON.parse(data)
      if (qrData.workerID) {
        router.push(`/tip/${qrData.workerID}`)
      } else {
        Alert.alert('Invalid QR Code', 'This is not a valid TTip QR code')
      }
    } catch (error) {
      Alert.alert('Invalid QR Code', 'Unable to read QR code data')
    }
    
    setTimeout(() => setScanned(false), 2000)
  }

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    )
  }
  
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.noPermissionText}>No access to camera</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.push('/leaderboard')}
        >
          <Text style={styles.buttonText}>View Leaderboard Instead</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      <View style={styles.overlay}>
        <View style={styles.scanArea} />
        <Text style={styles.instructions}>
          Point your camera at a TTip QR code
        </Text>
        {scanned && (
          <Text style={styles.scannedText}>QR Code Scanned!</Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  instructions: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fonts.regular,
    fontWeight: fontWeights.regular,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  scannedText: {
    color: '#00C851',
    fontSize: 18,
    fontFamily: fonts.bold,
    fontWeight: fontWeights.bold,
    marginTop: 10,
  },
  noPermissionText: {
    fontSize: 16,
    fontFamily: fonts.regular,
    fontWeight: fontWeights.regular,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fonts.bold,
    fontWeight: fontWeights.bold,
  },
})