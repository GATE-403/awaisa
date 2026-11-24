import { msg } from '@lingui/core/macro'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getPaymentPage } from '@/shared/api/serverApi'
import { initLingui } from '@/shared/i18n/server'
import { PageSkeleton } from '@/shared/ui/PageSkeleton/PageSkeleton'
import { PayPage } from '@/views/pay'

export const generateMetadata = async (): Promise<Metadata> => {
  const i18n = await initLingui()

  return {
    title: i18n._(msg`Payment`),
    robots: { index: false },
  }
}

// The signed checkout link is read on the server: amount and booking arrive with the page.
const PayWithPayment = async ({ id, signature }: { id: string; signature: string }) => {
  const payment = signature ? await getPaymentPage(id, signature) : null

  return <PayPage payment={payment} signature={signature} />
}

const PayRoute = async ({ params, searchParams }: PageProps<'/[lang]/pay/[id]'>) => {
  await initLingui()

  return (
    <Suspense fallback={<PageSkeleton />}>
      {Promise.all([params, searchParams]).then(([{ id }, query]) => (
        <PayWithPayment id={id} signature={typeof query.s === 'string' ? query.s : ''} />
      ))}
    </Suspense>
  )
}

export default PayRoute
