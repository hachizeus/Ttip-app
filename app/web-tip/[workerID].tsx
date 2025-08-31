import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useLocalSearchParams } from 'expo-router'

export default function WebTipScreen() {
  const { workerID } = useLocalSearchParams()
  const [amount, setAmount] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [worker, setWorker] = useState<any>(null)

  useEffect(() => {
    fetchWorker()
  }, [])

  const fetchWorker = async () => {
    try {
      const response = await fetch(`http://192.168.1.3:3000/api/worker/${workerID}`)
      const data = await response.json()
      if (data.success) {
        setWorker(data.worker)
      }
    } catch (error) {
      console.error('Error fetching worker:', error)
    }
  }

  const handleSTKPush = async () => {
    if (!amount || !customerPhone) {
      Alert.alert('Error', 'Please enter amount and phone number')
      return
    }

    const tipAmount = parseFloat(amount)
    if (tipAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`http://192.168.1.3:3000/api/quick-tip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerID,
          amount: tipAmount,
          customerPhone
        })
      })

      const result = await response.json()
      
      if (result.success) {
        Alert.alert('Success', `STK Push sent to ${customerPhone}! Check your phone to complete payment.`)
      } else {
        Alert.alert('Error', result.error || 'Failed to send STK Push')
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process payment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💰 Quick Tip</Text>
        {worker && (
          <>
            <Text style={styles.workerName}>{worker.name}</Text>
            <Text style={styles.workerOccupation}>{worker.occupation}</Text>
          </>
        )}
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Tip Amount (KSh)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter amount"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
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
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSTKPush}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
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
  button: {
    backgroundColor: '#00C851',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
})