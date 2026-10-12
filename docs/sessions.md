# One signed-in device per account

A BoloAI account can be signed in on only one device at a time. Signing in on
a new device signs the previous device out, which ends any call it is on.

## How it works

1. Each app install creates a random **session id** once and keeps it on the device.
2. Right after a user signs in or registers, the app claims that id:
   `POST /api/sessions { sessionId, device }` with the Firebase ID token.
   The backend stores it in `user_sessions` (one row per account), replacing
   the previous device's id.
3. The backend immediately sends the previous device `session:revoked` over
   its socket and disconnects it. That device signs out of Firebase and shows
   "Your account was signed in on another device".
4. If the previous device was offline, it finds out when it reconnects:
   its socket is refused with `session_replaced`, and REST calls return
   `401 { error: 'session_replaced' }`.
5. Signing out calls `DELETE /api/sessions` (header `X-Session-Id`), which
   frees the account.

Reopening the app on the same device does **not** claim the session again. It
only checks it, so a device that was signed out elsewhere cannot take the
account back without the user signing in again.

## For app code

- Send `X-Session-Id: <sessionId>` on every `/api/users` and `/api/calls` request.
- Connect the socket with `auth: { token, sessionId }`.

| Error | Meaning | What the app does |
|---|---|---|
| `session_replaced` | Another device signed in since | Sign out and explain why |
| `session_inactive` | Nobody holds the account (after sign-out, or a database reset) | Claim again with `POST /api/sessions` |
| `session_required` | No session id was sent | Bug in the app |

Tests: `backend/tests/sessions.test.ts`.
