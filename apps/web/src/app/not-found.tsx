import { ButtonLink } from '@awaisa/ui/Button'
import NextLink from 'next/link'
import { Container } from '@/common/components/Container/Container'
import { PageTitle } from '@/common/components/PageTitle/PageTitle'
import styles from './error.module.css'

const NotFound = () => (
  <main>
    <Container size='md' className={styles.page}>
      <PageTitle title='Не нашли.' subtitle='Такой страницы нет — возможно, ссылка устарела.' />
      <ButtonLink render={<NextLink href='/' />} size='lg'>
        В каталог
      </ButtonLink>
    </Container>
  </main>
)

export default NotFound
