'use client'

import { useEffect } from 'react'
import { LANGUAGES } from '@/shared/config/languages'
import { setLanguage, useLanguage, useT } from '@/shared/i18n'
import styles from './LanguageSwitcher.module.css'

export const LanguageSwitcher = () => {
  const t = useT()
  const language = useLanguage()

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  return (
    <nav aria-label={t('Язык')} className={styles.switcher}>
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
