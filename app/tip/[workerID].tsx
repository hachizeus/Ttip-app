import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { supabase, Worker } from '../../lib/supabase'
import { initiateMpesaPayment } from '../../lib/mpesa'
import { formatPhoneForAPI, validateKenyanPhone, formatPhoneForDisplay } from '../../lib/phone-utils'
import { getCurrentUser } from '../../lib/auth'

export default function TipScreen() {
  const { workerID, fromScanner } = useLocalSearchParams()
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
      <View style={styles.header}>
        <Text style={styles.title}>💰 Tip {worker.name}</Text>
        <Text style={styles.subtitle}>{worker.occupation}</Text>
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

      <View style={styles.footer}>
        <Text style={styles.footerText}>Powered by TTip</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 30,
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    flex: 1,
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
    backgroundColor: '#00C851',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  tipButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
})