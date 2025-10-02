import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../lib/theme-context';

interface LoadingDotsProps {
  size?: number;
  color?: string;
}

export default function LoadingDots({ size = 8, color }: LoadingDotsProps) {
  const { colors } = useTheme();
  const dotColor = color || colors.primary;
  
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = () => {
      const animateDot = (dot: Animated.Value, delay: number) => {
        return Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
        ]);
      };

      Animated.loop(
        Animated.parallel([
          animateDot(dot1, 0),
          animateDot(dot2, 200),
          animateDot(dot3, 400),
        ])
      ).start();
    };

    animate();
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.dot,
          {
            width: size,
            height: size,
            backgroundColor: dotColor,
            opacity: dot1,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          {
            width: size,
            height: size,
            backgroundColor: dotColor,
            opacity: dot2,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          {
            width: size,
            height: size,
            backgroundColor: dotColor,
            opacity: dot3,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    borderRadius: 50,
    marginHorizontal: 3,
  },
});