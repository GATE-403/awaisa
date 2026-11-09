'use client'

import { useState } from 'react'
import { DEFAULT_LANGUAGE, LANGUAGES } from '@/shared/config/languages'
import styles from './LanguageSwitcher.module.css'

export const LanguageSwitcher = () => {
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE)

  return (
    <nav aria-label='Язык' className={styles.switcher}>
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          type='button'
          lang={code}
          aria-pressed={language === code}
          className={styles.option}
          onClick={() => setLanguage(code)}
        >
          {label}
        </button>
      ))}
    </nav>
  )
}
