const API_URL: string = import.meta.env.VITE_API_URL ?? ''

export const ApiErrorCode = { NetworkError: 'network_error', Unknown: 'unknown' } as const

export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST'
  body?: unknown
  token?: string
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.token) headers.Authorization = `Bearer ${options.token}`

  let response: Response
  try {
    response = await fetch(API_URL + path, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch {
    throw new ApiError(0, ApiErrorCode.NetworkError, 'Cannot reach the server.')
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new ApiError(
      response.status,
      payload?.error?.code ?? ApiErrorCode.Unknown,
      payload?.error?.message ?? 'Something went wrong.',
    )
  }
  return response.json() as Promise<T>
}
