import { ButtonLink } from '@awaisa/ui/Button'
import NextLink from 'next/link'
import { Container } from '@/shared/ui/Container/Container'
import { PageTitle } from '@/shared/ui/PageTitle/PageTitle'
import styles from './error.module.css'

const NotFound = () => (
  <main>
    <Container size='md' className={styles.page}>
      <PageTitle
        title='Not found.'
        subtitle='This page does not exist - the link may be out of date.'
      />
      <ButtonLink render={<NextLink href='/' />} size='lg'>
        To the catalogue
      </ButtonLink>
    </Container>
  </main>
)

export default NotFound
