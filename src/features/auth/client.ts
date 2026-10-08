export interface User {
  id: string
  email: string
  username: string
  avatar: string | null
  created_at: string
  last_login_at: string | null
  status: 'active' | 'disabled'
  role: 'user' | 'admin'
}

export class AccountError extends Error {
  status: number
  constructor(code: string, status: number) { super(code); this.status = status }
}

export async function accountRequest<T>(path: string, data?: unknown, userId?: string, signal?: AbortSignal): Promise<T> {
  let response: Response
  const body = data === undefined ? undefined : JSON.stringify(data)
  try {
    response = await fetch(path, {
      method: data === undefined ? 'GET' : 'POST',
      credentials: 'same-origin',
      headers: data === undefined ? {} : { 'Content-Type': 'application/json', ...(userId ? { 'X-Arcana-User': userId } : {}) },
      body,
      signal: AbortSignal.any([AbortSignal.timeout(20000), ...(signal ? [signal] : [])]),
      keepalive: body !== undefined && new TextEncoder().encode(body).byteLength < 50000,
    })
  } catch { throw new AccountError('network-error', 0) }
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new AccountError(payload?.error?.code ?? 'service-unavailable', response.status)
  if (!payload) throw new AccountError('service-unavailable', 503)
  return payload as T
}
