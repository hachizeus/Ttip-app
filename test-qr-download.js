// Test QR code download functionality
import * as MediaLibrary from 'expo-media-library'
import React from 'react'
import { Alert, Text, TouchableOpacity, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { captureRef } from 'react-native-view-shot'

const TestQRDownload = () => {
  const qrRef = React.useRef(null)
  const testWorkerID = 'W9MS8X9GW'

  const testDownload = async () => {
    try {
      console.log('🧪 Testing QR download for worker:', testWorkerID)
      
      const { status } = await MediaLibrary.requestPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to save images')
        return
      }

      console.log('📷 Capturing QR code...')
      
      // Wait a moment for the QR to render
      setTimeout(async () => {
        try {
          const uri = await captureRef(qrRef, {
            format: 'png',
            quality: 1,
            result: 'tmpfile',
            height: 400,
            width: 400,
          })

          console.log('✅ Captured URI:', uri)

          const asset = await MediaLibrary.createAssetAsync(uri)
          console.log('✅ Asset created:', asset)
          
          await MediaLibrary.createAlbumAsync('TTip QR Test', asset, false)
          
          Alert.alert('Success', `QR code for ${testWorkerID} saved to gallery!`)
          console.log('🎉 QR code saved successfully!')
        } catch (captureError) {
          console.error('❌ Capture error:', captureError)
          Alert.alert('Capture Error', captureError.message)
        }
      }, 1000)
      
    } catch (error) {
      console.error('❌ Download error:', error)
      Alert.alert('Error', 'Failed to save QR code: ' + error.message)
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 20, textAlign: 'center' }}>
        QR Download Test for Worker: {testWorkerID}
      </Text>
      
      <View 
        ref={qrRef} 
        style={{ 
          padding: 20, 
          backgroundColor: '#ffffff', 
          borderRadius: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
        }}
      >
        <QRCode
          value={`https://ttip-app.onrender.com/tip/${testWorkerID}?ref=test&worker=${testWorkerID}&timestamp=${Date.now()}`}
          size={250}
          backgroundColor="#ffffff"
          color="#000000"
          logo={require('./assets/images/mylogo.png')}
          logoSize={60}
          logoBackgroundColor="#ffffff"
          logoMargin={5}
          logoBorderRadius={30}
          ecl="M"
        />
      </View>
      
      <TouchableOpacity
        onPress={testDownload}
        style={{
          backgroundColor: '#007AFF',
          paddingHorizontal: 30,
          paddingVertical: 15,
          borderRadius: 10,
          marginTop: 30,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
          Test Download QR Code
        </Text>
      </TouchableOpacity>
      
      <Text style={{ 
        fontSize: 12, 
        color: '#666', 
        textAlign: 'center', 
        marginTop: 20,
        paddingHorizontal: 20 
      }}>
        This will test downloading the QR code for worker W9MS8X9GW.
        Check your gallery after clicking the button.
      </Text>
    </View>
  )
}

export default TestQRDownload

console.log('🧪 QR Download Test Script Ready')
console.log('📱 To use: Import and render TestQRDownload component')
console.log('🎯 Testing worker ID: W9MS8X9GW')