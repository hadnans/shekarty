'use client'

import React from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  // Setup context providers (e.g., ThemeProvider, AuthProvider, TranslationProvider) here
  return (
    <>
      {children}
    </>
  )
}
