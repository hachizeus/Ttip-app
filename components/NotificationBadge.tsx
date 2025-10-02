import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface NotificationBadgeProps {
  count: number;
  size?: number;
  backgroundColor?: string;
  textColor?: string;
  maxCount?: number;
}

export default function NotificationBadge({ 
  count, 
  size = 18, 
  backgroundColor = '#FF3B30', 
  textColor = '#FFFFFF',
  maxCount = 99 
}: NotificationBadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();
  const badgeSize = size;
  const fontSize = size * 0.6;

  return (
    <View style={[
      styles.badge, 
      { 
        width: badgeSize, 
        height: badgeSize, 
        borderRadius: badgeSize / 2,
        backgroundColor,
        minWidth: badgeSize,
      }
    ]}>
      <Text style={[
        styles.badgeText, 
        { 
          color: textColor, 
          fontSize: fontSize,
          lineHeight: fontSize + 2,
        }
      ]}>
        {displayCount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  badgeText: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
});