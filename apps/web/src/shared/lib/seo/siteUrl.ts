const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://awaisa.kg').replace(/\/+$/, '')

const absoluteUrl = (path: string) => (/^https?:\/\//.test(path) ? path : `${SITE_URL}${path}`)

export { absoluteUrl, SITE_URL }
