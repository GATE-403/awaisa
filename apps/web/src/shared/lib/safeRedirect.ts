const DEFAULT_PATH = '/bookings'

// Only same-site paths: "//evil.com" and absolute URLs would turn the login page into an open redirect.
export const getSafeRedirect = (value: string | null) =>
  value?.startsWith('/') && !value.startsWith('//') ? value : DEFAULT_PATH
