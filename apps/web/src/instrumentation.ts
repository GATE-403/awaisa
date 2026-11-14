import type { Instrumentation } from 'next'
import { API_URL } from '@/shared/config/api'

const MESSAGE_MAX = 500
const STACK_MAX = 4000

// Errors while rendering on the server never reach the browser's ErrorReporter: send them to
// the API's telemetry like browser errors, so they land in app_errors, Sentry and the alerts.
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const value = error instanceof Error ? error : new Error(String(error))
  const userAgent = request.headers['user-agent']
  try {
    await fetch(`${API_URL}/telemetry/errors`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(typeof userAgent === 'string' ? { 'user-agent': userAgent } : {}),
      },
      body: JSON.stringify({
        message: `SSR ${context.routePath}: ${value.message}`.slice(0, MESSAGE_MAX),
        stack: (value.stack ?? '').slice(0, STACK_MAX),
        // The path only: query strings carry phones, tokens and signatures.
        url: (request.path.split('?')[0] ?? '').slice(0, MESSAGE_MAX),
      }),
      signal: AbortSignal.timeout(3000),
    })
  } catch {
    // The API being down is what the uptime check reports; nothing more to do here.
  }
}
