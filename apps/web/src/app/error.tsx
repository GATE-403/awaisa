'use client'

import { Button } from '@awaisa/ui/Button'
import { Container } from '@/shared/ui/Container/Container'
import { Mascot } from '@/shared/ui/Mascot/Mascot'
import styles from './error.module.css'

interface ErrorPageProps {
  retry: () => void
}

const ErrorPage = ({ retry }: ErrorPageProps) => (
  <main className={styles.page}>
    <Container size='md' className={styles.content}>
      <Mascot className={styles.mascot} />
      <h1 className={styles.title}>Что-то пошло не так</h1>
      <p className={styles.text}>
        Не получилось загрузить данные. Проверьте интернет и попробуйте ещё раз.
      </p>
      <Button size='lg' onClick={retry}>
        Повторить
      </Button>
    </Container>
  </main>
)

export default ErrorPage
