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
| `room:create` | `{ language }` | `{ ok, roomCode, peers: [] }` |
| `room:join` | `{ roomCode, language }` | `{ ok, roomCode, peers: [{ uid, name, language }] }` |
| `signal` | `{ type: 'offer' \| 'answer' \| 'ice-candidate', data }` | `{ ok }` |
| `language:update` | `{ language }` | `{ ok }` |
| `room:leave` | — | `{ ok }` |

- `language` must be a supported code: `en`, `hi`, `te`, `ta`.
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

- Rooms live in memory and disappear when both people leave. Call records are
  saved separately through `POST /api/calls`.
- For calls between different networks (e.g. mobile data ↔ Wi-Fi) the apps will
  also need a TURN server; its details go in `TURN_SERVER_URL`, `TURN_USERNAME`
  and `TURN_PASSWORD` in `backend/.env`.
- Tests: `backend/tests/signaling.test.ts` and `backend/tests/roomManager.test.ts`
  (`npm test`).
