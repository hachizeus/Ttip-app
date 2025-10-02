import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import React, { useCallback, useEffect, useState } from 'react'
import { Image, RefreshControl, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native'
import GlobalModal from '../../components/GlobalModal'
import { FacebookIcon, InstagramIcon, TwitterIcon, WhatsAppIcon } from '../../components/SocialIcons'
import { getCurrentUser, logout } from '../../lib/auth'
import { fonts, fontWeights } from '../../lib/fonts'
import { formatPhoneForDisplay } from '../../lib/phone-utils'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../lib/theme-context'

export default function ProfileScreen() {
  const { isDark, toggleTheme, colors } = useTheme()
  const [userPhone, setUserPhone] = useState('')
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [subscriptionPlan, setSubscriptionPlan] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadUserData()
  }, [])

  useFocusEffect(
    React.useCallback(() => {
      loadUserData()
    }, [])
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadUserData()
    setRefreshing(false)
  }, [])

  const loadUserData = async () => {
    const phone = await getCurrentUser()
    if (phone) {
      setUserPhone(formatPhoneForDisplay(phone))
      
      // Load user profile data directly from database
      try {
        const { data: worker, error } = await supabase
          .from('workers')
          .select('name, occupation, bio, profile_image_url, subscription_plan, subscription_expiry, created_at')
          .eq('phone', phone)
          .single()
        
        if (!error && worker) {
          setUserProfile(worker)
          setSubscriptionPlan(worker.subscription_plan || '')
          
          // Calculate subscription status like subscription page
          const now = new Date()
          const createdAt = new Date(worker.created_at)
          const trialEndDate = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000)
          const subscriptionExpiry = worker.subscription_expiry ? new Date(worker.subscription_expiry) : null
          
          const isTrialActive = now <= trialEndDate
          const hasActiveSubscription = subscriptionExpiry && now < subscriptionExpiry
          
          let plan = worker.subscription_plan || 'free'
          let isLimitedMode = false
          
          if (hasActiveSubscription) {
            // Use actual subscription plan if active
            plan = worker.subscription_plan
          } else if (isTrialActive) {
            plan = 'trial'
          } else {
            plan = 'free'
            isLimitedMode = true
          }
          
          setSubscriptionStatus({
            plan,
            isActive: isTrialActive || hasActiveSubscription,
            isLimitedMode,
            expiryDate: subscriptionExpiry?.toISOString() || null
          })
        }
      } catch (error) {
        console.error('Error loading profile:', error)
      }
    }
  }

  const handleLogout = () => {
    setShowLogoutModal(true)
  }

  const confirmLogout = async () => {
    setShowLogoutModal(false)
    await logout()
    // Go to welcome page
    router.replace('/welcome')
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Fixed Profile Section */}
      <View style={[styles.fixedProfileSection, { backgroundColor: colors.background }]}>
        <View style={styles.profileHeader}>
          <View style={styles.profileImageContainer}>
            {userProfile?.profile_image_url ? (
              <Image source={{ uri: userProfile.profile_image_url }} style={styles.profileImage} />
            ) : (
              <View style={[styles.avatarContainer, { backgroundColor: colors.primary }]}>
                <MaterialIcons name="person" size={30} color="#fff" />
              </View>
            )}
            {(subscriptionPlan === 'pro_plan' || subscriptionPlan === 'pro') && (
              <View style={styles.profileCrownContainer}>
                <MaterialIcons name="workspace-premium" size={18} color="#FFD700" />
              </View>
            )}
          </View>
          <View style={styles.profileInfo}>
            {userProfile?.name && (
              <Text style={[styles.name, { color: colors.text }]}>{userProfile.name}</Text>
            )}
            {userProfile?.occupation && (
              <Text style={[styles.occupation, { color: colors.textSecondary }]}>{userProfile.occupation}</Text>
            )}
          </View>
        </View>
        
        {userProfile?.bio && (
          <Text style={[styles.bio, { color: colors.text }]}>
            {userProfile.bio}
          </Text>
        )}
        
        <View style={styles.statsRow}>
          {subscriptionStatus && (
            <View style={[
              styles.planBadge,
              { backgroundColor: subscriptionStatus.isLimitedMode ? '#FF6B6B' : '#00C851' }
            ]}>
              <MaterialIcons 
                name={subscriptionStatus.isLimitedMode ? 'block' : 'verified'} 
                size={14} 
                color="#fff" 
                style={{ marginRight: 4 }}
              />
              <Text style={styles.planBadgeText}>
                {subscriptionStatus.plan === 'trial' ? 'Free Trial' :
                 subscriptionStatus.plan === 'free' ? 'Limited Mode' :
                 subscriptionStatus.plan === 'lite' ? 'Lite Plan' :
                 subscriptionStatus.plan === 'pro' ? 'Pro Plan' :
                 subscriptionStatus.plan === 'pro_plan' ? 'Pro Plan' :
                 subscriptionStatus.plan.charAt(0).toUpperCase() + subscriptionStatus.plan.slice(1)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Scrollable Menu */}
      <ScrollView 
        contentContainerStyle={styles.scrollContainer} 
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
        <View style={[styles.menu, { marginTop: 20 }]}>
        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: colors.background }]}
          onPress={() => router.push('/qr-code')}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: colors.primary }]}>
            <MaterialIcons name="qr-code" size={20} color="#fff" />
          </View>
          <View style={styles.menuContent}>
            <Text style={[styles.menuText, { color: colors.text }]}>My QR Code</Text>
            <Text style={[styles.menuSubtext, { color: colors.textSecondary }]}>Show to customers</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: colors.background }]}
          onPress={() => router.push('/subscription')}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: colors.primary }]}>
            <MaterialIcons name="diamond" size={20} color="#fff" />
          </View>
          <View style={styles.menuContent}>
            <Text style={[styles.menuText, { color: colors.text }]}>My Subscription</Text>
            <Text style={[styles.menuSubtext, { color: colors.textSecondary }]}>Manage your plan</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={[styles.menuItem, { backgroundColor: colors.background }]}>
          <View style={[styles.menuIconContainer, { backgroundColor: colors.primary }]}>
            <MaterialIcons name="palette" size={20} color="#fff" />
          </View>
          <View style={styles.menuContent}>
            <Text style={[styles.menuText, { color: colors.text }]}>Dark Theme</Text>
            <Text style={[styles.menuSubtext, { color: colors.textSecondary }]}>Toggle appearance</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: '#767577', true: colors.primary }}
            thumbColor={isDark ? '#fff' : '#f4f3f4'}
          />
        </View>

        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: colors.background }]}
          onPress={() => router.push('/settings')}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: colors.primary }]}>
            <MaterialIcons name="edit" size={20} color="#fff" />
          </View>
          <View style={styles.menuContent}>
            <Text style={[styles.menuText, { color: colors.text }]}>Edit Profile</Text>
            <Text style={[styles.menuSubtext, { color: colors.textSecondary }]}>Update your information</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: colors.background }]}
          onPress={() => router.push('/about')}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: '#666' }]}>
            <MaterialIcons name="info" size={20} color="#fff" />
          </View>
          <View style={styles.menuContent}>
            <Text style={[styles.menuText, { color: colors.text }]}>About TTip</Text>
            <Text style={[styles.menuSubtext, { color: colors.textSecondary }]}>App info & version</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

  {/* Removed View Leaderboard menu item */}

        <TouchableOpacity 
          style={[styles.menuItem, styles.logoutItem, { backgroundColor: colors.background }]}
          onPress={handleLogout}
        >
          <MaterialIcons name="logout" size={24} color="#FF3B30" style={styles.menuIcon} />
          <Text style={[styles.menuText, styles.logoutText]}>Logout</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.socialLinks}>
          <Text style={[styles.socialTitle, { color: colors.text }]}>Follow Us</Text>
          <View style={styles.socialRow}>
            <TouchableOpacity style={[styles.socialButton, { backgroundColor: '#1877F2' }]}>
              <FacebookIcon size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.socialButton, { backgroundColor: '#1DA1F2' }]}>
              <TwitterIcon size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.socialButton, { backgroundColor: '#E4405F' }]}>
              <InstagramIcon size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.socialButton, { backgroundColor: '#25D366' }]}>
              <WhatsAppIcon size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => router.push('/privacy-policy')}>
            <Text style={[styles.legalText, { color: colors.textSecondary }]}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={[styles.legalSeparator, { color: colors.textSecondary }]}>•</Text>
          <TouchableOpacity onPress={() => router.push('/terms-of-service')}>
            <Text style={[styles.legalText, { color: colors.textSecondary }]}>Terms of Service</Text>
          </TouchableOpacity>
        </View>
      </View>

      <GlobalModal visible={showLogoutModal} onClose={() => setShowLogoutModal(false)} blurIntensity={100}>
        <View style={[styles.logoutModalContent, { backgroundColor: colors.background }]}>
          <MaterialIcons name="logout" size={48} color="#FF3B30" style={styles.logoutIcon} />
          <Text style={[styles.logoutMessage, { color: colors.text }]}>
            Are you sure you want to logout?
          </Text>
          
          <View style={styles.logoutButtons}>
            <TouchableOpacity
              style={[styles.logoutButton, styles.cancelLogoutButton, { borderColor: colors.border }]}
              onPress={() => setShowLogoutModal(false)}
            >
              <Text style={[styles.cancelLogoutText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.logoutButton, styles.confirmLogoutButton]}
              onPress={confirmLogout}
            >
              <Text style={styles.confirmLogoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </GlobalModal>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  fixedProfileSection: {
    paddingTop: 40,
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 1000,
    elevation: 5,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 150,
  },

  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profileCrownContainer: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#fff',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontFamily: fonts.medium,
    fontWeight: fontWeights.semibold,
    marginBottom: 2,
  },
  occupation: {
    fontSize: 14,
    fontFamily: fonts.regular,
    fontWeight: fontWeights.regular,
    marginBottom: 4,
  },
  phone: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  status: {
    fontSize: 14,
    color: '#666',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  planBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: fonts.medium,
    fontWeight: fontWeights.medium,
  },
  bio: {
    fontSize: 14,
    fontFamily: fonts.regular,
    fontWeight: fontWeights.regular,
    lineHeight: 18,
    marginBottom: 12,
  },
  limitedText: {
    fontSize: 12,
    color: '#FF6B6B',
    marginTop: 4,
  },
  menu: {
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuText: {
    fontSize: 16,
    fontFamily: fonts.medium,
    fontWeight: fontWeights.medium,
    marginBottom: 2,
  },
  menuSubtext: {
    fontSize: 12,
    fontFamily: fonts.regular,
    fontWeight: fontWeights.regular,
  },
  menuArrow: {
    fontSize: 18,
    color: '#666',
  },
  logoutItem: {
    marginTop: 20,
  },
  logoutText: {
    color: '#FF3B30',
  },
  logoutModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  logoutCenterContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutModalContent: {
    width: 300,
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoutIcon: {
    marginBottom: 16,
  },
  logoutMessage: {
    fontSize: 16,
    fontFamily: fonts.regular,
    fontWeight: fontWeights.regular,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  logoutButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  logoutButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelLogoutButton: {
    borderWidth: 1,
  },
  cancelLogoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmLogoutButton: {
    backgroundColor: '#FF3B30',
  },
  confirmLogoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  legalText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    fontSize: 14,
    marginHorizontal: 10,
  },
  socialLinks: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 15,
  },
  socialTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 15,
  },
  socialButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
})