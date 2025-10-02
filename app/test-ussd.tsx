import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Camera } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';

export default function TestUSSDScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    getCameraPermissions();
  }, []);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    setQrData(data);
    
    // Parse different QR types
    if (data.startsWith('*334*')) {
      Alert.alert('USSD Code Detected', `Dial: ${data}\n\nThis will open M-Pesa USSD menu`);
    } else if (data.startsWith('paybill:')) {
      const parts = data.split(':');
      Alert.alert('PayBill Code', `Business: ${parts[1]}\nAccount: ${parts[2]}\n\nUse M-Pesa Pay Bill`);
    } else if (data.startsWith('http')) {
      Alert.alert('Payment Link', `URL: ${data}\n\nThis will open STK Push`);
    } else {
      try {
        const parsed = JSON.parse(data);
        if (parsed.worker_name) {
          Alert.alert('Offline Payment', `Worker: ${parsed.worker_name}\nPhone: ${parsed.worker_phone}\n\nMultiple payment options available`);
        }
      } catch {
        Alert.alert('QR Code Scanned', data);
      }
    }
  };

  // Test QR codes
  const testQRCodes = {
    ussd: '*334*1*WHA5RGZ9I#',
    paybill: 'paybill:174379:WHA5RGZ9I',
    stk: 'https://ttip-backend.onrender.com/api/tip/WHA5RGZ9I',
    offline: JSON.stringify({
      worker_name: 'Test Worker',
      worker_phone: '254721475448',
      payment_methods: [
        { method: 'M-Pesa Send Money', phone: '254721475448' },
        { method: 'Cash', note: 'Hand directly to worker' }
      ]
    })
  };

  if (hasPermission === null) {
    return <Text>Requesting camera permission...</Text>;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔢 USSD & QR Code Test</Text>
      
      {/* Camera Scanner */}
      <View style={styles.cameraContainer}>
        <Text style={styles.sectionTitle}>📱 QR Scanner</Text>
        <Camera
          style={styles.camera}
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        />
        {scanned && (
          <TouchableOpacity
            style={styles.button}
            onPress={() => setScanned(false)}
          >
            <Text style={styles.buttonText}>Scan Again</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Test QR Codes */}
      <View style={styles.qrSection}>
        <Text style={styles.sectionTitle}>🧪 Test QR Codes</Text>
        
        <View style={styles.qrItem}>
          <Text style={styles.qrTitle}>USSD Code</Text>
          <QRCode value={testQRCodes.ussd} size={100} />
          <Text style={styles.qrDescription}>Dial: {testQRCodes.ussd}</Text>
        </View>

        <View style={styles.qrItem}>
          <Text style={styles.qrTitle}>PayBill</Text>
          <QRCode value={testQRCodes.paybill} size={100} />
          <Text style={styles.qrDescription}>Business: 174379{'\n'}Account: WHA5RGZ9I</Text>
        </View>

        <View style={styles.qrItem}>
          <Text style={styles.qrTitle}>STK Push</Text>
          <QRCode value={testQRCodes.stk} size={100} />
          <Text style={styles.qrDescription}>Online payment link</Text>
        </View>

        <View style={styles.qrItem}>
          <Text style={styles.qrTitle}>Offline Options</Text>
          <QRCode value={testQRCodes.offline} size={100} />
          <Text style={styles.qrDescription}>Multiple payment methods</Text>
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.sectionTitle}>📋 How to Test</Text>
        <Text style={styles.instruction}>1. Point camera at any QR code above</Text>
        <Text style={styles.instruction}>2. Check if correct instructions appear</Text>
        <Text style={styles.instruction}>3. For USSD: Dial the code manually</Text>
        <Text style={styles.instruction}>4. For PayBill: Use M-Pesa Pay Bill</Text>
        <Text style={styles.instruction}>5. For STK: Click the link</Text>
      </View>

      {scanned && qrData && (
        <View style={styles.result}>
          <Text style={styles.sectionTitle}>📄 Last Scanned</Text>
          <Text style={styles.resultText}>{qrData}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  cameraContainer: {
    marginBottom: 20,
  },
  camera: {
    height: 200,
    borderRadius: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  qrSection: {
    marginBottom: 20,
  },
  qrItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  qrDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  instructions: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  instruction: {
    fontSize: 14,
    marginBottom: 5,
    color: '#333',
  },
  result: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
  },
  resultText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
});