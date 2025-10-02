import React, { createContext, useContext, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import LoadingDots from './LoadingDots';
import { useTheme } from '../lib/theme-context';

interface LoadingContextType {
  showLoading: () => void;
  hideLoading: () => void;
  isLoading: boolean;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return context;
};

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const theme = useTheme();
  const colors = theme?.colors || { background: '#ffffff' };

  const showLoading = () => setIsLoading(true);
  const hideLoading = () => setIsLoading(false);

  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading, isLoading }}>
      {children}
      {isLoading && (
        <View style={[styles.overlay, { backgroundColor: colors.background }]}>
          <LoadingDots size={12} />
        </View>
      )}
    </LoadingContext.Provider>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
});