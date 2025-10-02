import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme-context';
import { NotificationData, getNotifications, markAsRead } from '../lib/notifications';

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function NotificationsModal({ visible, onClose }: NotificationsModalProps) {
  const { colors } = useTheme();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const scaleAnim = useState(new Animated.Value(0))[0];
  const opacityAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 300,
          friction: 20,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const loadNotifications = async () => {
    setLoading(true);
    const data = await getNotifications();
    setNotifications(data);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: NotificationData) => {
    if (notification.status === 'unread') {
      await markAsRead(notification.id);
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, status: 'read' } : n)
      );
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const renderNotification = ({ item }: { item: NotificationData }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        { backgroundColor: colors.card },
        item.status === 'unread' && styles.unreadItem
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={[styles.notificationTitle, { color: colors.text }]}>
            {item.title}
          </Text>
          <Text style={[styles.notificationTime, { color: colors.textSecondary }]}>
            {formatTime(item.created_at)}
          </Text>
        </View>
        <Text style={[styles.notificationMessage, { color: colors.textSecondary }]}>
          {item.message}
        </Text>
        {item.status === 'unread' && <View style={styles.unreadDot} />}
      </View>
    </TouchableOpacity>
  );

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles.dropdownContainer,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        }
      ]}
    >
      <View style={[styles.notch, { backgroundColor: colors.background, borderColor: colors.border }]} />
      <View style={[styles.dropdownContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Notifications
          </Text>
        </View>

        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Loading...
                </Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="notifications-none" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No notifications yet
                </Text>
              </View>
            )
          }
          contentContainerStyle={notifications.length === 0 ? styles.emptyList : undefined}
          style={styles.flatList}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dropdownContainer: {
    position: 'absolute',
    top: 98,
    right: 36,
    width: 320,
    maxHeight: 400,
    zIndex: 1200,
  },
  notch: {
    position: 'absolute',
    top: -8,
    right: 12,
    width: 16,
    height: 16,
    transform: [{ rotate: '45deg' }],
    borderTopWidth: 1,
    borderLeftWidth: 1,
    zIndex: 1201,
  },
  dropdownContent: {
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  flatList: {
    maxHeight: 300,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },

  notificationItem: {
    padding: 12,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 8,
    position: 'relative',
  },
  unreadItem: {
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
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
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  notificationTime: {
    fontSize: 12,
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  unreadDot: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
});