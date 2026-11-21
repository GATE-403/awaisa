import { ButtonLink } from '@awaisa/ui/Button'
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
export const ReceiptPage = ({ receipt }: ReceiptPageProps) => (
  <main className={styles.page}>
    <Container size='sm' className={styles.content}>
      <h1 className={styles.title}>Кассовый чек</h1>
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
              Проверить в ГНС
            </ButtonLink>
          )}
        </>
      ) : (
        <EmptyState
          title='Чек не открылся'
          text='Проверьте ссылку или попросите её в салоне ещё раз.'
        />
      )}
    </Container>
  </main>
)
