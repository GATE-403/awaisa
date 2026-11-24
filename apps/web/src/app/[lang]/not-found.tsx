import { ButtonLink } from '@awaisa/ui/Button'
import { msg } from '@lingui/core/macro'
import { Link as NextLink } from '@/shared/i18n/navigation'
import { initLingui } from '@/shared/i18n/server'
import { Container } from '@/shared/ui/Container/Container'
import { PageTitle } from '@/shared/ui/PageTitle/PageTitle'
import styles from './error.module.css'

const NotFound = async () => {
  const i18n = await initLingui()

  return (
    <main>
      <Container size='md' className={styles.page}>
        <PageTitle
          title={i18n._(msg`Not found.`)}
          subtitle={i18n._(msg`This page does not exist - the link may be out of date.`)}
        />
        <ButtonLink render={<NextLink href='/' />} size='lg'>
          {i18n._(msg`To the catalogue`)}
        </ButtonLink>
      </Container>
    </main>
  )
}

export default NotFound
