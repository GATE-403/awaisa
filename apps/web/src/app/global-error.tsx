'use client'

import { Button } from '@awaisa/ui/Button'
import '@awaisa/tokens/tokens.css'
import '@awaisa/ui/styles.css'
import { useEffect } from 'react'
import { reportError } from '@/shared/lib/telemetry'
import { Mascot } from '@/shared/ui/Mascot/Mascot'
import styles from './error.module.css'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  retry: () => void
}

// Replaces the root layout when it fails itself (the header, the session…): its own document,
// no shell, the same quiet page as error.tsx, so a broken layout never shows a blank screen.
const GlobalError = ({ error, retry }: GlobalErrorProps) => {
  useEffect(() => {
    reportError(error)
  }, [error])

  return (
    <html lang='en'>
      <body className={styles.globalBody}>
        <title>Awaisa - couldn't load</title>
        <main className={styles.page}>
          <div className={styles.content}>
            <Mascot className={styles.mascot} />
            <h1 className={styles.title}>Something went wrong</h1>
            <p className={styles.text}>
              We couldn't load the page. Try again in a minute - your bookings are safe.
            </p>
            <Button size='lg' onClick={retry}>
              Try again
            </Button>
          </div>
        </main>
      </body>
    </html>
  )
}

export default GlobalError
