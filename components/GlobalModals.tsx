import React, { createContext, useContext, useState, ReactNode } from 'react'
import LogoutModal from './LogoutModal'

interface GlobalModalsContextType {
  showLogoutModal: (onConfirm: () => void) => void
}

const GlobalModalsContext = createContext<GlobalModalsContextType | undefined>(undefined)

interface GlobalModalsProviderProps {
  children: ReactNode
}

export function GlobalModalsProvider({ children }: GlobalModalsProviderProps) {
  const [logoutModalVisible, setLogoutModalVisible] = useState(false)
  const [logoutConfirmHandler, setLogoutConfirmHandler] = useState<(() => void) | null>(null)

  const showLogoutModal = (onConfirm: () => void) => {
    setLogoutConfirmHandler(() => onConfirm)
    setLogoutModalVisible(true)
  }

  const handleLogoutConfirm = () => {
    if (logoutConfirmHandler) {
      logoutConfirmHandler()
    }
    setLogoutModalVisible(false)
    setLogoutConfirmHandler(null)
  }

  return (
    <GlobalModalsContext.Provider value={{ showLogoutModal }}>
      {children}
      
      <LogoutModal
        visible={logoutModalVisible}
        onClose={() => setLogoutModalVisible(false)}
        onConfirm={handleLogoutConfirm}
      />
    </GlobalModalsContext.Provider>
  )
}

export function useGlobalModals() {
  const context = useContext(GlobalModalsContext)
  if (context === undefined) {
    throw new Error('useGlobalModals must be used within a GlobalModalsProvider')
  }
  return context
}