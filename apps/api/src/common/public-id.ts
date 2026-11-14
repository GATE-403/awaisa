import { createHash } from 'node:crypto'

// A person's public id (reviews, `/u/<id>`): the first 20 hex of sha256(secret + ':reviewer:' +
// phone). Stable per phone, the same in SQL (`publicIdSql`), and it never gives the phone away.
const saltOf = (secret: string) => `${secret}:reviewer:`

const publicIdOf = (phone: string, secret: string) =>
  createHash('sha256')
    .update(saltOf(secret) + phone)
    .digest('hex')
    .slice(0, 20)

/** The same id in SQL for a phone column; the salt goes in as a parameter. */
const publicIdSql = (phoneColumn: string, saltParam: string) =>
  `left(encode(sha256(convert_to(${saltParam} || ${phoneColumn}, 'UTF8')), 'hex'), 20)`

const PUBLIC_ID_PATTERN = /^[0-9a-f]{20}$/

export { PUBLIC_ID_PATTERN, publicIdOf, publicIdSql, saltOf }
