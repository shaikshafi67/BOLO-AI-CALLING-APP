import { auth } from './firebase';
import { serviceConfig } from './config';
import { deviceSession } from './deviceSession';

/** A failed request to the BoloAI backend. `code` is the server's error, or `unreachable`. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    /** The server's whole error reply (e.g. attemptsLeft). */
    readonly body: Record<string, unknown> = {},
  ) {
    super(`${status} ${code}`);
  }

  get notFound() {
    return this.status === 404;
  }
}

/**
 * Signed-in requests to the BoloAI REST API. Every request carries the
 * Firebase ID token and this browser's session id (docs/sessions.md).
 */
export async function api<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new ApiError(401, 'signed_out');

  let res: Response;
  try {
    res = await fetch(`${serviceConfig.apiBaseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${await user.getIdToken()}`,
        'X-Session-Id': deviceSession.sessionId,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ApiError(0, 'unreachable');
  }

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* not JSON */
  }
  if (res.ok) return data as T;
  const code = data && typeof data === 'object' && typeof (data as { error?: unknown }).error === 'string' ? (data as { error: string }).error : `http_${res.status}`;
  throw new ApiError(res.status, code, data && typeof data === 'object' ? (data as Record<string, unknown>) : {});
}
