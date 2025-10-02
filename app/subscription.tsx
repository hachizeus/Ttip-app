import { MaterialIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { getCurrentUser } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useTheme } from '../lib/theme-context'

import GlobalModal from '../components/GlobalModal'
import { fonts, fontWeights } from '../lib/fonts'
import { NetworkManager } from '../lib/network-manager'
import { OfflinePayments } from '../lib/offline-payments'
import { clearLimitedMode } from '../lib/subscription-utils'

export default function SubscriptionScreen() {
  const { colors } = useTheme()
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<any>(null)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [userPhone, setUserPhone] = useState('')
  const [showPaymentStatus, setShowPaymentStatus] = useState(false)
  const [paymentStatusMessage, setPaymentStatusMessage] = useState('')
  const [checkoutRequestID, setCheckoutRequestID] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadSubscription()
  }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadSubscription()
    setRefreshing(false)
  }, [])

  const loadSubscription = async () => {
    try {
      const phone = await getCurrentUser()
      if (!phone) return
      
      setUserPhone(phone)

      // Force fresh data from database
      const { data: worker, error } = await supabase
        .from('workers')
        .select('subscription_plan, subscription_expiry')
        .eq('phone', phone)
        .single()

      console.log('Subscription data loaded:', { worker, error, phone })

      if (worker) {
        setSubscription(worker)
      }
    } catch (error) {
      console.error('Error loading subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  const plans = [
    {
      name: 'Free Trial',
      price: '7 days',
      amount: 0,
      features: ['Unlimited tips', 'Basic analytics', 'QR code'],
      highlight: true,
    },
    {
      name: 'Lite Plan',
      price: 'KSh 50/month',
      amount: 50,
      features: ['Max tip = KSh 500', 'Basic analytics', 'QR code'],
    },
    {
      name: 'Pro Plan',
      price: 'KSh 150/month',
      amount: 150,
      features: ['Unlimited tips', 'Advanced analytics', 'Priority support'],
    },
  ]

  const handlePlanSelect = (plan: any) => {
    if (plan.highlight) return // Free trial, no payment needed
    setSelectedPlan(plan)
    setShowPaymentModal(true)
  }

  const pollPaymentStatus = async (checkoutID: string) => {
    const maxAttempts = 15 // Poll for 30 seconds (15 * 2 seconds)
    let attempts = 0
    
    const poll = async () => {
      try {
        const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://ttip-backend.onrender.com'
        const response = await fetch(`${backendUrl}/api/subscription-status/${checkoutID}`)
        
        const result = await response.json()
        
        if (result.status === 'success' || result.status === 'completed') {
          setPaymentStatusMessage('Payment successful! Your subscription has been updated.')
          
          // Clear limited mode and refresh subscription data
          setTimeout(async () => {
            const phone = await getCurrentUser()
            if (phone) {
              await clearLimitedMode(phone)
            }
            await loadSubscription()
            setShowPaymentStatus(false)
            setPaymentStatusMessage('')
          }, 2000)
          
        } else if (result.status === 'failed' || result.status === 'cancelled') {
          setPaymentStatusMessage('Payment was cancelled or failed. Please try again.')
          
          setTimeout(() => {
            setShowPaymentStatus(false)
            setPaymentStatusMessage('')
          }, 2000)
          
        } else if (attempts < maxAttempts) {
          // Still pending, continue polling faster
          attempts++
          setTimeout(poll, 1000) // Check every 1 second instead of 2
        } else {
          // Timeout - assume cancelled
          setPaymentStatusMessage('Payment timeout. Transaction may have been cancelled.')
          
          setTimeout(() => {
            setShowPaymentStatus(false)
            setPaymentStatusMessage('')
          }, 2000)
        }
      } catch (error) {
        setPaymentStatusMessage('Error checking payment status. Please try again.')
        
        setTimeout(() => {
          setShowPaymentStatus(false)
          setPaymentStatusMessage('')
        }, 2000)
      }
    }
    
    poll()
  }

  const handlePayment = async () => {
    if (!selectedPlan || !userPhone) return
    
    setPaymentLoading(true)
    try {
      const isOnline = NetworkManager.getIsOnline()
      
      if (isOnline) {
        // Online payment
        const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://ttip-backend.onrender.com'
        console.log('Making payment request to:', `${backendUrl}/api/subscription-payment`)
        
        const response = await fetch(`${backendUrl}/api/subscription-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            phone: userPhone, 
            amount: selectedPlan.amount,
            plan: selectedPlan.name.toLowerCase().replace(' ', '_')
          })
        })
        
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.checkoutRequestID) {
            setShowPaymentModal(false)
            setCheckoutRequestID(result.checkoutRequestID)
            setPaymentStatusMessage('Payment initiated. Please complete on your phone...')
            setShowPaymentStatus(true)
            pollPaymentStatus(result.checkoutRequestID)
          } else {
            Alert.alert('Payment Failed', result.error || 'Could not initiate payment')
          }
        } else {
          Alert.alert('Error', 'Payment service unavailable. Please try again later.')
        }
      } else {
        // Offline payment
        const result = await OfflinePayments.processSubscriptionOffline(
          userPhone, 
          selectedPlan.amount, 
          selectedPlan.name
        )
        setShowPaymentModal(false)
        Alert.alert('Offline Mode', result.message + '\n\nYour subscription will be activated when internet connection is restored.')
      }
    } catch (error) {
      console.error('Payment error:', error)
      Alert.alert('Error', 'Payment failed. Please try again.')
    } finally {
      setPaymentLoading(false)
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      {/* Header with Back Arrow */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Subscription</Text>
        <View style={styles.headerSpacer} />
      </View>
      {/* Fixed Current Plan Section */}
      <View style={[styles.fixedSection, { backgroundColor: colors.background }]}> 
        {subscription && (
          <View style={[styles.currentPlan, { backgroundColor: colors.background }]}> 
            <View style={styles.currentPlanHeader}> 
              <MaterialIcons name="diamond" size={24} color={colors.accent} />
              <Text style={[styles.currentPlanTitle, { color: colors.text }]}>Current Plan</Text>
            </View>
            <Text style={[styles.planName, { color: colors.primary }]}> 
              {subscription.subscription_plan === 'lite' ? 'Lite Plan' : 
               subscription.subscription_plan === 'pro' ? 'Pro Plan' :
               subscription.subscription_plan === 'lite_plan' ? 'Lite Plan' : 
               subscription.subscription_plan === 'pro_plan' ? 'Pro Plan' :
               subscription.subscription_plan === 'free' ? 'Free Trial' :
               subscription.subscription_plan || 'Free Trial'}
            </Text>
            {subscription.subscription_expiry && (
              <View style={styles.expiryContainer}> 
                <MaterialIcons name="schedule" size={16} color={colors.textSecondary} />
                <Text style={[styles.expiryText, { color: colors.textSecondary }]}> 
                  Expires: {new Date(subscription.subscription_expiry).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Scrollable Content */}
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Available Plans</Text>

        {plans.map((plan, index) => (
          <View key={index} style={[
            styles.planCard, 
            { backgroundColor: colors.background },
            plan.highlight && styles.highlightedPlan
          ]}>
            <View style={styles.planHeader}>
              <Text style={[styles.planCardName, { color: colors.text }]}>{plan.name}</Text>
              <Text style={[styles.planPrice, { color: colors.accent }]}>{plan.price}</Text>
            </View>
            
            <View style={styles.featuresContainer}>
              {plan.features.map((feature, featureIndex) => (
                <View key={featureIndex} style={styles.featureRow}>
                  <MaterialIcons name="check" size={16} color="#00C851" />
                  <Text style={[styles.featureText, { color: colors.textSecondary }]}>{feature}</Text>
                </View>
              ))}
            </View>
            
            {(() => {
              const now = new Date()
              const isExpired = subscription?.subscription_expiry ? now > new Date(subscription.subscription_expiry) : true
              const isCurrentPlan = (
                ((subscription?.subscription_plan === 'lite' || subscription?.subscription_plan === 'lite_plan') && plan.name === 'Lite Plan') ||
                ((subscription?.subscription_plan === 'pro' || subscription?.subscription_plan === 'pro_plan') && plan.name === 'Pro Plan')
              )
              
              if (isCurrentPlan && !isExpired) {
                return (
                  <View style={[styles.currentBadge, { backgroundColor: '#00C851' }]}>
                    <Text style={styles.currentBadgeText}>Current Plan</Text>
                  </View>
                )
              } else if (isCurrentPlan && isExpired) {
                return (
                  <TouchableOpacity 
                    style={[styles.subscribeButton, { backgroundColor: colors.accent }]}
                    onPress={() => handlePlanSelect(plan)}
                  >
                    <Text style={styles.subscribeButtonText}>Subscribe</Text>
                  </TouchableOpacity>
                )
              } else if (plan.highlight) {
                return (
                  <View style={[styles.currentBadge, { backgroundColor: '#666' }]}>
                    <Text style={styles.currentBadgeText}>Trial Ended</Text>
                  </View>
                )
              } else {
                return (
                  <TouchableOpacity 
                    style={[styles.subscribeButton, { backgroundColor: colors.accent }]}
                    onPress={() => handlePlanSelect(plan)}
                  >
                    <Text style={styles.subscribeButtonText}>Subscribe</Text>
                  </TouchableOpacity>
                )
              }
            })()}
          </View>
        ))}
      </ScrollView>

      <GlobalModal visible={showPaymentModal} onClose={() => setShowPaymentModal(false)}>
        <View style={[styles.paymentModalContent, { backgroundColor: colors.background }]}>
          <View style={[styles.paymentModalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.paymentModalTitle, { color: colors.text }]}>Confirm Payment</Text>
            <TouchableOpacity onPress={() => setShowPaymentModal(false)} style={styles.paymentCloseButton}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.paymentModalBody}>
            {selectedPlan && (
              <View style={[styles.planSummary, { backgroundColor: colors.background }]}>
                <Text style={[styles.planSummaryName, { color: colors.text }]}>{selectedPlan.name}</Text>
                <Text style={[styles.planSummaryAmount, { color: colors.primary }]}>KSh {selectedPlan.amount}</Text>
                <Text style={[styles.planSummaryPhone, { color: colors.textSecondary }]}>From: {userPhone}</Text>
              </View>
            )}
            
            <View style={styles.paymentButtons}>
              <TouchableOpacity
                style={[styles.paymentButton, styles.cancelPaymentButton, { borderColor: colors.border }]}
                onPress={() => setShowPaymentModal(false)}
                disabled={paymentLoading}
              >
                <Text style={[styles.cancelPaymentText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.paymentButton, styles.confirmPaymentButton, { backgroundColor: colors.primary }]}
                onPress={handlePayment}
                disabled={paymentLoading}
              >
                <Text style={styles.confirmPaymentText}>
                  {paymentLoading ? 'Processing...' : 'Pay Now'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </GlobalModal>

      <Modal visible={showPaymentStatus} transparent animationType="fade">
        <View style={styles.statusModalBackdrop}>
          <View style={styles.statusModalContainer}>
            <View style={[styles.statusModalContent, { backgroundColor: colors.background }]}>
              <MaterialIcons name="payment" size={48} color={colors.primary} />
              <Text style={[styles.statusMessage, { color: colors.text }]}>{paymentStatusMessage}</Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // borderBottomWidth: 1,
    // borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 32,
  },
  fixedSection: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    marginTop: 60,
    zIndex: 1000,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 120,
  },
  currentPlan: {
    padding: 5,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  currentPlanTitle: {
    fontSize: 18,
    fontFamily: fonts.medium,
    fontWeight: fontWeights.semibold,
    marginLeft: 8,
  },
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  planName: {
    fontSize: 24,
    fontFamily: fonts.light,
    fontWeight: fontWeights.light,
    marginBottom: 4,
  },
  expiryText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    fontWeight: fontWeights.regular,
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: fonts.bold,
    fontWeight: fontWeights.bold,
    marginBottom: 16,
  },
  planCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  highlightedPlan: {
    borderWidth: 1,
    borderColor: '#00C851',
  },
  planHeader: {
    marginBottom: 16,
  },
  planCardName: {
    fontSize: 20,
    fontFamily: fonts.bold,
    fontWeight: fontWeights.bold,
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 18,
    fontFamily: fonts.light,
    fontWeight: fontWeights.light,
    marginBottom: 16,
  },
  featuresContainer: {
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    fontWeight: fontWeights.regular,
    marginLeft: 8,
  },
  subscribeButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fonts.bold,
    fontWeight: fontWeights.bold,
  },
  currentBadge: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  currentBadgeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentModalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  paymentModalContent: {
    width: 320,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1001,
  },
  paymentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  paymentModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  paymentCloseButton: {
    padding: 4,
  },
  paymentModalBody: {
    padding: 20,
  },
  planSummary: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  planSummaryName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  planSummaryAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  planSummaryPhone: {
    fontSize: 14,
  },
  paymentButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelPaymentButton: {
    borderWidth: 1,
  },
  cancelPaymentText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmPaymentButton: {
  },
  confirmPaymentText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusModalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statusModalContent: {
    width: 280,
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  statusMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
  },
})