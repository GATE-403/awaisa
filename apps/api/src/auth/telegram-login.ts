// «Войти через Telegram»: the page makes a random token and opens the bot with
// `/start login_<token>`; the bot asks for the person's own number and ties it to the token;
// the page then trades the token for a session. Telegram allows 64 characters of
// `[A-Za-z0-9_-]` after /start, so the token is at most 58.
const LOGIN_PREFIX = 'login_'
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,58}$/
const LOGIN_TTL_MINUTES = 10

const isLoginToken = (token: string) => TOKEN_PATTERN.test(token)

/** The token from a bot's `/start` parameter, or null when it is not a sign-in. */
const readLoginStartParam = (param: string) => {
  if (!param.startsWith(LOGIN_PREFIX)) return null
  const token = param.slice(LOGIN_PREFIX.length)
  return isLoginToken(token) ? token : null
}

const loginStartParam = (token: string) => `${LOGIN_PREFIX}${token}`

export { isLoginToken, LOGIN_TTL_MINUTES, loginStartParam, readLoginStartParam }
