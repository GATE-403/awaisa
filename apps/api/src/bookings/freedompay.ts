import { createHash, randomBytes } from 'node:crypto'

// Freedom Pay (Kyrgyzstan) Merchant API: https://freedompay.kg/docs-en/merchant-api/pay
// Every message is signed: md5 of «script name; values sorted by key; secret key», joined by «;».

type Params = Record<string, string>

const signFreedomPay = (script: string, params: Params, secret: string) => {
  const values = Object.keys(params)
    .filter((key) => key !== 'pg_sig')
    .sort()
    .map((key) => params[key] ?? '')

  return createHash('md5')
    .update([script, ...values, secret].join(';'))
    .digest('hex')
}

const isFreedomPaySignature = (script: string, params: Params, secret: string) =>
  typeof params.pg_sig === 'string' && params.pg_sig === signFreedomPay(script, params, secret)

const salt = () => randomBytes(12).toString('hex')

// Responses come as flat XML: <response><pg_status>ok</pg_status>…</response>.
const parseFreedomPayXml = (xml: string): Params => {
  const fields: Params = {}
  for (const match of xml.matchAll(/<(pg_[a-z0-9_]+)>([^<]*)<\/\1>/g)) {
    const [, key, value] = match
    if (key) fields[key] = (value ?? '').trim()
  }
  return fields
}

const escapeXml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** The signed XML answer Freedom Pay expects from our result URL. */
const freedomPayReply = (
  script: string,
  status: 'ok' | 'error',
  description: string,
  secret: string,
) => {
  const params: Params = { pg_description: description, pg_salt: salt(), pg_status: status }
  const sig = signFreedomPay(script, params, secret)
  const body = Object.entries({ ...params, pg_sig: sig })
    .map(([key, value]) => `<${key}>${escapeXml(value)}</${key}>`)
    .join('')

  return `<?xml version="1.0" encoding="utf-8"?><response>${body}</response>`
}

export type { Params as FreedomPayParams }
export { freedomPayReply, isFreedomPaySignature, parseFreedomPayXml, salt, signFreedomPay }
