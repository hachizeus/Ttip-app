import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme-context';
import { NotificationData, getNotifications, markAsRead } from '../lib/notifications';
import ModalOverlay from './ModalOverlay';

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function NotificationsModal({ visible, onClose }: NotificationsModalProps) {
  const { colors } = useTheme();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (visible) {
      loadNotifications();
    }
  }, [visible]);

  const loadNotifications = async () => {
    const data = await getNotifications();
    setNotifications(data);
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

  return (
    <Modal visible={visible} transparent animationType="slide">
      <ModalOverlay visible={visible}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Notifications
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={notifications}
              renderItem={renderNotification}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="notifications-none" size={64} color={colors.textSecondary} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No notifications yet
                  </Text>
                </View>
              }
              contentContainerStyle={notifications.length === 0 ? styles.emptyList : undefined}
            />
          </View>
        </View>
      </ModalOverlay>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingTop: 100,
  },
  modalContent: {
    height: '85%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  notificationItem: {
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
});