import { Suspense } from 'react'
import { getBusiness } from '@/shared/api/serverApi'
import { BusinessBar } from '@/widgets/BusinessBar'

const BusinessBarSlot = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { business } = await getBusiness((await params).slug)

  return <BusinessBar business={business} />
}

// Every page of a business (overview, services, booking) shares its local navigation bar.
const BusinessLayout = ({ children, params }: LayoutProps<'/[slug]'>) => (
  <>
    <Suspense fallback={null}>
      <BusinessBarSlot params={params} />
    </Suspense>
    {children}
  </>
)

export default BusinessLayout
