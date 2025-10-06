import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, ScrollView } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import QRCode from 'react-native-qrcode-svg'
import { useTheme } from '../lib/theme-context'
import { generateWidgetQR, updateWidget } from '../lib/widget-manager'

export default function WidgetSetupScreen() {
  const { colors } = useTheme()
  const [qrData, setQrData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadQRData()
  }, [])

  const loadQRData = async () => {
    const data = await generateWidgetQR()
    setQrData(data)
  }

  const addToHomeScreen = async () => {
    setLoading(true)
    try {
      await updateWidget()
      
      if (Platform.OS === 'android') {
        Alert.alert(
          'Widget Ready!',
          'Long press on your home screen, select "Widgets", find "TTip QR Widget" and add it.',
          [{ text: 'Got it!' }]
        )
      } else {
        Alert.alert(
          'iOS Widget',
          'Long press on your home screen, tap the + button, search for "TTip" and add the QR widget.',
          [{ text: 'Got it!' }]
        )
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to setup widget')
    } finally {
      setLoading(false)
    }
  }

  if (!qrData) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.error, { color: colors.text }]}>
          Please complete your profile first
        </Text>
      </View>
    )
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scrollContent}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
      >
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>

      <Text style={[styles.title, { color: colors.text }]}>
        Add QR Widget
      </Text>

      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Add your TTip QR code to your home screen for quick access
      </Text>

      <View style={[styles.qrContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.qrWrapper, { backgroundColor: colors.card }]}>
          <View style={[styles.qrDownloadContainer, { backgroundColor: colors.card }]}>
            <QRCode
              value={qrData.url}
              size={220}
              backgroundColor={colors.card}
              color={colors.text}
              logo={{ uri: 'https://cpbonffjhrckiiqbsopt.supabase.co/storage/v1/object/public/banners/mylogo.png' }}
              logoSize={50}
              logoBackgroundColor={colors.card}
              logoMargin={4}
              logoBorderRadius={25}
              ecl="M"
            />
          </View>
        </View>
        <View style={styles.qrInfo}>
          <Text style={[styles.workerIdLabel, { color: colors.textSecondary }]}>Worker ID</Text>
          <Text style={[styles.workerId, { color: colors.text }]}>{qrData.workerID || qrData.workerId || 'N/A'}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={addToHomeScreen}
        disabled={loading}
      >
        <MaterialIcons name="add-to-home-screen" size={24} color="#fff" />
        <Text style={styles.addButtonText}>
          {loading ? 'Setting up...' : 'Add to Home Screen'}
        </Text>
      </TouchableOpacity>

      <View style={[styles.instructions, { backgroundColor: colors.card }]}>
        <Text style={[styles.instructionTitle, { color: colors.text }]}>
          How to add widget:
        </Text>
        <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
          1. Long press on empty space on home screen{'\n'}
          2. Select "Widgets" or tap + button{'\n'}
          3. Find "TTip QR Widget"{'\n'}
          4. Drag to your home screen
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
    paddingBottom: 120,
  },
  backButton: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  qrContainer: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  qrWrapper: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  qrDownloadContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  qrInfo: {
    alignItems: 'center',
  },
  workerIdLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  workerId: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 30,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  instructions: {
    padding: 20,
    borderRadius: 12,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  error: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
})