import { MaterialIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
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

  useEffect(() => {
    checkAuth()
  }, [])

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
      
      // Try to find worker data with proper error handling
      const { data: workerData, error } = await supabase
        .from('workers')
        .select('name, worker_id, total_tips, tip_count, occupation')
        .eq('phone', phone)
        .maybeSingle()
      
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
      {/* Fixed Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.profilePic, { backgroundColor: colors.border }]}>
            <MaterialIcons name="person" size={24} color={colors.text} />
          </View>
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

      {/* Fixed Earnings Card */}
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
      
      {/* Spacer */}
      <View style={styles.spacer} />

      {/* Scrollable Content */}
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>



      <View style={styles.quickActions}>
        <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.card }]} onPress={() => setShowQR(true)}>
          <View style={[styles.actionIcon, { backgroundColor: colors.primary }]}>
            <MaterialIcons name="qr-code" size={28} color="#fff" />
          </View>
          <Text style={[styles.actionTitle, { color: colors.text }]}>My QR Code</Text>
          <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>Show to customers</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.card }]} onPress={() => router.push('/analytics')}>
          <View style={[styles.actionIcon, { backgroundColor: colors.primary }]}>
            <MaterialIcons name="analytics" size={28} color="#fff" />
          </View>
          <Text style={[styles.actionTitle, { color: colors.text }]}>Analytics</Text>
          <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>View earnings</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.card }]} onPress={() => router.push('/scanner')}>
          <View style={[styles.actionIcon, { backgroundColor: colors.primary }]}>
            <MaterialIcons name="qr-code-scanner" size={28} color="#fff" />
          </View>
          <Text style={[styles.actionTitle, { color: colors.text }]}>Scan QR</Text>
          <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>Scan to tip</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.card }]} onPress={() => router.push('/subscription')}>
          <View style={[styles.actionIcon, { backgroundColor: colors.primary }]}>
            <MaterialIcons name="diamond" size={28} color="#fff" />
          </View>
          <Text style={[styles.actionTitle, { color: colors.text }]}>Subscription</Text>
          <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>Upgrade plan</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.infoSection, { backgroundColor: colors.card }]}>
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
        <ModalOverlay visible={showQR}>
          <View style={styles.qrModalContainer}>
            <View style={[styles.qrModalContent, { backgroundColor: colors.background }]}>
              <View style={[styles.qrModalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.qrModalTitle, { color: colors.text }]}>My QR Code</Text>
                <TouchableOpacity onPress={() => setShowQR(false)} style={styles.qrCloseButton}>
                  <MaterialIcons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.qrModalBody}>
                <Text style={[styles.qrModalSubtitle, { color: colors.textSecondary }]}>Customers can scan this to tip you</Text>
                
                {workerID && (
                  <View style={[styles.qrCodeWrapper, { backgroundColor: colors.card }]}>
                    <QRCode
                      value={`https://ttip-backend.onrender.com/tip/${workerID}`}
                      size={180}
                      backgroundColor="white"
                      color="black"
                      logo={require('../../assets/images/icon.png')}
                      logoSize={30}
                      logoBackgroundColor="white"
                      logoMargin={2}
                    />
                  </View>
                )}
                
                <Text style={[styles.qrWorkerID, { color: colors.textSecondary }]}>Worker ID: {workerID}</Text>
              </View>
            </View>
          </View>
        </ModalOverlay>
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
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1000,
    elevation: 5,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  scrollContent: {
    flex: 1,
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
    backgroundColor: '#FF3B30',
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
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
    zIndex: 999,
  },
  spacer: {
    height: 16,
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  qrModalContent: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    overflow: 'hidden',
  },
  qrModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  qrModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  qrCloseButton: {
    padding: 4,
  },
  qrModalBody: {
    padding: 20,
    alignItems: 'center',
  },
  qrModalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  qrCodeWrapper: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  qrWorkerID: {
    fontSize: 12,
    textAlign: 'center',
  },
})