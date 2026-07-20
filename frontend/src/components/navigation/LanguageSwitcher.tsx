'use client'

import React from 'react'
import { Button } from '../ui/button'

export function LanguageSwitcher() {
  const [lang, setLang] = React.useState<'en' | 'ar'>('en')

  const toggleLang = () => {
    const nextLang = lang === 'en' ? 'ar' : 'en'
    setLang(nextLang)
    if (typeof window !== 'undefined') {
      document.documentElement.dir = nextLang === 'ar' ? 'rtl' : 'ltr'
      document.documentElement.lang = nextLang
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={toggleLang} className="min-w-[48px] font-bold">
      {lang === 'en' ? 'عربي' : 'EN'}
    </Button>
  )
}
