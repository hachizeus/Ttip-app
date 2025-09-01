import React, { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Switch, Modal, Image } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { getCurrentUser, logout } from '../../lib/auth'
import { formatPhoneForDisplay } from '../../lib/phone-utils'
import { getSubscriptionStatus } from '../../lib/subscription-utils'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../lib/theme-context'
import ModalOverlay from '../../components/ModalOverlay'
import { supabase } from '../../lib/supabase'

export default function ProfileScreen() {
  const { isDark, toggleTheme, colors } = useTheme()
  const [userPhone, setUserPhone] = useState('')
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)

  useEffect(() => {
    loadUserData()
  }, [])

  useFocusEffect(
    React.useCallback(() => {
      loadUserData()
    }, [])
  )

  const loadUserData = async () => {
    const phone = await getCurrentUser()
    if (phone) {
      setUserPhone(formatPhoneForDisplay(phone))
      
      // Load subscription status
      const status = await getSubscriptionStatus(phone)
      setSubscriptionStatus(status)
      
      // Load user profile data
      try {
        const { data: worker, error } = await supabase
          .from('workers')
          .select('name, occupation, bio, profile_image_url')
          .eq('phone', phone)
          .single()
        
        if (!error && worker) {
          setUserProfile(worker)
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
    router.replace('/welcome')
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Fixed Profile Section */}
      <View style={[styles.fixedProfileSection, { backgroundColor: colors.background }]}>
        <View style={styles.profileHeader}>
          {userProfile?.profile_image_url ? (
            <Image source={{ uri: userProfile.profile_image_url }} style={styles.profileImage} />
          ) : (
            <View style={[styles.avatarContainer, { backgroundColor: colors.primary }]}>
              <MaterialIcons name="person" size={30} color="#fff" />
            </View>
          )}
          <View style={styles.profileInfo}>
            {userProfile?.name && (
              <Text style={[styles.name, { color: colors.text }]}>{userProfile.name}</Text>
            )}
            {userProfile?.occupation && (
              <Text style={[styles.occupation, { color: colors.textSecondary }]}>{userProfile.occupation}</Text>
            )}
          </View>
        </View>
        
        <Text style={[styles.bio, { color: colors.text }]}>
          {userProfile?.bio || 'No bio available. Update your profile in settings.'}
        </Text>
        
        {subscriptionStatus && (
          <View style={[
            styles.planBadge,
            { backgroundColor: subscriptionStatus.isLimitedMode ? '#FF6B6B' : '#00C851' }
          ]}>
            <Text style={styles.planBadgeText}>
              {subscriptionStatus.plan === 'trial' ? 'Free Trial' :
               subscriptionStatus.plan === 'free' ? 'Limited Mode' :
               subscriptionStatus.plan.charAt(0).toUpperCase() + subscriptionStatus.plan.slice(1)}
            </Text>
          </View>
        )}
      </View>

      {/* Scrollable Menu */}
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
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
            <MaterialIcons name="settings" size={20} color="#fff" />
          </View>
          <View style={styles.menuContent}>
            <Text style={[styles.menuText, { color: colors.text }]}>Settings</Text>
            <Text style={[styles.menuSubtext, { color: colors.textSecondary }]}>Edit profile & preferences</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: colors.background }]}
          onPress={() => router.push('/leaderboard')}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: colors.primary }]}>
            <MaterialIcons name="leaderboard" size={20} color="#fff" />
          </View>
          <View style={styles.menuContent}>
            <Text style={[styles.menuText, { color: colors.text }]}>View Leaderboard</Text>
            <Text style={[styles.menuSubtext, { color: colors.textSecondary }]}>See top earners</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuItem, styles.logoutItem, { backgroundColor: colors.background }]}
          onPress={handleLogout}
        >
          <MaterialIcons name="logout" size={24} color="#FF3B30" style={styles.menuIcon} />
          <Text style={[styles.menuText, styles.logoutText]}>Logout</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Custom Logout Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <ModalOverlay visible={showLogoutModal}>
          <View style={styles.logoutModalContainer}>
            <View style={[styles.logoutModalContent, { backgroundColor: colors.background }]}>
              <View style={[styles.logoutModalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.logoutModalTitle, { color: colors.text }]}>Logout</Text>
                <TouchableOpacity onPress={() => setShowLogoutModal(false)} style={styles.logoutCloseButton}>
                  <MaterialIcons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.logoutModalBody}>
                <MaterialIcons name="logout" size={48} color="#FF3B30" style={styles.logoutIcon} />
                <Text style={[styles.logoutMessage, { color: colors.textSecondary }]}>
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
            </View>
          </View>
        </ModalOverlay>
      </Modal>
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
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
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
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  occupation: {
    fontSize: 14,
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
  planBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  planBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bio: {
    fontSize: 14,
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
    fontWeight: '500',
    marginBottom: 2,
  },
  menuSubtext: {
    fontSize: 12,
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
    paddingHorizontal: 20,
  },
  logoutModalContent: {
    width: '100%',
    maxWidth: 300,
    borderRadius: 16,
    overflow: 'hidden',
  },
  logoutModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  logoutModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  logoutCloseButton: {
    padding: 4,
  },
  logoutModalBody: {
    padding: 20,
    alignItems: 'center',
  },
  logoutIcon: {
    marginBottom: 16,
  },
  logoutMessage: {
    fontSize: 16,
    textAlign: 'center',
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
})