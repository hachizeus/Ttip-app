import { MaterialIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import React, { useEffect, useRef, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { getCurrentUser } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useTheme } from '../lib/theme-context'

import * as MediaLibrary from 'expo-media-library'
import ViewShot from 'react-native-view-shot'
import GlobalModal from '../components/GlobalModal'
import LoadingDots from '../components/LoadingDots'

export default function QRCodeScreen() {
  const { colors } = useTheme()
  const [workerID, setWorkerID] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAlert, setShowAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<'success' | 'error'>('success')
  const qrRef = useRef<any>(null)

  useEffect(() => {
    loadWorkerData()
  }, [])

  const loadWorkerData = async () => {
    try {
      const phone = await getCurrentUser()
      if (!phone) return

      const { data: worker } = await supabase
        .from('workers')
        .select('worker_id')
        .eq('phone', phone)
        .single()

      if (worker) {
        setWorkerID(worker.worker_id)
      }
    } catch (error) {
      console.error('Error loading worker data:', error)
    } finally {
      setLoading(false)
    }
  }

  const showCustomAlert = (message: string, type: 'success' | 'error') => {
    setAlertMessage(message)
    setAlertType(type)
    setShowAlert(true)
    setTimeout(() => setShowAlert(false), 3000)
  }

  const downloadQR = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync()
      if (status !== 'granted') {
        showCustomAlert('Please grant permission to save images', 'error')
        return
      }

      const uri = await qrRef.current?.capture()
      const asset = await MediaLibrary.createAssetAsync(uri)
      await MediaLibrary.createAlbumAsync('TTip QR Codes', asset, false)
      
      showCustomAlert('QR code saved to gallery!', 'success')
    } catch (error) {
      console.error('Download error:', error)
      showCustomAlert('Failed to save QR code', 'error')
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingDots size={12} />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { backgroundColor: colors.background }]}> 
        <View style={styles.headerContent}> 
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          {/* Removed QR code icon next to title */}
          <Text style={[styles.headerTitle, { color: colors.text }]}>My QR Code</Text>
          <TouchableOpacity onPress={downloadQR} style={styles.downloadButton}> 
            <MaterialIcons name="download" size={24} color={colors.accent} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}> 
          Customers can scan this code to tip you
        </Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {workerID && (
          <View style={[styles.qrContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.qrWrapper, { backgroundColor: colors.card }]}>
              <ViewShot ref={qrRef} options={{ format: 'png', quality: 1.0 }}>
                <View style={[styles.qrDownloadContainer, { backgroundColor: colors.card }]}>
                  <QRCode
                    value={`${process.env.EXPO_PUBLIC_BACKEND_URL || 'https://ttip-app.onrender.com'}/tip/${workerID}?ref=qrpage&worker=${workerID}&timestamp=${Date.now()}&data=complex`}
                    size={220}
                    backgroundColor={colors.card}
                    color={colors.text}
                    logo={require('../assets/images/mylogo.png')}
                    logoSize={50}
                    logoBackgroundColor={colors.card}
                    logoMargin={4}
                    logoBorderRadius={25}
                    ecl="M"
                  />
                </View>
              </ViewShot>
            </View>
            <View style={styles.qrInfo}>
              <Text style={[styles.workerIdLabel, { color: colors.textSecondary }]}>Worker ID</Text>
              <Text style={[styles.workerId, { color: colors.text }]}>{workerID}</Text>
            </View>
          </View>
        )}
        
        <View style={[styles.instructionCard, { backgroundColor: colors.background }]}>
          <MaterialIcons name="info" size={24} color={colors.accent} style={styles.infoIcon} />
          <Text style={[styles.instruction, { color: colors.text }]}>
            Show this QR code to customers who want to tip you. They can scan it with any QR code scanner.
          </Text>
        </View>
        
        <View style={styles.stepsContainer}>
          <Text style={[styles.stepsTitle, { color: colors.text }]}>How it works:</Text>
          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={[styles.stepText, { color: colors.text }]}>Customer scans your QR code</Text>
          </View>
          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={[styles.stepText, { color: colors.text }]}>They enter tip amount</Text>
          </View>
          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={[styles.stepText, { color: colors.text }]}>Payment via M-Pesa</Text>
          </View>
          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: '#00C851' }]}>
              <MaterialIcons name="check" size={16} color="#fff" />
            </View>
            <Text style={[styles.stepText, { color: colors.text }]}>You receive tip instantly!</Text>
          </View>
        </View>
      </ScrollView>

      <GlobalModal visible={showAlert} onClose={() => setShowAlert(false)}>
        <View style={[styles.alertContent, { backgroundColor: colors.background }]}>
          <MaterialIcons 
            name={alertType === 'success' ? 'check-circle' : 'error'} 
            size={48} 
            color={alertType === 'success' ? '#00C851' : colors.error || '#ff4444'} 
          />
          <Text style={[styles.alertMessage, { color: colors.text }]}>{alertMessage}</Text>
        </View>
      </GlobalModal>
    </View>
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
    // No borderBottom for QR header
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  downloadButton: {
    padding: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 100,
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
  instructionCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  instruction: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  stepsContainer: {
    flex: 1,
  },
  stepsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepText: {
    fontSize: 16,
    flex: 1,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 100,
  },
  alertContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  alertContent: {
    width: '100%',
    maxWidth: 280,
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  alertMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
  },
})