import { MaterialIcons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import React, { useEffect, useState, useCallback } from 'react'
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native'
import { BlurView } from 'expo-blur'
import QRCode from 'react-native-qrcode-svg'
import ModalOverlay from '../../components/ModalOverlay'
import NotificationsModal from '../../components/NotificationsModal'
import { useNotifications } from '../../hooks/useNotifications'
import { getCurrentUser, getCurrentUserName, isLoggedIn } from '../../lib/auth'
import { checkMilestones } from '../../lib/notifications'
import { formatPhoneForDisplay } from '../../lib/phone-utils'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../lib/theme-context'

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

  useFocusEffect(
    useCallback(() => {
      checkAuth()
    }, [])
  )

  const checkAuth = async () => {
    const loggedIn = await isLoggedIn()
    if (!loggedIn) {
      router.replace('/welcome')
      return
    }
    const phone = await getCurrentUser()
    const name = await getCurrentUserName()
    
    if (phone) {
      setUserPhone(formatPhoneForDisplay(phone))
    }
    
    if (name) {
      setUserName(name)
    }
    
    if (phone) {
      console.log('Fetching worker data for phone:', phone)
      
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
        const newTotal = workerData.total_tips || 0
        const previousTotal = totalTips
        setTotalTips(newTotal)
        setTipCount(workerData.tip_count || 0)
        
        // Check for milestones
        if (previousTotal > 0 && newTotal > previousTotal) {
          await checkMilestones(newTotal, previousTotal)
          refreshUnreadCount()
        }
      } else {
        console.log('No worker found for phone:', phone)
        // User might not be registered as worker yet
        setUserName('User')
      }
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Fixed Header Only */}
      <View style={[styles.fixedHeader, { backgroundColor: colors.background }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.push('/profile')}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profilePic} />
            ) : (
              <View style={[styles.profilePic, { backgroundColor: colors.border }]}>
                <MaterialIcons name="person" size={24} color={colors.text} />
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
            <MaterialIcons name="notifications" size={24} color={colors.text} />
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
      >
        {/* Earnings Card */}
        <View style={[styles.balanceCard, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <View style={styles.ttipBrand}>
              <MaterialIcons name="account-balance-wallet" size={20} color={colors.primary} />
              <Text style={[styles.brandText, { color: colors.text }]}>TTip Earnings</Text>
            </View>
          </View>
          <Text style={[styles.balanceAmount, { color: colors.text }]}>KSh {totalTips.toLocaleString()}</Text>
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



      <View style={styles.quickActions}>
        <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.background }]} onPress={() => setShowQR(true)}>
          <View style={[styles.actionIcon, { backgroundColor: colors.primary }]}>
            <MaterialIcons name="qr-code" size={28} color="#fff" />
          </View>
          <Text style={[styles.actionTitle, { color: colors.text }]}>My QR Code</Text>
          <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>Show to customers</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.background }]} onPress={() => router.push('/analytics')}>
          <View style={[styles.actionIcon, { backgroundColor: colors.primary }]}>
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
      
      <Modal visible={showQR} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.qrModalContainer} 
          activeOpacity={1} 
          onPress={() => setShowQR(false)}
        >
          <BlurView intensity={60} tint="dark" style={styles.blurBackground} />
          <View style={styles.qrCenterContainer}>
            {workerID && (
              <View style={[styles.qrCodeWrapper, { backgroundColor: '#ffffff' }]}>
                <QRCode
                  value={`${process.env.EXPO_PUBLIC_BACKEND_URL || 'https://ttip-app.onrender.com'}/tip/${workerID}?ref=app&worker=${workerID}&timestamp=${Date.now()}`}
                  size={200}
                  backgroundColor="white"
                  color="black"
                  logo={require('../../assets/images/mylogo.png')}
                  logoSize={50}
                  logoBackgroundColor="white"
                  logoMargin={4}
                  logoBorderRadius={25}
                  ecl="M"
                />
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <NotificationsModal
        visible={showNotifications}
        onClose={() => {
          setShowNotifications(false)
          refreshUnreadCount()
        }}
      />
      </ScrollView>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  notificationButton: {
    position: 'relative',
    marginRight: 0,
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
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  userName: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
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
    fontWeight: '600',
    marginLeft: 8,
  },
  userOccupation: {
    fontSize: 12,
    marginTop: 2,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
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
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
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
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
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
})