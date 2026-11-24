class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const FALLBACK_MESSAGE = 'Could not reach the server. Please try again.'

const toApiError = async (response: Response) => {
  const body: unknown = await response.json().catch(() => null)
  const message =
    body && typeof body === 'object' && 'message' in body ? body.message : FALLBACK_MESSAGE

  return new ApiError(
    response.status,
    Array.isArray(message) ? message.join('. ') : String(message),
  )
}

const getErrorMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : FALLBACK_MESSAGE

export { ApiError, getErrorMessage, toApiError }
