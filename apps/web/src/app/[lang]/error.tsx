'use client'

import { Button } from '@awaisa/ui/Button'
import { Trans } from '@lingui/react/macro'
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
        <h1 className={styles.title}>
          <Trans>Something went wrong</Trans>
        </h1>
        <p className={styles.text}>
          <Trans>We couldn't load the page. Try again in a minute - your bookings are safe.</Trans>
        </p>
        <Button size='lg' onClick={retry}>
          <Trans>Try again</Trans>
        </Button>
      </Container>
    </main>
  )
}

export default ErrorPage
