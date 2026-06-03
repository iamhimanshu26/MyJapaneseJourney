import crypto from 'crypto'

const HASH_ITERATIONS = 16384
const KEY_LENGTH = 64
const DIGEST = 'sha512'

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const derived = crypto.pbkdf2Sync(password, salt, HASH_ITERATIONS, KEY_LENGTH, DIGEST).toString('hex')
  return `${salt}:${derived}`
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false
  const [salt, original] = storedHash.split(':')
  const derived = crypto.pbkdf2Sync(password, salt, HASH_ITERATIONS, KEY_LENGTH, DIGEST).toString('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(original, 'hex'), Buffer.from(derived, 'hex'))
  } catch {
    return false
  }
}

export function createSessionToken() {
  return crypto.randomBytes(32).toString('hex')
}

export function hashSessionToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex')
}
