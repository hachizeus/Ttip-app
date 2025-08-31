import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import QRCode from 'react-native-qrcode-svg'
import { supabase, Worker } from '../../lib/supabase'

export default function WorkerProfile() {
  const { id } = useLocalSearchParams()
  const [worker, setWorker] = useState<Worker | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWorker()
  }, [])

  const fetchWorker = async () => {
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('worker_id', id)
        .single()

      if (error) throw error
      setWorker(data)
    } catch (error) {
      Alert.alert('Error', 'Failed to load worker profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async (plan: 'lite' | 'pro') => {
    const amount = plan === 'lite' ? 50 : 150
    Alert.alert(
      'Subscribe',
      `Subscribe to ${plan.toUpperCase()} plan for KSh ${amount}/month?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Subscribe', onPress: () => initiateSubscription(plan, amount) }
      ]
    )
  }

  const initiateSubscription = async (plan: 'lite' | 'pro', amount: number) => {
    Alert.alert('Info', 'Subscription payment will be implemented with M-Pesa integration')
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    )
  }

  if (!worker) {
    return (
      <View style={styles.container}>
        <Text>Worker not found</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Welcome, {worker.name}!</Text>
      
      <View style={styles.infoCard}>
        <Text style={styles.label}>Worker ID: {worker.worker_id}</Text>
        <Text style={styles.label}>Occupation: {worker.occupation}</Text>
        <Text style={styles.label}>Plan: {worker.subscription_plan.toUpperCase()}</Text>
        <Text style={styles.label}>Total Tips: KSh {worker.total_tips}</Text>
        <Text style={styles.label}>Tip Count: {worker.tip_count}</Text>
      </View>

      <View style={styles.qrContainer}>
        <Text style={styles.qrTitle}>Your QR Code</Text>
        <QRCode
          value={worker.qr_code}
          size={200}
          backgroundColor="white"
          color="black"
        />
        <Text style={styles.qrSubtitle}>Customers scan this to tip you</Text>
      </View>

      <View style={styles.subscriptionContainer}>
        <Text style={styles.subscriptionTitle}>Upgrade Plan</Text>
        <TouchableOpacity
          style={styles.subscriptionButton}
          onPress={() => handleSubscribe('lite')}
        >
          <Text style={styles.subscriptionText}>Lite Plan - KSh 50/month</Text>
          <Text style={styles.subscriptionDesc}>Max tip: KSh 500</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.subscriptionButton}
          onPress={() => handleSubscribe('pro')}
        >
          <Text style={styles.subscriptionText}>Pro Plan - KSh 150/month</Text>
          <Text style={styles.subscriptionDesc}>Unlimited tips</Text>
        </TouchableOpacity>
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
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  qrSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  },
  subscriptionContainer: {
    marginTop: 20,
  },
  subscriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  subscriptionButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  subscriptionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  subscriptionDesc: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
  },
})