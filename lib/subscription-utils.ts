import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from './supabase'

export interface SubscriptionStatus {
  plan: string
  isActive: boolean
  isTrialExpired: boolean
  isLimitedMode: boolean
  maxTipAmount: number | null
  expiryDate: string | null
}

export const getSubscriptionStatus = async (phone: string): Promise<SubscriptionStatus> => {
  try {
    const { data: worker } = await supabase
      .from('workers')
      .select('subscription_plan, subscription_expiry, created_at')
      .eq('phone', phone)
      .single()

    if (!worker) {
      return {
        plan: 'free',
        isActive: false,
        isTrialExpired: true,
        isLimitedMode: true,
        maxTipAmount: null,
        expiryDate: null
      }
    }

    const now = new Date()
    const createdAt = new Date(worker.created_at)
    const trialEndDate = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days
    const subscriptionExpiry = worker.subscription_expiry ? new Date(worker.subscription_expiry) : null

    // Check if trial period has ended
    const isTrialExpired = now > trialEndDate

    // Check if subscription is active
    const hasActiveSubscription = subscriptionExpiry && now < subscriptionExpiry

    // Determine current plan and limits
    let plan = worker.subscription_plan || 'free'
    let isActive = false
    let maxTipAmount: number | null = null

    if (!isTrialExpired) {
      // Still in trial - same as Pro
      plan = 'trial'
      isActive = true
      maxTipAmount = null // unlimited
    } else if (hasActiveSubscription) {
      // Active subscription
      isActive = true
      if (plan === 'lite') {
        maxTipAmount = 500
      } else if (plan === 'pro') {
        maxTipAmount = null // unlimited
      }
    } else {
      // Trial expired, no active subscription - limited mode
      plan = 'free'
      isActive = false
      maxTipAmount = null
    }

    return {
      plan,
      isActive,
      isTrialExpired,
      isLimitedMode: isTrialExpired && !hasActiveSubscription,
      maxTipAmount,
      expiryDate: subscriptionExpiry?.toISOString() || null
    }
  } catch (error) {
    console.error('Error getting subscription status:', error)
    return {
      plan: 'free',
      isActive: false,
      isTrialExpired: true,
      isLimitedMode: true,
      maxTipAmount: null,
      expiryDate: null
    }
  }
}

export const shouldShowGraceScreen = async (phone: string): Promise<boolean> => {
  // Check if user has explicitly chosen limited mode
  const hasChosenLimitedMode = await AsyncStorage.getItem(`limitedMode_${phone}`)
  console.log('Limited mode check:', { phone, hasChosenLimitedMode })
  if (hasChosenLimitedMode === 'true') {
    console.log('User chose limited mode, not showing grace screen')
    return false // Don't show grace screen if user chose limited mode
  }
  
  const status = await getSubscriptionStatus(phone)
  console.log('Subscription status:', status)
  const shouldShow = status.isTrialExpired && !status.isActive
  console.log('Should show grace screen:', shouldShow)
  return shouldShow
}

export const canReceiveTips = async (phone: string): Promise<boolean> => {
  // Users can always receive tips, even in limited mode
  return true
}

export const canAccessFullFeatures = async (phone: string): Promise<boolean> => {
  const status = await getSubscriptionStatus(phone)
  return status.isActive || !status.isTrialExpired
}

export const getMaxTipAmount = async (phone: string): Promise<number | null> => {
  const status = await getSubscriptionStatus(phone)
  return status.maxTipAmount
}

export const setLimitedMode = async (phone: string): Promise<void> => {
  await AsyncStorage.setItem(`limitedMode_${phone}`, 'true')
}

export const clearLimitedMode = async (phone: string): Promise<void> => {
  await AsyncStorage.removeItem(`limitedMode_${phone}`)
}