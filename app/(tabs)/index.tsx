import { MaterialIcons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import React, { useEffect, useState, useCallback } from 'react'
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image, RefreshControl } from 'react-native'

import QRCode from 'react-native-qrcode-svg'
import ModalOverlay from '../../components/ModalOverlay'
import GlobalModal from '../../components/GlobalModal'
import NotificationsModal from '../../components/NotificationsModal'
import { useNotifications } from '../../hooks/useNotifications'
import { getCurrentUser, getCurrentUserName, isLoggedIn } from '../../lib/auth'
import { checkMilestones } from '../../lib/notifications'
import { formatPhoneForDisplay } from '../../lib/phone-utils'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../lib/theme-context'
import { getSubscriptionStatus } from '../../lib/subscription-utils'
import { fonts, fontWeights } from '../../lib/fonts'
import { NetworkManager } from '../../lib/network-manager'
import { OfflineStorage } from '../../lib/offline-storage'
import { OfflinePayment } from '../../lib/offline-payment'
import { validateUserOnline } from '../../lib/offline-auth'
import OptimizedImage from '../../components/OptimizedImage'

export default function HomeScreen() {
  const { colors } = useTheme()
  const { unreadCount, refreshUnreadCount } = useNotifications()
  const [userPhone, setUserPhone] = useState('')
  const [userName, setUserName] = useState('')
  const [userOccupation, setUserOccupation] = useState('Service Worker')
  const [showQR, setShowQR] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [workerID, setWorkerID] = useState('')
  const [totalTips, setTotalTips] = useState(0)
  const [tipCount, setTipCount] = useState(0)
  const [profileImage, setProfileImage] = useState('')
  const [isOnline, setIsOnline] = useState(true)
  const [subscriptionPlan, setSubscriptionPlan] = useState('')
  const [showAmount, setShowAmount] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [offlinePayments, setOfflinePayments] = useState({ pending: 0, total: 0 })
  const [isLimitedMode, setIsLimitedMode] = useState(false)

  // Network status monitoring
  useEffect(() => {
    const unsubscribe = NetworkManager.addListener(setIsOnline);
    return unsubscribe;
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkAuth()
      loadOfflinePayments()
    }, [])
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await checkAuth()
    await loadOfflinePayments()
    setRefreshing(false)
  }, [])

  const loadOfflinePayments = async () => {
    const status = await OfflinePayment.getOfflinePaymentStatus()
    setOfflinePayments(status)
  }

  const checkAuth = async () => {
    const loggedIn = await isLoggedIn()
    if (!loggedIn) {
      router.replace('/welcome')
      return
    }
    const phone = await getCurrentUser()
    const name = await getCurrentUserName()
    
    // Optional: validate user online (doesn't affect login state)
    if (isOnline) {
      const isValidOnline = await validateUserOnline()
      if (!isValidOnline) {
        console.log('User not found online, but staying logged in for offline use')
      }
    }
    
    if (phone) {
      setUserPhone(formatPhoneForDisplay(phone))
    }
    
    if (name) {
      setUserName(name)
    }
    
    if (phone) {
      console.log('Fetching worker data for phone:', phone)
      
      try {
        // Try to find worker data with proper error handling and force refresh
        const { data: workerData, error } = await supabase
          .from('workers')
          .select('name, worker_id, total_tips, tip_count, occupation, profile_image_url')
          .eq('phone', phone)
          .maybeSingle()
        
      // Force refresh profile image if it exists
      if (workerData?.profile_image_url) {
        setProfileImage(workerData.profile_image_url + '?t=' + Date.now())
      }
      
      console.log('Final worker data result:', { workerData, error })
      
      if (workerData) {
        if (workerData.name && !name) {
          setUserName(workerData.name)
        }
        if (workerData.occupation) {
          setUserOccupation(workerData.occupation)
        }
        if (workerData.worker_id) {
          setWorkerID(workerData.worker_id)
        }
        if (workerData.profile_image_url) {
          setProfileImage(workerData.profile_image_url)
        }
        
        // Get subscription plan for crown display
        const { data: subscription } = await supabase
          .from('workers')
          .select('subscription_plan')
          .eq('phone', phone)
          .single()
        
        if (subscription) {
          setSubscriptionPlan(subscription.subscription_plan)
        }
        
        // Check if user is in limited mode
        const subscriptionStatus = await getSubscriptionStatus(phone)
        setIsLimitedMode(subscriptionStatus.isLimitedMode)
        const newTotal = workerData.total_tips || 0
        const previousTotal = totalTips
        setTotalTips(newTotal)
        setTipCount(workerData.tip_count || 0)
        
        // Check for milestones
        if (previousTotal > 0 && newTotal > previousTotal) {
          await checkMilestones(newTotal, previousTotal)
          refreshUnreadCount()
        }
        
        // Store data for offline use
        await OfflineStorage.storeUserData({
          name: workerData.name,
          occupation: workerData.occupation,
          worker_id: workerData.worker_id,
          total_tips: workerData.total_tips,
          tip_count: workerData.tip_count,
          phone: phone
        })
        } else {
          console.log('No worker found for phone:', phone)
          // User might not be registered as worker yet
          setUserName('User')
        }
      } catch (error) {
        console.log('Failed to fetch worker data, using cached data')
        // Use cached/offline data when network fails
        setUserName(name || 'User')
        
        // Load offline data
        const offlineData = await OfflineStorage.getUserData()
        if (offlineData) {
          setUserName(offlineData.name || name || 'User')
          setUserOccupation(offlineData.occupation || 'Service Worker')
          setWorkerID(offlineData.worker_id || '')
          setTotalTips(offlineData.total_tips || 0)
          setTipCount(offlineData.tip_count || 0)
        }
      }
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Fixed Header Only */}
      <View style={[styles.fixedHeader, { backgroundColor: colors.background }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.push('/profile')} style={styles.profileContainer}>
            {profileImage ? (
              <OptimizedImage 
                source={{ uri: profileImage }} 
                style={styles.profilePic}
                lazy={true}
                errorComponent={
                  <MaterialIcons name="person" size={24} color={colors.text} />
                }
              />
            ) : (
              <MaterialIcons name="person" size={24} color={colors.text} />
            )}
            {(subscriptionPlan === 'pro_plan' || subscriptionPlan === 'pro') && (
              <View style={styles.crownContainer}>
                <MaterialIcons name="workspace-premium" size={16} color="#FFD700" />
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.greetingContainer}>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>Welcome to TTip,</Text>
            <Text style={[styles.userName, { color: colors.text }]}>{userName || 'User'} 👋</Text>
            <Text style={[styles.userOccupation, { color: colors.textSecondary }]}>{userOccupation}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            onPress={() => setShowNotifications(true)}
            style={styles.notificationButton}
          >
            <MaterialIcons name="notifications-none" size={24} color="#999ca0" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContainer} 
        showsVerticalScrollIndicator={false}
        bounces={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Earnings Card */}
        <View style={[styles.balanceCard, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <View style={styles.ttipBrand}>
              <MaterialIcons name="account-balance-wallet" size={20} color={colors.primary} />
              <Text style={[styles.brandText, { color: colors.text }]}>TTip Earnings</Text>
            </View>
          </View>
          <View style={styles.balanceRow}>
            <Text style={[styles.balanceAmount, { color: colors.text }]}>
              KSh {showAmount ? totalTips.toLocaleString() : '••••••'}
            </Text>
            <TouchableOpacity 
              onPress={() => setShowAmount(!showAmount)}
              style={styles.eyeToggle}
            >
              <MaterialIcons 
                name={showAmount ? 'visibility' : 'visibility-off'} 
                size={20} 
                color={colors.textSecondary} 
              />
            </TouchableOpacity>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{tipCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tips</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>KSh {tipCount > 0 ? Math.round(totalTips / tipCount).toLocaleString() : '0'}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg</Text>
            </View>
          </View>
        </View>

        {/* Offline Status */}
        {!isOnline && (
          <View style={styles.offlineIndicator}>
            <MaterialIcons name="wifi-off" size={16} color="#FF6B00" />
            <Text style={styles.offlineText}>Offline Mode</Text>
            {offlinePayments.pending > 0 && (
              <Text style={styles.pendingText}>{offlinePayments.pending} pending</Text>
            )}
          </View>
        )}
        
        {/* Limited Mode Status */}
        {isLimitedMode && (
          <View style={styles.limitedModeIndicator}>
            <MaterialIcons name="lock" size={16} color="#9C27B0" />
            <Text style={styles.limitedModeText}>Limited Mode</Text>
            <TouchableOpacity onPress={() => router.push('/subscription')}>
              <Text style={styles.upgradeText}>Upgrade</Text>
            </TouchableOpacity>
          </View>
        )}

      <View style={styles.quickActions}>
        <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.background }]} onPress={() => router.push('/widget-setup')}>
          <View style={[styles.actionIcon, { backgroundColor: colors.primary }]}>
            <MaterialIcons name="widgets" size={28} color="#fff" />
          </View>
          <Text style={[styles.actionTitle, { color: colors.text }]}>QR Widget</Text>
          <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>Add to home screen</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.background }]} onPress={() => router.push('/analytics')}>
          <View style={[styles.actionIcon, { backgroundColor: colors.accent }]}>
            <MaterialIcons name="analytics" size={28} color="#fff" />
          </View>
          <Text style={[styles.actionTitle, { color: colors.text }]}>Analytics</Text>
          <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>View earnings</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.background }]} onPress={() => router.push('/scanner')}>
          <View style={[styles.actionIcon, { backgroundColor: colors.accent }]}>
            <MaterialIcons name="qr-code-scanner" size={28} color="#fff" />
          </View>
          <Text style={[styles.actionTitle, { color: colors.text }]}>Scan QR</Text>
          <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>Scan to tip</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.background }]} onPress={() => router.push('/subscription')}>
          <View style={[styles.actionIcon, { backgroundColor: colors.accent }]}>
            <MaterialIcons name="diamond" size={28} color="#fff" />
          </View>
          <Text style={[styles.actionTitle, { color: colors.text }]}>Subscription</Text>
          <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>Upgrade plan</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.background }]}>
          <View style={[styles.actionIcon, { backgroundColor: '#666' }]}>
            <MaterialIcons name="more-horiz" size={28} color="#fff" />
          </View>
          <Text style={[styles.actionTitle, { color: colors.text }]}>More</Text>
          <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>Coming soon</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.infoSection, { backgroundColor: colors.background }]}>
        <Text style={[styles.infoTitle, { color: colors.text }]}>How TTip Works</Text>
        <View style={styles.infoItem}>
          <Text style={styles.infoEmoji}>1️⃣</Text>
          <Text style={[styles.infoText, { color: colors.text }]}>Scan a worker's QR code</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoEmoji}>2️⃣</Text>
          <Text style={[styles.infoText, { color: colors.text }]}>Enter tip amount</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoEmoji}>3️⃣</Text>
          <Text style={[styles.infoText, { color: colors.text }]}>Pay via M-Pesa</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoEmoji}>✅</Text>
          <Text style={[styles.infoText, { color: colors.text }]}>Worker receives tip instantly</Text>
        </View>
      </View>
      
      <GlobalModal visible={showQR} onClose={() => setShowQR(false)}>
        <View style={styles.qrCenterContainer}>
          {workerID && (
            <View style={[styles.qrCodeWrapper, { backgroundColor: '#ffffff' }]}>
              <QRCode
                value={isOnline 
                  ? `${process.env.EXPO_PUBLIC_BACKEND_URL || 'https://ttip-app.onrender.com'}/tip/${workerID}?ref=app&worker=${workerID}&timestamp=${Date.now()}`
                  : NetworkManager.handleOfflineQRScan(workerID)
                }
                size={200}
                backgroundColor="white"
                color="black"
                logo={require('../../assets/images/mylogo.png')}
                logoSize={40}
                logoBackgroundColor="transparent"
                logoMargin={2}
                logoBorderRadius={20}
                ecl="M"
              />
            </View>
          )}
        </View>
      </GlobalModal>

      </ScrollView>
      
      {showNotifications && (
        <TouchableOpacity 
          style={styles.dropdownOverlay} 
          activeOpacity={1} 
          onPress={() => {
            setShowNotifications(false)
            refreshUnreadCount()
          }}
        >
          <NotificationsModal
            visible={showNotifications}
            onClose={() => {
              setShowNotifications(false)
              refreshUnreadCount()
            }}
          />
        </TouchableOpacity>
      )}
      
      <TouchableOpacity 
        style={[styles.floatingButton, { backgroundColor: colors.primary }]} 
        onPress={() => setShowQR(true)}
      >
        <MaterialIcons name="qr-code" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fixedHeader: {
    paddingTop: 50,
    paddingBottom: 10,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1000,
    elevation: 5,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileContainer: {
    position: 'relative',
  },
  crownContainer: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  notificationButton: {
    position: 'relative',
    marginRight: -7,
    marginLeft: -50,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF6B00',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 13,
    fontFamily: fonts.regular,
    fontWeight: fontWeights.regular,
    opacity: 0.8,
    letterSpacing: 0.1,
  },
  userName: {
    fontSize: 16,
    fontFamily: fonts.medium,
    fontWeight: fontWeights.semibold,
    letterSpacing: 0.2,
  },
  balanceCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ttipBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandText: {
    fontSize: 16,
    fontFamily: fonts.medium,
    fontWeight: fontWeights.medium,
    letterSpacing: 0.3,
    marginLeft: 8,
  },
  userOccupation: {
    fontSize: 12,
    marginTop: 2,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  balanceAmount: {
    fontSize: 36,
    fontWeight: '300',
    letterSpacing: 0.5,
  },

  eyeToggle: {
    marginLeft: 12,
    padding: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E0E0E0',
  },
  statValue: {
    fontSize: 20,
    fontFamily: fonts.light,
    fontWeight: fontWeights.light,
    letterSpacing: 0.3,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
    fontWeight: fontWeights.medium,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  actionCard: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontFamily: fonts.medium,
    fontWeight: fontWeights.semibold,
    letterSpacing: 0.2,
    textAlign: 'center',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 11,
    fontFamily: fonts.regular,
    fontWeight: fontWeights.regular,
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  infoSection: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'left',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoEmoji: {
    fontSize: 20,
    marginRight: 15,
    width: 30,
  },
  infoText: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  qrModalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  qrCenterContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrCodeWrapper: {
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: -7,
    bottom: 0,
    zIndex: 1100,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 120,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3E0',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  offlineText: {
    color: '#FF6B00',
    fontSize: 14,
    fontWeight: '600',
  },
  pendingText: {
    color: '#FF6B00',
    fontSize: 12,
    backgroundColor: '#FFE0B2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  limitedModeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E5F5',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  limitedModeText: {
    color: '#9C27B0',
    fontSize: 14,
    fontWeight: '600',
  },
  upgradeText: {
    color: '#9C27B0',
    fontSize: 12,
    backgroundColor: '#E1BEE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    fontWeight: '600',
  },
})