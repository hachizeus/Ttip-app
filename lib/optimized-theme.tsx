import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { useColorScheme } from 'react-native';

interface ThemeColors {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  primary: string;
  accent: string;
  error?: string;
}

interface ThemeContextType {
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Memoized theme colors to prevent unnecessary re-renders
const lightTheme: ThemeColors = {
  background: '#ffffff',
  card: '#f8f9fa',
  text: '#000000',
  textSecondary: '#666666',
  border: '#e0e0e0',
  primary: '#007AFF',
  accent: '#FF6B00',
  error: '#ff4444'
};

const darkTheme: ThemeColors = {
  background: '#000000',
  card: '#1a1a1a',
  text: '#ffffff',
  textSecondary: '#999999',
  border: '#333333',
  primary: '#007AFF',
  accent: '#FF6B00',
  error: '#ff4444'
};

export const OptimizedThemeProvider: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Memoize theme colors to prevent re-creation on every render
  const colors = useMemo(() => isDark ? darkTheme : lightTheme, [isDark]);

  // Memoize toggle function
  const toggleTheme = useCallback(() => {
    // Theme toggle logic if needed
  }, []);

  // Memoize context value
  const contextValue = useMemo(() => ({
    colors,
    isDark,
    toggleTheme
  }), [colors, isDark, toggleTheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
});

export const useOptimizedTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useOptimizedTheme must be used within OptimizedThemeProvider');
  }
  return context;
};