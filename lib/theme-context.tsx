import React, { createContext, useContext, useState, useEffect } from 'react'
import { Appearance } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface ThemeContextType {
  isDark: boolean
  toggleTheme: () => void
  colors: {
    background: string
    card: string
    text: string
    textSecondary: string
    primary: string
    accent: string
    border: string
    success: string
    error: string
  }
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    loadTheme()
    
    // Listen to system theme changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      const isDarkMode = colorScheme === 'dark'
      setIsDark(isDarkMode)
      AsyncStorage.setItem('theme', isDarkMode ? 'dark' : 'light')
    })

    return () => subscription?.remove()
  }, [])

  const loadTheme = async () => {
    try {
      const hasLaunchedBefore = await AsyncStorage.getItem('hasLaunchedBefore')
      
      if (!hasLaunchedBefore) {
        // First launch - always start with light theme
        setIsDark(false)
        await AsyncStorage.setItem('theme', 'light')
        await AsyncStorage.setItem('hasLaunchedBefore', 'true')
      } else {
        // Follow system theme for subsequent launches
        const systemTheme = Appearance.getColorScheme()
        const isDarkMode = systemTheme === 'dark'
        setIsDark(isDarkMode)
        await AsyncStorage.setItem('theme', isDarkMode ? 'dark' : 'light')
      }
    } catch (error) {
      console.error('Error loading theme:', error)
      setIsDark(false)
    }
  }

  const toggleTheme = async () => {
    const newTheme = !isDark
    setIsDark(newTheme)
    try {
      await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light')
    } catch (error) {
      console.error('Error saving theme:', error)
    }
  }

  const colors = {
    background: isDark ? '#1a1a1a' : '#ffffff',
    card: isDark ? '#2a2a2a' : '#f8f9fa',
    text: isDark ? '#ffffff' : '#1a1a1a',
    textSecondary: isDark ? '#999ca0' : '#999ca0',
    primary: '#0052CC',
    accent: '#FF6B00',
    border: isDark ? '#333333' : '#e8e8e8',
    success: '#00C851',
    error: '#ff4444',
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  )
}