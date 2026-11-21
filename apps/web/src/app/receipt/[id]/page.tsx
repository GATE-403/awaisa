import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getReceiptPage } from '@/shared/api/serverApi'
import { PageSkeleton } from '@/shared/ui/PageSkeleton/PageSkeleton'
import { ReceiptPage } from '@/views/receipt'

export const metadata: Metadata = {
  title: 'Кассовый чек',
  robots: { index: false },
}

// The signed receipt link is read on the server: the receipt arrives with the page.
const ReceiptWithData = async ({ id, signature }: { id: string; signature: string }) => {
  const receipt = signature ? await getReceiptPage(id, signature) : null

  return <ReceiptPage receipt={receipt} />
}

const ReceiptRoute = ({ params, searchParams }: PageProps<'/receipt/[id]'>) => (
  <Suspense fallback={<PageSkeleton />}>
    {Promise.all([params, searchParams]).then(([{ id }, query]) => (
      <ReceiptWithData id={id} signature={typeof query.s === 'string' ? query.s : ''} />
    ))}
  </Suspense>
)

export default ReceiptRoute
