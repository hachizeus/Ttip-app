import React, { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal } from 'react-native'
import { router } from 'expo-router'
import { getCurrentUser } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { MaterialIcons } from '@expo/vector-icons'
import { useTheme, ThemeProvider } from '../lib/theme-context'
import { initiateMpesaPayment } from '../lib/mpesa'
import ModalOverlay from '../components/ModalOverlay'

function SubscriptionContent() {
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

  useEffect(() => {
    loadSubscription()
  }, [])

  const loadSubscription = async () => {
    try {
      const phone = await getCurrentUser()
      if (!phone) return
      
      setUserPhone(phone)

      const { data: worker } = await supabase
        .from('workers')
        .select('subscription_plan, subscription_expiry')
        .eq('phone', phone)
        .single()

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
    const maxAttempts = 30 // Poll for 60 seconds (30 * 2 seconds)
    let attempts = 0
    
    const poll = async () => {
      try {
        const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL || 'https://ttip-app.onrender.com'}/api/subscription-status/${checkoutID}`)
        
        const result = await response.json()
        
        if (result.status === 'completed') {
          setPaymentStatusMessage('Payment successful! Your subscription has been updated.')
          loadSubscription()
          
          setTimeout(() => {
            setShowPaymentStatus(false)
            setPaymentStatusMessage('')
          }, 3000)
          
        } else if (result.status === 'failed') {
          setPaymentStatusMessage('Payment failed or was cancelled. Please try again.')
          
          setTimeout(() => {
            setShowPaymentStatus(false)
            setPaymentStatusMessage('')
          }, 3000)
          
        } else if (attempts < maxAttempts) {
          // Still pending, continue polling
          attempts++
          setTimeout(poll, 2000)
        } else {
          // Timeout
          setPaymentStatusMessage('Payment timeout. Please check your M-Pesa and try again if needed.')
          
          setTimeout(() => {
            setShowPaymentStatus(false)
            setPaymentStatusMessage('')
          }, 3000)
        }
      } catch (error) {
        setPaymentStatusMessage('Error checking payment status. Please try again.')
        
        setTimeout(() => {
          setShowPaymentStatus(false)
          setPaymentStatusMessage('')
        }, 3000)
      }
    }
    
    poll()
  }

  const handlePayment = async () => {
    if (!selectedPlan || !userPhone) return
    
    setPaymentLoading(true)
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL || 'https://ttip-app.onrender.com'}/api/subscription-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone: userPhone, 
          amount: selectedPlan.amount,
          plan: selectedPlan.name.toLowerCase().replace(' ', '_')
        })
      })
      
      const text = await response.text()
      let result
      try {
        result = JSON.parse(text)
      } catch (parseError) {
        console.error('JSON parse error:', parseError, 'Response text:', text)
        Alert.alert('Error', 'Invalid response from server')
        return
      }
      
      if (result.success && result.checkoutRequestID) {
        setShowPaymentModal(false)
        setCheckoutRequestID(result.checkoutRequestID)
        setPaymentStatusMessage('Payment initiated. Please complete on your phone...')
        setShowPaymentStatus(true)
        
        // Start polling for payment status
        pollPaymentStatus(result.checkoutRequestID)
      } else {
        Alert.alert('Payment Failed', result.error || 'Could not initiate payment')
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
      {/* Fixed Current Plan Section */}
      <View style={[styles.fixedSection, { backgroundColor: colors.background }]}>
        {subscription && (
          <View style={[styles.currentPlan, { backgroundColor: colors.background }]}>
            <View style={styles.currentPlanHeader}>
              <MaterialIcons name="diamond" size={24} color={colors.accent} />
              <Text style={[styles.currentPlanTitle, { color: colors.text }]}>Current Plan</Text>
            </View>
            <Text style={[styles.planName, { color: colors.primary }]}>{subscription.subscription_plan}</Text>
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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
            
            {!plan.highlight ? (
              <TouchableOpacity 
                style={[styles.subscribeButton, { backgroundColor: colors.accent }]}
                onPress={() => handlePlanSelect(plan)}
              >
                <Text style={styles.subscribeButtonText}>Subscribe</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.currentBadge, { backgroundColor: '#00C851' }]}>
                <Text style={styles.currentBadgeText}>Active</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <Modal visible={showPaymentModal} transparent animationType="fade">
        <ModalOverlay visible={showPaymentModal}>
          <View style={styles.paymentModalContainer}>
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
          </View>
        </ModalOverlay>
      </Modal>

      <Modal visible={showPaymentStatus} transparent animationType="fade">
        <ModalOverlay visible={showPaymentStatus}>
          <View style={styles.statusModalContainer}>
            <View style={[styles.statusModalContent, { backgroundColor: colors.background }]}>
              <MaterialIcons name="payment" size={48} color={colors.primary} />
              <Text style={[styles.statusMessage, { color: colors.text }]}>{paymentStatusMessage}</Text>
            </View>
          </View>
        </ModalOverlay>
      </Modal>
    </View>
  )
}

export default function SubscriptionScreen() {
  return (
    <ThemeProvider>
      <SubscriptionContent />
    </ThemeProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  fixedSection: {
    paddingTop: 60,
    paddingHorizontal: 12,
    paddingBottom: 12,
    zIndex: 1000,
    elevation: 5,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 100,
  },
  currentPlan: {
    padding: 20,
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
    fontWeight: '600',
    marginLeft: 8,
  },
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  expiryText: {
    fontSize: 14,
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
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
    fontWeight: 'bold',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '600',
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
    fontWeight: 'bold',
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
  paymentModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  paymentModalContent: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    overflow: 'hidden',
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
  statusModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statusModalContent: {
    width: '100%',
    maxWidth: 280,
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
  },
  statusMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
  },
})