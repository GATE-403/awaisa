import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

// A business's password at its cash register provider is kept encrypted (AES-256-GCM) with a key
// derived from AUTH_SECRET, so a database dump alone does not hand it out.

const VERSION = 'v1'

const keyFrom = (secret: string) => createHash('sha256').update(`fiscal:${secret}`).digest()

const seal = (plain: string, secret: string) => {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', keyFrom(secret), iv)
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return [VERSION, iv, cipher.getAuthTag(), data]
    .map((part) => (typeof part === 'string' ? part : part.toString('base64url')))
    .join('.')
}

/** null when the box was sealed with another secret or was tampered with. */
const open = (sealed: string, secret: string) => {
  const [version, iv, tag, data] = sealed.split('.')
  if (version !== VERSION || !iv || !tag || data === undefined) return null
  try {
    const decipher = createDecipheriv('aes-256-gcm', keyFrom(secret), Buffer.from(iv, 'base64url'))
    decipher.setAuthTag(Buffer.from(tag, 'base64url'))
    return Buffer.concat([
      decipher.update(Buffer.from(data, 'base64url')),
      decipher.final(),
    ]).toString('utf8')
  } catch {
    return null
  }
}

export { open, seal }
