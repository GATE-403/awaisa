'use client'

import { Button } from '@awaisa/ui/Button'
import { useEffect } from 'react'
import { reportError } from '@/shared/lib/telemetry'
import { Container } from '@/shared/ui/Container/Container'
import { LiveMascot } from '@/shared/ui/Mascot/LiveMascot'
import styles from './error.module.css'

interface ErrorPageProps {
  error: Error & { digest?: string }
  retry: () => void
}

const ErrorPage = ({ error, retry }: ErrorPageProps) => {
  useEffect(() => {
    reportError(error)
  }, [error])

  return (
    <main className={styles.page}>
      <Container size='md' className={styles.content}>
        <LiveMascot className={styles.mascot} />
        <h1 className={styles.title}>Something went wrong</h1>
        <p className={styles.text}>
          We couldn't load the page. Try again in a minute - your bookings are safe.
        </p>
        <Button size='lg' onClick={retry}>
          Try again
        </Button>
      </Container>
    </main>
  )
}

export default ErrorPage
