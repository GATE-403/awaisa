import type { Customer } from '@/shared/api/types'

/** Whether the person has a business side: a membership or platform admin rights. */
const hasCabinet = (customer: Customer) =>
  (customer.businesses?.length ?? 0) > 0 || customer.isAdmin

/** One business goes straight into its cabinet; several (or an admin) open the list. */
const getCabinetHref = (customer: Customer) => {
  const businesses = customer.businesses ?? []
  return businesses.length === 1 && !customer.isAdmin ? `/manage/${businesses[0]?.slug}` : '/manage'
}

export { getCabinetHref, hasCabinet }
