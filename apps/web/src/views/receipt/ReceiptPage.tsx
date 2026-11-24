import { ButtonLink } from '@awaisa/ui/Button'
import { Trans, useLingui } from '@lingui/react/macro'
import type { FiscalReceipt } from '@/shared/api/types'
import { Container } from '@/shared/ui/Container/Container'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { ReceiptPaper } from '@/shared/ui/ReceiptPaper/ReceiptPaper'
import styles from './ReceiptPage.module.css'

interface ReceiptPageProps {
  receipt: FiscalReceipt | null
}

// The client's electronic receipt by its signed link: the paper itself on the page, and the tax
// office's own page of it when the provider gave one.
export const ReceiptPage = ({ receipt }: ReceiptPageProps) => {
  const { t } = useLingui()

  return (
    <main className={styles.page}>
      <Container size='sm' className={styles.content}>
        <h1 className={styles.title}>
          <Trans>Receipt</Trans>
        </h1>
        {receipt ? (
          <>
            <ReceiptPaper receipt={receipt} />
            {receipt.providerUrl && (
              <ButtonLink
                href={receipt.providerUrl}
                variant='secondary'
                size='sm'
                target='_blank'
                rel='noreferrer'
                className={styles.check}
              >
                <Trans>Check with the tax service</Trans>
              </ButtonLink>
            )}
          </>
        ) : (
          <EmptyState
            title={t`The receipt didn't open`}
            text={t`Check the link or ask the salon for it again.`}
          />
        )}
      </Container>
    </main>
  )
}
