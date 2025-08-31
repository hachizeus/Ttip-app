import React, { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Alert, TouchableOpacity, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { getCurrentUser } from '../lib/auth'
import { supabase } from '../lib/supabase'
import QRCode from 'react-native-qrcode-svg'
import { MaterialIcons } from '@expo/vector-icons'
import { useTheme, ThemeProvider } from '../lib/theme-context'
import * as MediaLibrary from 'expo-media-library'
import * as FileSystem from 'expo-file-system'
import { captureRef } from 'react-native-view-shot'

function QRCodeContent() {
  const { colors } = useTheme()
  const [workerID, setWorkerID] = useState('')
  const [loading, setLoading] = useState(true)
  const qrRef = useRef(null)

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

  const downloadQR = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to save images')
        return
      }

      const uri = await captureRef(qrRef, {
        format: 'png',
        quality: 1,
        backgroundColor: '#ffffff',
        width: 300,
        height: 300,
      })

      const asset = await MediaLibrary.createAssetAsync(uri)
      await MediaLibrary.createAlbumAsync('TTip QR Codes', asset, false)
      
      Alert.alert('Success', 'QR code saved to gallery!')
    } catch (error) {
      console.error('Download error:', error)
      Alert.alert('Error', 'Failed to save QR code')
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading...</Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View style={styles.headerContent}>
          <MaterialIcons name="qr-code" size={32} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>My QR Code</Text>
          <TouchableOpacity onPress={downloadQR} style={styles.downloadButton}>
            <MaterialIcons name="download" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Customers can scan this code to tip you
        </Text>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {workerID && (
          <View style={[styles.qrContainer, { backgroundColor: colors.card }]}>
            <View ref={qrRef} style={[styles.qrWrapper, { backgroundColor: '#ffffff' }]}>
              <QRCode
                value={`https://ttip-backend.onrender.com/tip/${workerID}`}
                size={220}
                backgroundColor="#ffffff"
                color="#000000"
                logo={require('../assets/images/icon.png')}
                logoSize={40}
                logoBackgroundColor="#ffffff"
                logoMargin={2}
              />
            </View>
            <View style={styles.qrInfo}>
              <Text style={[styles.workerIdLabel, { color: colors.textSecondary }]}>Worker ID</Text>
              <Text style={[styles.workerId, { color: colors.text }]}>{workerID}</Text>
            </View>
          </View>
        )}
        
        <View style={[styles.instructionCard, { backgroundColor: colors.card }]}>
          <MaterialIcons name="info" size={24} color={colors.primary} style={styles.infoIcon} />
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
    </View>
  )
}

export default function QRCodeScreen() {
  return (
    <ThemeProvider>
      <QRCodeContent />
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
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
})