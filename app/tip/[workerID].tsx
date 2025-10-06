import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Image } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'
import { supabase, Worker } from '../../lib/supabase'
import { initiateMpesaPayment } from '../../lib/mpesa'
import { formatPhoneForAPI, validateKenyanPhone, formatPhoneForDisplay } from '../../lib/phone-utils'
import { getCurrentUser } from '../../lib/auth'
import { NetworkManager } from '../../lib/network-manager'
import { OfflinePayment } from '../../lib/offline-payment'
import { OfflineStorage } from '../../lib/offline-storage'

export default function TipScreen() {
  const { workerID, fromScanner } = useLocalSearchParams()
  const router = useRouter()
  const [worker, setWorker] = useState<Worker | null>(null)
  const [amount, setAmount] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchWorker()
    if (fromScanner === 'true') {
      loadCurrentUserPhone()
    }
  }, [])

  const loadCurrentUserPhone = async () => {
    const phone = await getCurrentUser()
    if (phone) {
      setCustomerPhone(formatPhoneForDisplay(phone))
    }
  }

  const fetchWorker = async () => {
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('worker_id', workerID)
        .single()

      if (error) throw error
      setWorker(data)
    } catch (error) {
      Alert.alert('Error', 'Worker not found')
    }
  }

  const validateTip = (tipAmount: number): boolean => {
    if (!worker) return false
    
    const now = new Date()
    const subscriptionExpiry = worker.subscription_expiry ? new Date(worker.subscription_expiry) : null
    
    if (subscriptionExpiry && now > subscriptionExpiry) {
      Alert.alert('Error', 'Worker subscription has expired')
      return false
    }
    
    if (worker.subscription_plan === 'lite' && tipAmount > 500) {
      Alert.alert('Error', 'Maximum tip for Lite plan is KSh 500')
      return false
    }
    
    return true
  }

  // Store worker data for offline access
  useEffect(() => {
    if (worker && workerID) {
      OfflineStorage.storeWorkerData(workerID as string, worker)
    }
  }, [worker, workerID])

  const handleSendTip = async () => {
    if (!amount || !customerPhone) {
      Alert.alert('Error', 'Please enter amount and phone number')
      return
    }

    if (!validateKenyanPhone(customerPhone)) {
      Alert.alert('Error', 'Enter valid phone number (0712345678)')
      return
    }

    const tipAmount = parseFloat(amount)
    if (tipAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount')
      return
    }

    if (!validateTip(tipAmount)) return

    setLoading(true)
    try {
      const apiPhone = formatPhoneForAPI(customerPhone)
      const isOnline = NetworkManager.getIsOnline()
      
      if (isOnline) {
        // Online payment
        const paymentResponse = await initiateMpesaPayment(apiPhone, tipAmount, workerID as string)
        
        const { error } = await supabase
          .from('tips')
          .insert({
            worker_id: workerID,
            amount: tipAmount,
            customer_phone: apiPhone,
            transaction_id: paymentResponse.CheckoutRequestID,
            status: 'pending'
          })

        if (error) throw error
        Alert.alert('Success', 'Payment request sent to your phone!')
      } else {
        // Offline payment
        const result = await OfflinePayment.processOfflinePayment({
          workerId: workerID as string,
          amount: tipAmount,
          phone: apiPhone
        })
        Alert.alert('Offline Mode', result.message + '\n\nYour tip will be processed when internet connection is restored.')
      }
      
      setAmount('')
      setCustomerPhone('')
    } catch (error) {
      Alert.alert('Error', 'Failed to process payment')
    } finally {
      setLoading(false)
    }
  }

  if (!worker) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <MaterialIcons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>
      
      <View style={styles.header}>
        <Image source={{ uri: 'https://cpbonffjhrckiiqbsopt.supabase.co/storage/v1/object/public/banners/mylogo.png' }} style={styles.logo} />
        <Text style={styles.title}>💰 Tip {worker.name}</Text>
        <Text style={styles.subtitle}>{worker.occupation}</Text>
        <View style={styles.workerCard}>
          <Text style={styles.workerName}>{worker.name}</Text>
          <Text style={styles.workerOccupation}>{worker.occupation}</Text>
          {worker.bio && <Text style={styles.workerBio}>{worker.bio}</Text>}
        </View>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Amount (KSh)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter tip amount"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Your Phone Number</Text>
        <TextInput
          style={[styles.input, fromScanner === 'true' && styles.inputDisabled]}
          placeholder="0712345678"
          value={customerPhone}
          onChangeText={setCustomerPhone}
          keyboardType="phone-pad"
          editable={fromScanner !== 'true'}
        />

        <TouchableOpacity
          style={[styles.tipButton, loading && styles.buttonDisabled]}
          onPress={handleSendTip}
          disabled={loading}
        >
          <Text style={styles.tipButtonText}>
            {loading ? 'Processing...' : 'Send Tip 💰'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>How it works:</Text>
        <View style={styles.infoItem}>
          <Text style={styles.infoEmoji}>1️⃣</Text>
          <Text style={styles.infoText}>Enter tip amount</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoEmoji}>2️⃣</Text>
          <Text style={styles.infoText}>Enter your phone number</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoEmoji}>3️⃣</Text>
          <Text style={styles.infoText}>Complete M-Pesa payment</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoEmoji}>✅</Text>
          <Text style={styles.infoText}>Worker receives tip instantly!</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Image source={{ uri: 'https://cpbonffjhrckiiqbsopt.supabase.co/storage/v1/object/public/banners/mylogo.png' }} style={styles.footerLogo} />
        <Text style={styles.footerText}>Powered by TTip</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    paddingTop: 70,
    paddingHorizontal: 20,
    paddingBottom: 30,
    flexGrow: 1,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 20,
    borderRadius: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0052CC',
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  workerCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
    alignItems: 'center',
  },
  workerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  workerOccupation: {
    fontSize: 16,
    color: '#FF6B00',
    marginBottom: 10,
  },
  workerBio: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 20,
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#666',
  },
  tipButton: {
    backgroundColor: '#0052CC',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  tipButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoEmoji: {
    fontSize: 18,
    marginRight: 12,
    width: 25,
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerLogo: {
    width: 40,
    height: 40,
    marginBottom: 10,
    borderRadius: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
})