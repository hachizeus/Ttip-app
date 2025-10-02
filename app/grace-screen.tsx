import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { router } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getCurrentUser } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { setLimitedMode } from '../lib/subscription-utils'

export default function GraceScreen() {
  const [expiredPlan, setExpiredPlan] = useState('trial')

  useEffect(() => {
    loadExpiredPlan()
  }, [])

  const loadExpiredPlan = async () => {
    try {
      const phone = await getCurrentUser()
      if (!phone) return

      const { data: worker } = await supabase
        .from('workers')
        .select('subscription_plan, created_at')
        .eq('phone', phone)
        .single()

      if (worker?.subscription_plan && worker.subscription_plan !== 'free') {
        setExpiredPlan(worker.subscription_plan)
      } else {
        // Check if trial period ended
        const createdAt = new Date(worker?.created_at)
        const trialEndDate = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000)
        if (new Date() > trialEndDate) {
          setExpiredPlan('trial')
        }
      }
    } catch (error) {
      console.error('Error loading expired plan:', error)
    }
  }

  const getPlanDisplayName = () => {
    switch (expiredPlan) {
      case 'pro':
      case 'pro_plan':
        return 'Pro Plan'
      case 'lite':
      case 'lite_plan':
        return 'Lite Plan'
      default:
        return 'trial'
    }
  }
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <MaterialIcons name="schedule" size={80} color="#FF6B6B" style={styles.icon} />
        <Text style={styles.title}>
          {getPlanDisplayName() === 'trial' ? 'Your trial has ended' : `Your ${getPlanDisplayName()} has ended`}
        </Text>
        <Text style={styles.message}>
          Subscribe to continue receiving tips and accessing all features
        </Text>
        
        <View style={styles.features}>
          <Text style={styles.feature}>✓ Continue receiving tips</Text>
          <Text style={styles.feature}>✓ Access analytics</Text>
          <Text style={styles.feature}>✓ Premium support</Text>
        </View>
      </View>
      
      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.subscribeButton}
          onPress={() => router.push('/subscription')}
        >
          <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.laterButton}
          onPress={async () => {
            const phone = await getCurrentUser()
            console.log('Setting limited mode for phone:', phone)
            if (phone) {
              await setLimitedMode(phone)
              console.log('Limited mode set successfully')
              // Small delay to ensure AsyncStorage write completes
              await new Promise(resolve => setTimeout(resolve, 100))
            }
            // Set a session flag to prevent grace screen from showing again
            await AsyncStorage.setItem('graceScreenDismissed', 'true')
            router.replace('/(tabs)')
          }}
        >
          <Text style={styles.laterButtonText}>Maybe Later (Limited Mode)</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  features: {
    alignItems: 'flex-start',
  },
  feature: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
  },
  buttons: {
    paddingBottom: 50,
  },
  subscribeButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  laterButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  laterButtonText: {
    color: '#666',
    fontSize: 16,
  },
});