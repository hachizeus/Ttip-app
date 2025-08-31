import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { supabase, Worker } from '../../lib/supabase'
import { initiateMpesaPayment } from '../../lib/mpesa'
import { formatPhoneForAPI, validateKenyanPhone } from '../../lib/phone-utils'

export default function QuickTipScreen() {
  const { workerID } = useLocalSearchParams()
  const [worker, setWorker] = useState<Worker | null>(null)
  const [amount, setAmount] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchWorker()
  }, [])

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
      router.back()
    }
  }

  const handleQuickTip = async () => {
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

      Alert.alert('Success', `STK Push sent to ${customerPhone}! Check your phone to complete payment.`)
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💰 Quick Tip</Text>
        <Text style={styles.workerName}>{worker.name}</Text>
        <Text style={styles.workerOccupation}>{worker.occupation}</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Tip Amount (KSh)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter amount"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          autoFocus
        />

        <Text style={styles.label}>Your Phone Number</Text>
        <TextInput
          style={styles.input}
          placeholder="0712345678"
          value={customerPhone}
          onChangeText={setCustomerPhone}
          keyboardType="phone-pad"
        />

        <TouchableOpacity
          style={[styles.tipButton, loading && styles.buttonDisabled]}
          onPress={handleQuickTip}
          disabled={loading}
        >
          <Text style={styles.tipButtonText}>
            {loading ? 'Sending STK Push...' : 'Send STK Push 📱'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 50,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  workerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  workerOccupation: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
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
    fontSize: 18,
    marginBottom: 20,
  },
  tipButton: {
    backgroundColor: '#00C851',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  tipButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
})