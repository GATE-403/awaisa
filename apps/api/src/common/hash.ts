import { createHash } from 'node:crypto'

// Tokens are stored only as their sha256 in hex.
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

export { hashToken }
