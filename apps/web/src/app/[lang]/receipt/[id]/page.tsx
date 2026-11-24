import { msg } from '@lingui/core/macro'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getReceiptPage } from '@/shared/api/serverApi'
import { initLingui } from '@/shared/i18n/server'
import { PageSkeleton } from '@/shared/ui/PageSkeleton/PageSkeleton'
import { ReceiptPage } from '@/views/receipt'

export const generateMetadata = async (): Promise<Metadata> => {
  const i18n = await initLingui()

  return {
    title: i18n._(msg`Receipt`),
    robots: { index: false },
  }
}

// The signed receipt link is read on the server: the receipt arrives with the page.
const ReceiptWithData = async ({ id, signature }: { id: string; signature: string }) => {
  const receipt = signature ? await getReceiptPage(id, signature) : null

  return <ReceiptPage receipt={receipt} />
}

const ReceiptRoute = async ({ params, searchParams }: PageProps<'/[lang]/receipt/[id]'>) => {
  await initLingui()

  return (
    <Suspense fallback={<PageSkeleton />}>
      {Promise.all([params, searchParams]).then(([{ id }, query]) => (
        <ReceiptWithData id={id} signature={typeof query.s === 'string' ? query.s : ''} />
      ))}
    </Suspense>
  )
}

export default ReceiptRoute
