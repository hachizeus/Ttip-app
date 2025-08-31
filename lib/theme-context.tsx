import React, { createContext, useContext, useState, useEffect } from 'react'
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
    border: string
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
  }, [])

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme')
      if (savedTheme) {
        setIsDark(savedTheme === 'dark')
      }
    } catch (error) {
      console.error('Error loading theme:', error)
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
    background: isDark ? '#1a1a1a' : '#f5f5f5',
    card: isDark ? '#2a2a2a' : '#ffffff',
    text: isDark ? '#ffffff' : '#1a1a1a',
    textSecondary: isDark ? '#cccccc' : '#666666',
    primary: '#007AFF',
    border: isDark ? '#333333' : '#e0e0e0',
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  )
}