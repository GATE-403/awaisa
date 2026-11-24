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
        <h1 className={styles.title}>Что-то пошло не так</h1>
        <p className={styles.text}>
          Не получилось загрузить страницу. Попробуйте ещё раз через минуту - ваши записи никуда не
          делись.
        </p>
        <Button size='lg' onClick={retry}>
          Повторить
        </Button>
      </Container>
    </main>
  )
}

export default ErrorPage
