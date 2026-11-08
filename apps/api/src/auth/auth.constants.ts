const SESSION_COOKIE = 'awaisa_session'

const SESSION_TTL_DAYS = 30

const OTP = {
  ttlMinutes: 5,
  resendSeconds: 60,
  maxAttempts: 5,
  maxPerDay: 10,
}

export { OTP, SESSION_COOKIE, SESSION_TTL_DAYS }
