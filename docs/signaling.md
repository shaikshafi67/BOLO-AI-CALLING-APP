# BoloAI signaling server

The signaling server lets two BoloAI apps find each other and set up a WebRTC call.
It runs inside the backend (`backend/src/websocket/`) on the same port as the REST API,
using Socket.IO.

It only **introduces** the two peers. After the WebRTC handshake, video and the original
audio flow directly between the phones and never pass through this server. The AI
translation pipeline (Phase 6) will run alongside it.

## Connecting

Every connection must carry a Firebase ID token, which is checked with Firebase Admin
(the same check as the REST API):

```dart
final token = await FirebaseAuth.instance.currentUser!.getIdToken();
final socket = IO.io('http://<backend>:4000', IO.OptionBuilder()
    .setTransports(['websocket'])
    .setAuth({'token': token})
    .build());
```

Missing or invalid tokens are refused with the error `unauthorized`.

## Events the app sends

All of these take an acknowledgement callback that receives `{ ok: true, ... }` or
`{ ok: false, error }`.

| Event | Payload | Success reply |
|---|---|---|
| `room:create` | `{ language }` | `{ ok, roomCode, peers: [], iceServers }` |
| `room:join` | `{ roomCode, language }` | `{ ok, roomCode, peers: [{ uid, name, language }], iceServers }` |
| `signal` | `{ type: 'offer' \| 'answer' \| 'ice-candidate', data }` | `{ ok }` |
| `language:update` | `{ language }` | `{ ok }` |
| `call:invite` | `{ userId }` (a users.id) | `{ ok }` — errors `offline`, `busy`, `not_found`, `self`, `already_ringing` |
| `call:decline` | `{ roomCode }` | `{ ok }` |
| `message` | `{ kind: 'chat', text }` or `{ kind: 'state', state: { mic, camera, sharing } }` | `{ ok }` |
| `room:leave` | — | `{ ok }` |

- `language` must be a supported code: `en`, `hi`, `te`, `ta`.
- `iceServers` is the STUN/TURN list to pass to `createPeerConnection` (public STUN, plus
  the TURN server from `backend/.env` when set), so TURN credentials never ship in the app.
- `roomCode` uses the format `BOLO-1234` (lower case is accepted).
- `data` for `signal` is whatever flutter_webrtc produces: the SDP description for
  offers/answers, the candidate map for ICE candidates.

Possible errors: `invalid_language`, `invalid_room_code`, `not_found`, `full`
(calls are 1:1, so at most two people per room), `already_in_room`, `not_in_room`,
`invalid_signal`.

## Events the app receives

| Event | Payload | When |
|---|---|---|
| `peer:joined` | `{ uid, name, language }` | The other person joined your room |
| `signal` | `{ from, type, data }` | The other person sent an offer, answer or ICE candidate |
| `peer:language` | `{ uid, language }` | The other person changed language |
| `peer:left` | `{ uid }` | The other person left or disconnected |
| `call:incoming` | `{ roomCode, from: { uid, name }, language }` | Someone is ringing you (sent to all your devices) |
| `call:cancelled` | `{ roomCode }` | The caller hung up or nobody answered: stop ringing |
| `call:declined` | `{ uid, name }` | (caller) They declined |
| `call:unanswered` | `{ uid }` | (caller) No answer within 45 seconds |
| `message` | chat or state, plus `{ from, name, at }` | In-call chat / the other person's mic, camera, screen-share state |

## Typical call flow

1. Caller: `room:create { language: 'hi' }` → gets `BOLO-4829` and shares it.
2. Receiver: `room:join { roomCode: 'BOLO-4829', language: 'en' }`.
   The caller receives `peer:joined`.
3. Caller creates an `RTCPeerConnection`, sends `signal { type: 'offer' }`.
4. Receiver answers with `signal { type: 'answer' }`.
5. Both sides send `signal { type: 'ice-candidate' }` as candidates are found.
6. The WebRTC connection opens and video/audio flow peer-to-peer.
7. Either side: `room:leave` (or closes the app) → the other receives `peer:left`.

## Notes

- Rooms live in memory and disappear when both people leave.
- Call history: when the second person joins a room, the server records a call
  (room code, both people, the language each speaks) and marks it ended when
  someone leaves. If the same two people reconnect to the room, the same call
  continues. Both people need a profile (`POST /api/users`, which the app creates
  on sign-in); otherwise the call is not recorded. History is read with `GET /api/calls`.
- For calls between different networks (e.g. mobile data ↔ Wi-Fi) the apps also
  need a TURN server; its details go in `TURN_SERVER_URL` (comma-separate several
  URLs), `TURN_USERNAME` and `TURN_PASSWORD` in `backend/.env`. Without one, calls
  work on the same network and behind most home routers, but not across strict NATs.
- Tests: `backend/tests/signaling.test.ts`, `backend/tests/roomManager.test.ts` and
  `backend/tests/iceServers.test.ts` (`npm test`).

## The Flutter client

`frontend/lib/services/call_service.dart` implements this flow:

- `CallService.start` / `CallService.join` open the camera and mic, connect a socket
  for the call (Firebase token + device session id) and create or join the room.
- Whoever is already in the room sends the offer when `peer:joined` arrives, so both
  sides never offer at once. If the other person leaves and someone rejoins, the
  same rule starts a fresh negotiation.
- ICE candidates that arrive before the remote description are queued.
- A failed ICE connection triggers an ICE restart from the offerer. If the signaling
  socket drops, the app rejoins the room on reconnect.

To try it, run the backend and open the app on two devices (or two browser profiles,
since one account can be signed in on only one device): one taps **Start Call**, the
other enters the room code under **Join Call**. Browsers only allow the camera on
`https://` or `localhost`, so a phone's browser cannot use the dev server over the LAN;
use the Android app with `--dart-define=BOLOAI_API_URL=http://<PC IP>:4000` instead.

## Live translation

The app asks `translation:start` (reply `{ ok, available }`; `available` is false until the
Google Cloud key is configured). While the call is connected, the mic is on and translation
isn't paused, the browser streams its microphone as binary `audio` chunks: 16 kHz, mono,
16-bit PCM, about 100 ms each. `translation:stop` closes the speaker's recognition stream
(sent when muting or pausing). Nothing is sent to Google while someone is alone in the room.

The server (`backend/src/translation/`) runs Google Speech-to-Text streaming in the speaker's
language, translates each finished sentence into the listener's language, and synthesises it:

| Event | Payload | To |
|---|---|---|
| `caption` | `{ id, speakerUid, speakerName, sourceLanguage, targetLanguage, original, translated, final, latencyMs? }` | Both people. Interim captions have `translated: null`, `final: false` |
| `translation:audio` | `{ id, audio (MP3 bytes), mime }` | The listener only |
| `translation:status` | `{ available: false, reason }` | A service failed; the call continues without translation |

Finished sentences are stored as text in the `translations` table (never audio). Check the
Google setup with `npm run check:translation` in `backend/`.
