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
  const status = await getSubscriptionStatus(phone)
  return status.isTrialExpired && !status.isActive
}

export const canReceiveTips = async (phone: string): Promise<boolean> => {
  const status = await getSubscriptionStatus(phone)
  return status.isActive || !status.isTrialExpired
}

export const getMaxTipAmount = async (phone: string): Promise<number | null> => {
  const status = await getSubscriptionStatus(phone)
  return status.maxTipAmount
}