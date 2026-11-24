import { defineConfig } from '@lingui/cli'
import { formatter } from '@lingui/format-po'

// English is the source: the text in code is the message. `.po` catalogs per language live in
// src/locales and are compiled to TypeScript the app imports.
export default defineConfig({
  sourceLocale: 'en',
  locales: ['en', 'ru', 'ky'],
  fallbackLocales: { default: 'en' },
  catalogs: [
    {
      path: '<rootDir>/src/locales/{locale}/messages',
      include: ['<rootDir>/src'],
      exclude: ['**/node_modules/**', '**/tests/**', '**/*.test.ts'],
    },
  ],
  format: formatter({ lineNumbers: false }),
  compileNamespace: 'ts',
})
