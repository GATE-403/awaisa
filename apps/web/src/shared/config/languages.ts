type Language = {
  code: 'ru' | 'ky' | 'en'
  label: string
}

const LANGUAGES: Language[] = [
  { code: 'ru', label: 'Русский' },
  { code: 'ky', label: 'Кыргызча' },
  { code: 'en', label: 'English' },
]

const DEFAULT_LANGUAGE: Language['code'] = 'ru'

export type { Language }
export { DEFAULT_LANGUAGE, LANGUAGES }
