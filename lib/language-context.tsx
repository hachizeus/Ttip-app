import React, { createContext, useContext } from 'react'

const LanguageContext = createContext({ language: 'en' })

export const useLanguage = () => useContext(LanguageContext)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  return (
    <LanguageContext.Provider value={{ language: 'en' }}>
      {children}
    </LanguageContext.Provider>
  )
}