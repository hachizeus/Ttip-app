import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'
import QRCode from 'react-native-qrcode-svg'
import { supabase, Worker } from '../../lib/supabase'
import ProfilePhoto from '../../components/ProfilePhoto'

export default function WorkerProfile() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
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
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <MaterialIcons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>
      
      <View style={styles.profileHeader}>
        <ProfilePhoto 
          photoUrl={worker.profile_image_url}
          name={worker.name}
          size={80}
        />
        <Text style={styles.title}>{worker.name}</Text>
        <Text style={styles.occupation}>{worker.occupation}</Text>
      </View>
      
      <View style={styles.infoCard}>
        <Text style={styles.label}>Worker ID: {worker.worker_id}</Text>
        <Text style={styles.label}>Total Tips: KSh {worker.total_tips}</Text>
        <Text style={styles.label}>Tip Count: {worker.tip_count}</Text>
      </View>

      <View style={styles.qrContainer}>
        <Text style={styles.qrTitle}>{worker.name}'s QR Code</Text>
        <QRCode
          value={`https://ttip-app.onrender.com/tip/${worker.worker_id}`}
          size={200}
          backgroundColor="white"
          color="black"
        />
        <Text style={styles.qrSubtitle}>Customers scan this to tip {worker.name}</Text>
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
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1,
    padding: 8,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 5,
  },
  occupation: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
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

})