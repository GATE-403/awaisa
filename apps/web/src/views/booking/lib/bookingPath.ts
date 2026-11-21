/** The booking's own address: `/<slug>/book` (a trailing slash allowed). */
const isBookingPath = (pathname: string, slug: string) =>
  pathname.replace(/\/$/, '') === `/${slug}/book`

export { isBookingPath }
