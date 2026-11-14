import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { API_URL } from '@/shared/config/api'
import { ApiError, getErrorMessage, toApiError } from './apiError'
import type {
  Booking,
  BusinessLink,
  BusinessPage,
  Customer,
  MasterPlace,
  PublicProfile,
  VisitReview,
} from './types'

const UNAUTHORIZED = 401

// Personal data rendered on the server: the request's cookies (the httpOnly session the API set
// through the /api rewrite) go to the API as they are. Never cached — it differs per visitor.
// Callers sit behind <Suspense>, so the rest of the page stays in the prerendered shell.
const withSession = async <Result>(path: string, headers?: Record<string, string>) => {
  const cookie = (await cookies()).toString()
  const response = await fetch(`${API_URL}${path}`, {
    headers: { ...(cookie ? { cookie } : {}), ...headers },
    cache: 'no-store',
  })
  if (!response.ok) throw await toApiError(response)

  return (await response.json()) as Result
}

// null for a guest (no or expired session); other failures are left to the client to retry.
const getSessionCustomer = async (): Promise<Customer | null> => {
  const hasSession = (await cookies()).has('awaisa_session')
  if (!hasSession) return null
  try {
    return await withSession<Customer>('/me')
  } catch (error) {
    if (error instanceof ApiError && error.status === UNAUTHORIZED) return null
    throw error
  }
}

// Guests go to the sign-in page before anything renders, then come back here.
const requireCustomer = async (next: string): Promise<Customer> => {
  const customer = await getSessionCustomer()
  if (!customer) redirect(`/login?${new URLSearchParams({ next })}`)

  return customer
}

// A failed read is not fatal on the server: the client island loads it again and shows errors.
const orNull = async <Result>(read: Promise<Result>) => read.catch(() => null)

// A public profile, read with the visitor's session so the owner also sees their hidden one
// (`isOwn`); null when there is no such profile or it is hidden from this visitor.
const getProfileOnServer = (id: string) =>
  orNull(withSession<PublicProfile>(`/profiles/${encodeURIComponent(id)}`))

const getMyBookingsOnServer = () => orNull(withSession<Booking[]>('/me/bookings'))

const getMyBusinessesOnServer = () => orNull(withSession<BusinessLink[]>('/me/businesses'))

const getManagedBusinessOnServer = (slug: string) =>
  orNull(withSession<BusinessPage>(`/manage/${encodeURIComponent(slug)}`))

const getMasterPlacesOnServer = () => orNull(withSession<MasterPlace[]>('/me/master'))

// The SMS link carries its own signature, so the visit renders without any session.
const getVisitReviewOnServer = async (id: string, signature: string | null) => {
  try {
    const data = await withSession<VisitReview>(
      `/bookings/${encodeURIComponent(id)}/review`,
      signature ? { 'x-review-signature': signature } : {},
    )
    return { data, error: null }
  } catch (error) {
    return { data: null, error: getErrorMessage(error) }
  }
}

export {
  getManagedBusinessOnServer,
  getMasterPlacesOnServer,
  getMyBookingsOnServer,
  getMyBusinessesOnServer,
  getProfileOnServer,
  getSessionCustomer,
  getVisitReviewOnServer,
  requireCustomer,
}
