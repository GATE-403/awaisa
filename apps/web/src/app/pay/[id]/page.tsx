import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getPaymentPage } from '@/shared/api/serverApi'
import { PageSkeleton } from '@/shared/ui/PageSkeleton/PageSkeleton'
import { PayPage } from '@/views/pay'

export const metadata: Metadata = {
  title: 'Payment',
  robots: { index: false },
}

// The signed checkout link is read on the server: amount and booking arrive with the page.
const PayWithPayment = async ({ id, signature }: { id: string; signature: string }) => {
  const payment = signature ? await getPaymentPage(id, signature) : null

  return <PayPage payment={payment} signature={signature} />
}

const PayRoute = ({ params, searchParams }: PageProps<'/pay/[id]'>) => (
  <Suspense fallback={<PageSkeleton />}>
    {Promise.all([params, searchParams]).then(([{ id }, query]) => (
      <PayWithPayment id={id} signature={typeof query.s === 'string' ? query.s : ''} />
    ))}
  </Suspense>
)

export default PayRoute
