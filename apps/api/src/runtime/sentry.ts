import {
  captureException,
  dedupeIntegration,
  init,
  isEnabled,
  linkedErrorsIntegration,
  onUncaughtExceptionIntegration,
  onUnhandledRejectionIntegration,
  withScope,
} from '@sentry/node'
import { scrubText, scrubUrl } from './error-scrub.js'

type ErrorSource = 'web' | 'api'

type ErrorEvent = { source: ErrorSource; message: string; stack?: string; url?: string }

/**
 * Error reports to Sentry (or GlitchTip — the same SDK) when SENTRY_DSN is set; nothing at all
 * otherwise. Only what the API already records in app_errors is sent, scrubbed: the browser gets
 * no SDK (its errors come through /telemetry/errors), and nothing traces requests or users.
 */
const initSentry = (role: string) => {
  const dsn = process.env.SENTRY_DSN?.trim()
  if (!dsn) return
  init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE || undefined,
    // Nothing about people or requests: no user, cookies, headers, bodies, query strings,
    // query data or local variables — only the scrubbed message and stack below.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      stackFrameVariables: false,
    },
    tracesSampleRate: 0,
    // No automatic instrumentation of HTTP, Express or Postgres: reports are sent by hand.
    defaultIntegrations: false,
    integrations: [
      onUncaughtExceptionIntegration(),
      onUnhandledRejectionIntegration(),
      linkedErrorsIntegration(),
      dedupeIntegration(),
    ],
    initialScope: { tags: { role } },
    beforeSend: (event) => {
      for (const exception of event.exception?.values ?? []) {
        if (exception.value) exception.value = scrubText(exception.value)
      }
      if (event.message) event.message = scrubText(event.message)
      return event
    },
  })
}

const captureError = ({ source, message, stack, url }: ErrorEvent) => {
  if (!isEnabled()) return
  const error = new Error(scrubText(message))
  error.name = source === 'web' ? 'WebError' : 'ApiError'
  // The stack recorded where it happened (a browser's for web errors), not this function's.
  if (stack) error.stack = `${error.name}: ${error.message}\n${scrubText(stack)}`
  withScope((scope) => {
    scope.setTag('source', source)
    if (url) scope.setTag('path', scrubUrl(url).slice(0, 200))
    // Grouped by what broke, so one bug is one issue however many times it happens.
    scope.setFingerprint([source, scrubText(message).replace(/[0-9a-f-]{8,}/gi, ':id')])
    captureException(error)
  })
}

export { captureError, initSentry }
