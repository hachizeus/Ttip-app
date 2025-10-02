import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  Alert 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../lib/theme-context';
import { useNotifications } from '../hooks/useNotifications';
import { fonts, fontWeights } from '../lib/fonts';
import LoadingScreen from '../components/LoadingScreen';

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { 
    notifications, 
    unreadCount, 
    loading, 
    refreshNotifications, 
    markNotificationAsRead, 
    markAllAsRead 
  } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    refreshNotifications();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: any) => {
    if (notification.status === 'unread') {
      await markNotificationAsRead(notification.id);
    }
    
    // Handle navigation based on notification data
    if (notification.data) {
      try {
        const data = typeof notification.data === 'string' 
          ? JSON.parse(notification.data) 
          : notification.data;
        
        if (data.type === 'tip_received' && data.worker_id) {
          router.push(`/worker/${data.worker_id}`);
        } else if (data.type === 'subscription_update') {
          router.push('/subscription');
        }
      } catch (error) {
        console.error('Error parsing notification data:', error);
      }
    }
  };

  const handleMarkAllAsRead = () => {
    if (unreadCount === 0) return;
    
    Alert.alert(
      'Mark All as Read',
      `Mark all ${unreadCount} notifications as read?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark All', onPress: markAllAsRead }
      ]
    );
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  if (loading && notifications.length === 0) {
    return <LoadingScreen />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
        <TouchableOpacity 
          onPress={handleMarkAllAsRead} 
          style={styles.markAllButton}
          disabled={unreadCount === 0}
        >
          <Text style={[
            styles.markAllText, 
            { color: unreadCount > 0 ? colors.primary : colors.textSecondary }
          ]}>
            Mark All
          </Text>
        </TouchableOpacity>
      </View>

      {/* Unread Count */}
      {unreadCount > 0 && (
        <View style={[styles.unreadBanner, { backgroundColor: colors.primary + '10' }]}>
          <MaterialIcons name="notifications" size={20} color={colors.primary} />
          <Text style={[styles.unreadText, { color: colors.primary }]}>
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Notifications List */}
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="notifications-none" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Notifications</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              You'll see notifications here when you receive tips or updates
            </Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationItem,
                { 
                  backgroundColor: notification.status === 'unread' 
                    ? colors.primary + '05' 
                    : colors.background,
                  borderBottomColor: colors.border
                }
              ]}
              onPress={() => handleNotificationPress(notification)}
            >
              <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                  <Text style={[
                    styles.notificationTitle, 
                    { 
                      color: colors.text,
                      fontWeight: notification.status === 'unread' ? 'bold' : 'normal'
                    }
                  ]}>
                    {notification.title}
                  </Text>
                  <Text style={[styles.notificationTime, { color: colors.textSecondary }]}>
                    {formatTime(notification.created_at)}
                  </Text>
                </View>
                <Text style={[styles.notificationMessage, { color: colors.textSecondary }]}>
                  {notification.message}
                </Text>
                {notification.status === 'unread' && (
                  <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
        
        {/* Bottom padding for navigation */}
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
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
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fonts.bold,
    fontWeight: fontWeights.bold,
  },
  markAllButton: {
    padding: 4,
  },
  markAllText: {
    fontSize: 16,
    fontFamily: fonts.medium,
    fontWeight: fontWeights.medium,
  },
  unreadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  unreadText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    fontWeight: fontWeights.medium,
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: fonts.bold,
    fontWeight: fontWeights.bold,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: fonts.regular,
    fontWeight: fontWeights.regular,
    textAlign: 'center',
    lineHeight: 22,
  },
  notificationItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    position: 'relative',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontFamily: fonts.medium,
    fontWeight: fontWeights.medium,
    flex: 1,
    marginRight: 8,
  },
  notificationTime: {
    fontSize: 12,
    fontFamily: fonts.regular,
    fontWeight: fontWeights.regular,
  },
  notificationMessage: {
    fontSize: 14,
    fontFamily: fonts.regular,
    fontWeight: fontWeights.regular,
    lineHeight: 20,
    marginTop: 4,
  },
  unreadDot: {
    position: 'absolute',
    right: 20,
    top: '50%',
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: -4,
  },
});